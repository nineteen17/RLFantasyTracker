import cron from "node-cron";
import logger from "@src/logic/shared/utils/logger";
import { fetchUpstream } from "./upstream/client";
import type { UpstreamRound, UpstreamMatch } from "./upstream/types";
import { runFullSync, runLightSync } from "./syncService";
import { runOfficialHistoryIncrementalSync } from "./history/official-history.incremental";
import { syncTeamListsForRound } from "./syncers/team-lists.syncer";
import { deriveSeason } from "./utils/mappers";

const POLL_INTERVAL_ACTIVE = 5 * 60 * 1000; // 5 minutes during active round
const POLL_INTERVAL_IDLE = 30 * 60 * 1000; // 30 minutes when no active round
const UPCOMING_MATCH_POLL_WINDOW_MINUTES = Number.parseInt(
	process.env.TEAM_LIST_SYNC_LOOKAHEAD_MINUTES ?? "120",
	10,
);
const TEAM_LIST_WINDOW_TOLERANCE_MINUTES = Number.parseInt(
	process.env.TEAM_LIST_SYNC_WINDOW_TOLERANCE_MINUTES ?? "4",
	10,
);
const TEAM_LIST_WINDOW_MEMORY_MS = 24 * 60 * 60 * 1000;
const TEAM_LIST_REFRESH_WINDOWS_MINUTES = [90, 60, 30, 10, -5] as const;

const ENABLE_HISTORY_SYNC =
	process.env.ENABLE_HISTORY_SYNC === undefined
		? true
		: process.env.ENABLE_HISTORY_SYNC === "true";
const HISTORY_SYNC_LOOKBACK_ROUNDS = Number.parseInt(
	process.env.HISTORY_SYNC_LOOKBACK_ROUNDS ?? "3",
	10,
);

const TEAM_LIST_BASELINE_SYNC_ENABLED =
	process.env.TEAM_LIST_BASELINE_SYNC_ENABLED === undefined
		? true
		: process.env.TEAM_LIST_BASELINE_SYNC_ENABLED === "true";
const TEAM_LIST_BASELINE_SYNC_CRON =
	process.env.TEAM_LIST_BASELINE_SYNC_CRON ?? "5 18 * * 2";
const TEAM_LIST_BASELINE_SYNC_TIMEZONE =
	process.env.TEAM_LIST_BASELINE_SYNC_TIMEZONE ?? "Pacific/Auckland";

/** In-memory match status tracker to detect transitions */
let previousStatuses = new Map<number, string>();
let previousRoundId: number | null = null;
let lastHandledRoundCompletionId: number | null = null;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let syncing = false;
let historySyncing = false;
const handledTeamListWindows = new Map<string, number>();

function clearStaleTeamListWindows(nowMs: number): void {
	for (const [key, at] of handledTeamListWindows.entries()) {
		if (nowMs - at > TEAM_LIST_WINDOW_MEMORY_MS) {
			handledTeamListWindows.delete(key);
		}
	}
}

function registerTeamListWindow(
	fixtureId: number,
	windowMinutes: number,
	nowMs: number,
): boolean {
	const key = `${fixtureId}:${windowMinutes}`;
	if (handledTeamListWindows.has(key)) {
		return false;
	}
	handledTeamListWindows.set(key, nowMs);
	return true;
}

function hasUpcomingKickoffWithinWindow(rounds: UpstreamRound[]): boolean {
	const now = Date.now();
	const lookahead = Math.max(UPCOMING_MATCH_POLL_WINDOW_MINUTES, 30) * 60 * 1000;

	for (const round of rounds) {
		if (round.status !== "active" && round.status !== "scheduled") continue;
		for (const match of round.matches) {
			if (match.status === "complete") continue;
			const kickoffMs = new Date(match.date).getTime();
			if (!Number.isFinite(kickoffMs)) continue;
			const diff = kickoffMs - now;
			if (diff >= 0 && diff <= lookahead) {
				return true;
			}
		}
	}

	return false;
}

function resolveHistorySyncLookbackRounds(): number {
	return Number.isFinite(HISTORY_SYNC_LOOKBACK_ROUNDS) &&
		HISTORY_SYNC_LOOKBACK_ROUNDS > 0
		? HISTORY_SYNC_LOOKBACK_ROUNDS
		: 3;
}

async function runScheduledFullSync(
	reason: string,
	historyReason: string,
): Promise<void> {
	await safeSyncRun(reason, () => runFullSync());

	if (!ENABLE_HISTORY_SYNC) {
		return;
	}

	await safeHistorySyncRun(historyReason, async () => {
		await runOfficialHistoryIncrementalSync({
			reason: historyReason,
			lookbackRounds: resolveHistorySyncLookbackRounds(),
		});
	});
}

async function runDueKickoffWindowTeamListSyncs(
	rounds: UpstreamRound[],
): Promise<void> {
	const nowMs = Date.now();
	clearStaleTeamListWindows(nowMs);

	const grouped = new Map<string, { roundId: number; season: number; fixtureIds: number[]; labels: string[] }>();

	for (const round of rounds) {
		if (round.status !== "active" && round.status !== "scheduled") continue;
		const season = deriveSeason(round.start);

		for (const match of round.matches) {
			if (match.status === "complete") continue;
			const kickoffMs = new Date(match.date).getTime();
			if (!Number.isFinite(kickoffMs)) continue;
			const minutesToKickoff = Math.round((kickoffMs - nowMs) / 60000);

			for (const windowMinutes of TEAM_LIST_REFRESH_WINDOWS_MINUTES) {
				if (
					Math.abs(minutesToKickoff - windowMinutes) >
					TEAM_LIST_WINDOW_TOLERANCE_MINUTES
				) {
					continue;
				}
				if (!registerTeamListWindow(match.id, windowMinutes, nowMs)) {
					continue;
				}

				const key = `${round.id}:${season}`;
				const existing = grouped.get(key);
				const label = `fixture ${match.id} @ T${windowMinutes >= 0 ? "-" : "+"}${Math.abs(windowMinutes)}m`;
				if (existing) {
					if (!existing.fixtureIds.includes(match.id)) {
						existing.fixtureIds.push(match.id);
					}
					existing.labels.push(label);
				} else {
					grouped.set(key, {
						roundId: round.id,
						season,
						fixtureIds: [match.id],
						labels: [label],
					});
				}
			}
		}
	}

	for (const group of grouped.values()) {
		logger.info(
			`[Scheduler] Team-list targeted sync due (${group.labels.join(", ")})`,
		);
		await safeSyncRun(
			`team-lists-kickoff-window-r${group.roundId}`,
			() =>
				syncTeamListsForRound({
					roundId: group.roundId,
					season: group.season,
					targetFixtureIds: group.fixtureIds,
				}),
		);
	}
}

/**
 * Start the sync scheduler:
 * 1. Daily cron at 4:00 AM AEST (18:00 UTC previous day)
 * 2. Weekly full sync + team-list baseline cron (Tuesday 6:05 PM Pacific/Auckland)
 * 3. Match-aware poller
 */
export function startScheduler(): void {
	logger.info("[Scheduler] Starting sync scheduler");

	// Daily full sync at 4:00 AM AEST = 18:00 UTC (previous day)
	cron.schedule("0 18 * * *", async () => {
		logger.info(
			"[Scheduler] Daily cron triggered — running full sync + nightly history reconcile",
		);
		await runScheduledFullSync("daily-cron", "nightly-reconcile");
	});

	logger.info("[Scheduler] Daily cron scheduled (4:00 AM AEST)");

	if (TEAM_LIST_BASELINE_SYNC_ENABLED) {
		cron.schedule(
			TEAM_LIST_BASELINE_SYNC_CRON,
			async () => {
				logger.info(
					"[Scheduler] Tuesday 6:05 PM NZ cron triggered — running full sync + history reconcile",
				);
				await runScheduledFullSync(
					"team-lists-baseline",
					"team-lists-baseline",
				);
			},
			{ timezone: TEAM_LIST_BASELINE_SYNC_TIMEZONE },
		);
		logger.info(
			`[Scheduler] Team-list baseline cron scheduled (${TEAM_LIST_BASELINE_SYNC_CRON} ${TEAM_LIST_BASELINE_SYNC_TIMEZONE})`,
		);
	}

	// Start the match-aware poller
	poll();
}

/**
 * Core polling loop. Checks round status and triggers syncs
 * when matches complete.
 */
async function poll(): Promise<void> {
	try {
		const rounds = await fetchUpstream<UpstreamRound[]>("rounds");
		await runDueKickoffWindowTeamListSyncs(rounds);

		const activeRound = rounds.find((r) => r.status === "active");

		if (!activeRound) {
			const candidateRound =
				previousRoundId != null
					? rounds.find((round) => round.id === previousRoundId)
					: undefined;
			const roundBecameComplete =
				candidateRound?.status === "complete" &&
				candidateRound.matches.length > 0 &&
				candidateRound.matches.every((match) => match.status === "complete");
			const shouldHandleRoundCompletion =
				roundBecameComplete &&
				candidateRound.id !== lastHandledRoundCompletionId;

			if (shouldHandleRoundCompletion) {
				logger.info(
					`[Scheduler] Round ${candidateRound.id} is complete and no longer active — running full sync + history sync`,
				);
				const syncSucceeded = await safeSyncRun("round-complete", () =>
					runFullSync(),
				);
				let historySucceeded = true;

				if (ENABLE_HISTORY_SYNC) {
					historySucceeded = await safeHistorySyncRun(
						"round-complete",
						async () => {
							await runOfficialHistoryIncrementalSync({
								reason: "round-complete",
								lookbackRounds: resolveHistorySyncLookbackRounds(),
								targetRoundId: candidateRound.id,
							});
						},
					);
				}

				if (syncSucceeded && historySucceeded) {
					lastHandledRoundCompletionId = candidateRound.id;
					previousRoundId = null;
				} else {
					logger.warn(
						`[Scheduler] Round ${candidateRound.id} completion sync was not fully successful — will retry on next poll`,
					);
				}
			} else {
				previousRoundId = null;
				logger.info(
					"[Scheduler] No active round — waiting for next poll",
				);
			}

			previousStatuses.clear();
			scheduleNextPoll(
				hasUpcomingKickoffWithinWindow(rounds)
					? POLL_INTERVAL_ACTIVE
					: POLL_INTERVAL_IDLE,
			);
			return;
		}

		previousRoundId = activeRound.id;

		const matches = activeRound.matches;
		const currentStatuses = new Map(matches.map((m) => [m.id, m.status]));

		// Detect match completions
		const completedMatches: UpstreamMatch[] = [];
		for (const match of matches) {
			const prev = previousStatuses.get(match.id);
			if (prev && prev !== "complete" && match.status === "complete") {
				completedMatches.push(match);
			}
		}

		if (completedMatches.length > 0) {
			const names = completedMatches
				.map((m) => `${m.home_squad_name} vs ${m.away_squad_name}`)
				.join(", ");
			logger.info(
				`[Scheduler] ${completedMatches.length} match(es) completed: ${names}`,
			);

			// Check if ALL matches in the round are now complete
			const allComplete = matches.every((m) => m.status === "complete");

			if (allComplete) {
				logger.info(
					`[Scheduler] Round ${activeRound.id} fully complete — running full sync`,
				);
				const syncSucceeded = await safeSyncRun("round-complete", () =>
					runFullSync(),
				);
				let historySucceeded = true;
				if (ENABLE_HISTORY_SYNC) {
					historySucceeded = await safeHistorySyncRun(
						"round-complete",
						async () => {
							await runOfficialHistoryIncrementalSync({
								reason: "round-complete",
								lookbackRounds: resolveHistorySyncLookbackRounds(),
								targetRoundId: activeRound.id,
							});
						},
					);
				}
				if (syncSucceeded && historySucceeded) {
					lastHandledRoundCompletionId = activeRound.id;
				}
			} else {
				logger.info("[Scheduler] Running light sync after match completion");
				await safeSyncRun("match-complete", () => runLightSync());
				if (ENABLE_HISTORY_SYNC) {
					await safeHistorySyncRun("match-complete", async () => {
						await runOfficialHistoryIncrementalSync({
							reason: "match-complete",
							lookbackRounds: resolveHistorySyncLookbackRounds(),
							targetRoundId: activeRound.id,
						});
					});
				}
			}
		} else if (previousStatuses.size === 0) {
			// First poll after startup — log current state
			const playing = matches.filter((m) => m.status === "playing").length;
			const complete = matches.filter((m) => m.status === "complete").length;
			const scheduled = matches.filter((m) => m.status === "scheduled").length;
			logger.info(
				`[Scheduler] Round ${activeRound.id}: ${playing} playing, ${complete} complete, ${scheduled} scheduled`,
			);
		}

		previousStatuses = currentStatuses;
		scheduleNextPoll(POLL_INTERVAL_ACTIVE);
	} catch (error) {
		logger.error(
			`[Scheduler] Poll failed: ${error instanceof Error ? error.message : String(error)}`,
		);
		scheduleNextPoll(POLL_INTERVAL_ACTIVE);
	}
}

function scheduleNextPoll(interval: number): void {
	if (pollTimer) clearTimeout(pollTimer);
	pollTimer = setTimeout(() => poll(), interval);
}

/**
 * Wraps sync execution with a lock to prevent overlapping runs.
 */
async function safeSyncRun(
	reason: string,
	syncFn: () => Promise<unknown>,
): Promise<boolean> {
	if (syncing) {
		logger.warn(
			`[Scheduler] Sync already in progress — skipping (reason: ${reason})`,
		);
		return false;
	}

	syncing = true;
	const start = Date.now();

	try {
		logger.info(`[Scheduler] Sync started (reason: ${reason})`);
		await syncFn();
		logger.info(
			`[Scheduler] Sync complete (reason: ${reason}, took ${Date.now() - start}ms)`,
		);
		return true;
	} catch (error) {
		logger.error(
			`[Scheduler] Sync failed (reason: ${reason}): ${error instanceof Error ? error.message : String(error)}`,
		);
		return false;
	} finally {
		syncing = false;
	}
}

async function safeHistorySyncRun(
	reason: string,
	syncFn: () => Promise<unknown>,
): Promise<boolean> {
	if (historySyncing) {
		logger.warn(
			`[Scheduler] History sync already in progress — skipping (reason: ${reason})`,
		);
		return false;
	}

	historySyncing = true;
	const start = Date.now();

	try {
		logger.info(`[Scheduler] History sync started (reason: ${reason})`);
		await syncFn();
		logger.info(
			`[Scheduler] History sync complete (reason: ${reason}, took ${Date.now() - start}ms)`,
		);
		return true;
	} catch (error) {
		logger.error(
			`[Scheduler] History sync failed (reason: ${reason}): ${error instanceof Error ? error.message : String(error)}`,
		);
		return false;
	} finally {
		historySyncing = false;
	}
}

/**
 * Stop the scheduler (for graceful shutdown).
 */
export function stopScheduler(): void {
	if (pollTimer) {
		clearTimeout(pollTimer);
		pollTimer = null;
	}
	logger.info("[Scheduler] Stopped");
}
