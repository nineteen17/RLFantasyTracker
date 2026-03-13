import cron from "node-cron";
import logger from "@src/logic/shared/utils/logger";
import { fetchUpstream } from "./upstream/client";
import type { UpstreamRound, UpstreamMatch } from "./upstream/types";
import { runFullSync, runLightSync } from "./syncService";
import { runOfficialHistoryIncrementalSync } from "./history/official-history.incremental";

const POLL_INTERVAL_ACTIVE = 5 * 60 * 1000; // 5 minutes during active round
const POLL_INTERVAL_IDLE = 30 * 60 * 1000; // 30 minutes when no active round
const ENABLE_HISTORY_SYNC =
	process.env.ENABLE_HISTORY_SYNC === undefined
		? true
		: process.env.ENABLE_HISTORY_SYNC === "true";
const HISTORY_SYNC_LOOKBACK_ROUNDS = Number.parseInt(
	process.env.HISTORY_SYNC_LOOKBACK_ROUNDS ?? "3",
	10,
);

/** In-memory match status tracker to detect transitions */
let previousStatuses = new Map<number, string>();
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let syncing = false;
let historySyncing = false;

/**
 * Start the sync scheduler:
 * 1. Daily cron at 4:00 AM AEST (18:00 UTC previous day)
 * 2. Match-aware poller
 */
export function startScheduler(): void {
	logger.info("[Scheduler] Starting sync scheduler");

	// Daily full sync at 4:00 AM AEST = 18:00 UTC (previous day)
	cron.schedule("0 18 * * *", async () => {
		logger.info(
			"[Scheduler] Daily cron triggered — running full sync + nightly history reconcile",
		);
		await safeSyncRun("daily-cron", () => runFullSync());
		if (ENABLE_HISTORY_SYNC) {
			await safeHistorySyncRun("nightly-reconcile", async () => {
				await runOfficialHistoryIncrementalSync({
					reason: "nightly-reconcile",
					lookbackRounds:
						Number.isFinite(HISTORY_SYNC_LOOKBACK_ROUNDS) &&
						HISTORY_SYNC_LOOKBACK_ROUNDS > 0
							? HISTORY_SYNC_LOOKBACK_ROUNDS
							: 3,
				});
			});
		}
	});

	logger.info("[Scheduler] Daily cron scheduled (4:00 AM AEST)");

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
		const activeRound = rounds.find((r) => r.status === "active");

		if (!activeRound) {
			logger.info(
				"[Scheduler] No active round — polling again in 30 minutes",
			);
			previousStatuses.clear();
			scheduleNextPoll(POLL_INTERVAL_IDLE);
			return;
		}

		const matches = activeRound.matches;
		const currentStatuses = new Map(
			matches.map((m) => [m.id, m.status]),
		);

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
			const allComplete = matches.every(
				(m) => m.status === "complete",
			);

			if (allComplete) {
				logger.info(
					`[Scheduler] Round ${activeRound.id} fully complete — running full sync`,
				);
				await safeSyncRun("round-complete", () => runFullSync());
				if (ENABLE_HISTORY_SYNC) {
					await safeHistorySyncRun("round-complete", async () => {
						await runOfficialHistoryIncrementalSync({
							reason: "round-complete",
							lookbackRounds:
								Number.isFinite(HISTORY_SYNC_LOOKBACK_ROUNDS) &&
								HISTORY_SYNC_LOOKBACK_ROUNDS > 0
									? HISTORY_SYNC_LOOKBACK_ROUNDS
									: 3,
							targetRoundId: activeRound.id,
						});
					});
				}
			} else {
				logger.info("[Scheduler] Running light sync after match completion");
				await safeSyncRun("match-complete", () => runLightSync());
				if (ENABLE_HISTORY_SYNC) {
					await safeHistorySyncRun("match-complete", async () => {
						await runOfficialHistoryIncrementalSync({
							reason: "match-complete",
							lookbackRounds:
								Number.isFinite(HISTORY_SYNC_LOOKBACK_ROUNDS) &&
								HISTORY_SYNC_LOOKBACK_ROUNDS > 0
									? HISTORY_SYNC_LOOKBACK_ROUNDS
									: 3,
							targetRoundId: activeRound.id,
						});
					});
				}
			}
		} else if (previousStatuses.size === 0) {
			// First poll after startup — log current state
			const playing = matches.filter((m) => m.status === "playing").length;
			const complete = matches.filter((m) => m.status === "complete").length;
			const scheduled = matches.filter(
				(m) => m.status === "scheduled",
			).length;
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
): Promise<void> {
	if (syncing) {
		logger.warn(
			`[Scheduler] Sync already in progress — skipping (reason: ${reason})`,
		);
		return;
	}

	syncing = true;
	const start = Date.now();

	try {
		logger.info(`[Scheduler] Sync started (reason: ${reason})`);
		await syncFn();
		logger.info(
			`[Scheduler] Sync complete (reason: ${reason}, took ${Date.now() - start}ms)`,
		);
	} catch (error) {
		logger.error(
			`[Scheduler] Sync failed (reason: ${reason}): ${error instanceof Error ? error.message : String(error)}`,
		);
	} finally {
		syncing = false;
	}
}

async function safeHistorySyncRun(
	reason: string,
	syncFn: () => Promise<unknown>,
): Promise<void> {
	if (historySyncing) {
		logger.warn(
			`[Scheduler] History sync already in progress — skipping (reason: ${reason})`,
		);
		return;
	}

	historySyncing = true;
	const start = Date.now();

	try {
		logger.info(`[Scheduler] History sync started (reason: ${reason})`);
		await syncFn();
		logger.info(
			`[Scheduler] History sync complete (reason: ${reason}, took ${Date.now() - start}ms)`,
		);
	} catch (error) {
		logger.error(
			`[Scheduler] History sync failed (reason: ${reason}): ${error instanceof Error ? error.message : String(error)}`,
		);
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
