import dotenv from "dotenv";
dotenv.config();

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, asc, eq, gte, sql, type SQL } from "drizzle-orm";
import db from "@database/data-source";
import {
	playerCurrent,
	playerMatchStatsHistory,
	playerRoundStats,
	players,
	rounds,
} from "@database/schema";
import logger from "@src/logic/shared/utils/logger";

interface CliOptions {
	dryRun: boolean;
	playerId?: number;
	limit?: number;
	resumeFrom?: number;
	delayMs: number;
	timeoutMs: number;
	maxRetries: number;
	outputDir: string;
	referenceSeason?: number;
	applyTransferUpdates: boolean;
}

interface FootyStatsResponse {
	stats?: unknown;
}

interface NormalizedStatRow {
	season: number;
	roundId: number;
	playerId: number;
	squadId: number;
	matchId: number | null;
	matchType: string;
	matchDate: Date | null;
	fantasyPoints: number | null;
	timeOnGround: number | null;
	tries: number | null;
	tryAssists: number | null;
	tackles: number | null;
	missedTackles: number | null;
	metresGained: number | null;
	kickMetres: number | null;
	errors: number | null;
	offloads: number | null;
	raw: Record<string, unknown>;
}

interface Failure {
	playerId: number;
	error: string;
	attempts: number;
	statusCode?: number;
}

interface RunSummary {
	startedAt: string;
	endedAt: string;
	durationMs: number;
	dryRun: boolean;
	currentSeason: number;
	referenceSeason: number;
	playersQueued: number;
	playersProcessed: number;
	playersFailed: number;
	playersWithNoStats: number;
	requestsSucceeded: number;
	requestsFailed: number;
	rowsFetched: number;
	rowsInvalid: number;
	matchRowsAfterDedupe: number;
	matchRowsSkippedByDedupe: number;
	matchRowsDroppedNoMatchId: number;
	matchRowsUpserted: number;
	roundRowsAfterDedupe: number;
	roundRowsSkippedByDedupe: number;
	roundRowsUpserted: number;
	roundStubsInserted: number;
	roundStubsPlanned: number;
	transferUpdatesApplied: number;
	transferUpdatesPlanned: number;
}

const FOOTY_STATS_BASE_URL = "https://footystatistics.com/api/player-stats";

function parseIntSafe(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return Math.trunc(value);
	}
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number.parseInt(value, 10);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

function parseDateSafe(value: unknown): Date | null {
	if (typeof value !== "string" || value.trim() === "") return null;
	const isoLike = value.includes("T") ? value : value.replace(" ", "T");
	const d = new Date(isoLike);
	return Number.isNaN(d.getTime()) ? null : d;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv: string[]): CliOptions {
	const options: CliOptions = {
		dryRun: false,
		delayMs: 1000,
		timeoutMs: 15000,
		maxRetries: 5,
		outputDir: "reports/footystats-backfill",
		applyTransferUpdates: true,
	};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		const next = argv[i + 1];

		switch (arg) {
			case "--dry-run":
				options.dryRun = true;
				break;
			case "--player-id":
				options.playerId = parseIntSafe(next) ?? undefined;
				i++;
				break;
			case "--limit":
				options.limit = parseIntSafe(next) ?? undefined;
				i++;
				break;
			case "--resume-from":
				options.resumeFrom = parseIntSafe(next) ?? undefined;
				i++;
				break;
			case "--delay-ms":
				options.delayMs = parseIntSafe(next) ?? options.delayMs;
				i++;
				break;
			case "--timeout-ms":
				options.timeoutMs = parseIntSafe(next) ?? options.timeoutMs;
				i++;
				break;
			case "--max-retries":
				options.maxRetries = parseIntSafe(next) ?? options.maxRetries;
				i++;
				break;
			case "--output-dir":
				options.outputDir = next ?? options.outputDir;
				i++;
				break;
			case "--reference-season":
				options.referenceSeason = parseIntSafe(next) ?? undefined;
				i++;
				break;
			case "--no-transfer-updates":
				options.applyTransferUpdates = false;
				break;
			default:
				if (arg.startsWith("--")) {
					throw new Error(`Unknown argument: ${arg}`);
				}
		}
	}

	if (options.playerId !== undefined && options.playerId <= 0) {
		throw new Error("--player-id must be a positive integer");
	}
	if (options.limit !== undefined && options.limit <= 0) {
		throw new Error("--limit must be a positive integer");
	}
	if (options.resumeFrom !== undefined && options.resumeFrom <= 0) {
		throw new Error("--resume-from must be a positive integer");
	}
	if (options.delayMs < 0) {
		throw new Error("--delay-ms must be >= 0");
	}
	if (options.timeoutMs <= 0) {
		throw new Error("--timeout-ms must be > 0");
	}
	if (options.maxRetries < 0) {
		throw new Error("--max-retries must be >= 0");
	}

	return options;
}

function matchTypePriority(matchType: string): number {
	if (matchType === "nrl") return 3;
	if (matchType === "finals") return 2;
	if (matchType === "pre-season-trial") return 1;
	return 0;
}

function shouldReplacePreferredRow(
	current: NormalizedStatRow,
	candidate: NormalizedStatRow,
): boolean {
	const currentPriority = matchTypePriority(current.matchType);
	const candidatePriority = matchTypePriority(candidate.matchType);
	if (candidatePriority !== currentPriority) {
		return candidatePriority > currentPriority;
	}
	if (current.fantasyPoints == null && candidate.fantasyPoints != null) {
		return true;
	}
	if (current.matchDate == null && candidate.matchDate != null) {
		return true;
	}
	if (current.matchDate && candidate.matchDate) {
		return candidate.matchDate.getTime() > current.matchDate.getTime();
	}
	if (current.matchId == null && candidate.matchId != null) {
		return true;
	}
	return false;
}

function dedupeBySeasonRound(rows: NormalizedStatRow[]): {
	deduped: NormalizedStatRow[];
	skipped: number;
} {
	const byKey = new Map<string, NormalizedStatRow>();
	let skipped = 0;

	for (const row of rows) {
		const key = `${row.season}:${row.roundId}`;
		const existing = byKey.get(key);
		if (!existing) {
			byKey.set(key, row);
			continue;
		}

		if (shouldReplacePreferredRow(existing, row)) {
			byKey.set(key, row);
			skipped++;
			continue;
		}

		skipped++;
	}

	return { deduped: Array.from(byKey.values()), skipped };
}

function dedupeBySeasonMatch(rows: NormalizedStatRow[]): {
	deduped: NormalizedStatRow[];
	skipped: number;
	droppedNoMatchId: number;
} {
	const byKey = new Map<string, NormalizedStatRow>();
	let skipped = 0;
	let droppedNoMatchId = 0;

	for (const row of rows) {
		if (row.matchId == null) {
			droppedNoMatchId++;
			continue;
		}

		const key = `${row.season}:${row.matchId}:${row.playerId}`;
		const existing = byKey.get(key);
		if (!existing) {
			byKey.set(key, row);
			continue;
		}

		if (shouldReplacePreferredRow(existing, row)) {
			byKey.set(key, row);
			skipped++;
			continue;
		}

		skipped++;
	}

	return { deduped: Array.from(byKey.values()), skipped, droppedNoMatchId };
}

function normalizeStats(
	playerId: number,
	rawStats: unknown[],
): { validRows: NormalizedStatRow[]; invalidCount: number } {
	const validRows: NormalizedStatRow[] = [];
	let invalidCount = 0;

	for (const raw of rawStats) {
		if (!raw || typeof raw !== "object") {
			invalidCount++;
			continue;
		}

		const row = raw as Record<string, unknown>;
		const season = parseIntSafe(row.year);
		const roundId = parseIntSafe(row.round_id);
		const squadId = parseIntSafe(row.squad_id);

		if (!season || !roundId || !squadId) {
			invalidCount++;
			continue;
		}

		const rowPlayerId = parseIntSafe(row.player_id) ?? playerId;
		if (rowPlayerId !== playerId) {
			invalidCount++;
			continue;
		}

		validRows.push({
			season,
			roundId,
			playerId: rowPlayerId,
			squadId,
			matchId: parseIntSafe(row.match_id),
			matchType: typeof row.match_type === "string" ? row.match_type : "unknown",
			matchDate: parseDateSafe(row.match_date),
			fantasyPoints: parseIntSafe(row.fantasy_points),
			timeOnGround: parseIntSafe(row.time_on_ground),
			tries: parseIntSafe(row.tries),
			tryAssists: parseIntSafe(row.try_assists),
			tackles: parseIntSafe(row.tackles),
			missedTackles: parseIntSafe(row.missed_tackles),
			metresGained: parseIntSafe(row.metres_gained),
			kickMetres: parseIntSafe(row.kick_metres),
			errors: parseIntSafe(row.errors),
			offloads: parseIntSafe(row.offloads),
			raw: row,
		});
	}

	return { validRows, invalidCount };
}

function normalizeError(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}

function isRetryableStatus(status: number): boolean {
	return status === 429 || status >= 500;
}

async function fetchPlayerStatsWithRetry(
	playerId: number,
	options: CliOptions,
	headers: HeadersInit,
): Promise<{ response: FootyStatsResponse; attempts: number }> {
	let attempt = 0;
	let lastError: unknown;

	while (attempt <= options.maxRetries) {
		attempt++;
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

		try {
			const url = `${FOOTY_STATS_BASE_URL}?player_id=${playerId}`;
			const res = await fetch(url, {
				method: "GET",
				headers,
				signal: controller.signal,
			});
			clearTimeout(timeout);

			if (!res.ok) {
				const status = res.status;
				const body = await res.text().catch(() => "");
				if (isRetryableStatus(status) && attempt <= options.maxRetries) {
					const backoff = Math.min(30000, 1000 * 2 ** (attempt - 1));
					const jitter = Math.floor(Math.random() * 250);
					logger.warn(
						`Retryable HTTP ${status} for player ${playerId} (attempt ${attempt}/${options.maxRetries + 1}). Retrying in ${backoff + jitter}ms.`,
					);
					await sleep(backoff + jitter);
					continue;
				}
				throw new Error(
					`HTTP ${status} for player ${playerId}: ${res.statusText}${body ? ` | ${body.slice(0, 180)}` : ""}`,
				);
			}

			const json = (await res.json()) as FootyStatsResponse;
			return { response: json, attempts: attempt };
		} catch (error) {
			clearTimeout(timeout);
			lastError = error;
			const isAbort = error instanceof Error && error.name === "AbortError";
			const isNetwork = error instanceof TypeError || isAbort;
			if (isNetwork && attempt <= options.maxRetries) {
				const backoff = Math.min(30000, 1000 * 2 ** (attempt - 1));
				const jitter = Math.floor(Math.random() * 250);
				logger.warn(
					`Network/timeout error for player ${playerId} (attempt ${attempt}/${options.maxRetries + 1}): ${normalizeError(error)}. Retrying in ${backoff + jitter}ms.`,
				);
				await sleep(backoff + jitter);
				continue;
			}
			throw error;
		}
	}

	throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function ensureRoundExists(
	roundId: number,
	seasonHint: number,
	knownRoundIds: Set<number>,
	dryRun: boolean,
): Promise<"none" | "planned" | "inserted"> {
	if (knownRoundIds.has(roundId)) return "none";

	if (!dryRun) {
		await db
			.insert(rounds)
			.values({
				roundId,
				season: seasonHint,
				roundDisplay: `Round ${roundId}`,
				raw: {
					source: "footystatistics-backfill",
					note: "Stub round inserted for historical player stats backfill",
				},
			})
			.onConflictDoNothing();
		knownRoundIds.add(roundId);
		return "inserted";
	}

	knownRoundIds.add(roundId);
	return "planned";
}

async function writeReports(
	options: CliOptions,
	summary: RunSummary,
	failures: Failure[],
): Promise<void> {
	const outputDir = path.resolve(process.cwd(), options.outputDir);
	await mkdir(outputDir, { recursive: true });

	const stamp = new Date().toISOString().replace(/[:.]/g, "-");
	const summaryPath = path.join(outputDir, `summary-${stamp}.json`);
	const failuresPath = path.join(outputDir, `failures-${stamp}.json`);

	await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
	await writeFile(failuresPath, `${JSON.stringify(failures, null, 2)}\n`, "utf8");

	logger.info(`Wrote summary report: ${summaryPath}`);
	logger.info(`Wrote failure report: ${failuresPath}`);
}

async function main() {
	const options = parseArgs(process.argv.slice(2));

	const cookie = process.env.FOOTY_STATS_COOKIE;
	const xsrf = process.env.FOOTY_STATS_XSRF_TOKEN;
	const userAgent = process.env.FOOTY_STATS_USER_AGENT;

	if (!cookie) throw new Error("FOOTY_STATS_COOKIE is required");
	if (!xsrf) throw new Error("FOOTY_STATS_XSRF_TOKEN is required");
	if (!userAgent) throw new Error("FOOTY_STATS_USER_AGENT is required");

	const currentSeasonResult = await db
		.select({
			season: sql<number>`COALESCE(MAX(${playerCurrent.season}), EXTRACT(YEAR FROM NOW())::int)`,
		})
		.from(playerCurrent);

	const currentSeason =
		Number(currentSeasonResult[0]?.season) || new Date().getFullYear();
	const referenceSeason = options.referenceSeason ?? currentSeason - 1;

	const conditions: SQL[] = [];
	if (options.playerId !== undefined) {
		conditions.push(eq(players.playerId, options.playerId));
	}
	if (options.resumeFrom !== undefined) {
		conditions.push(gte(players.playerId, options.resumeFrom));
	}
	const where = conditions.length > 0 ? and(...conditions) : undefined;

	const playerRows = await db
		.select({
			playerId: players.playerId,
			squadId: players.squadId,
			originalSquadId: players.originalSquadId,
		})
		.from(players)
		.where(where)
		.orderBy(asc(players.playerId));

	const queue = options.limit ? playerRows.slice(0, options.limit) : playerRows;

	const existingRounds = await db
		.select({ roundId: rounds.roundId })
		.from(rounds);
	const knownRoundIds = new Set(existingRounds.map((r) => r.roundId));

	logger.info(
		`Footystats backfill started (dryRun=${options.dryRun}, players=${queue.length}, referenceSeason=${referenceSeason})`,
	);

	const headers: HeadersInit = {
		Cookie: cookie,
		"X-XSRF-TOKEN": xsrf,
		"User-Agent": userAgent,
		Accept: "application/json",
	};

	const startedAt = new Date();
	const failures: Failure[] = [];
	const summaryAccumulator = {
		playersProcessed: 0,
		playersFailed: 0,
		playersWithNoStats: 0,
		requestsSucceeded: 0,
		requestsFailed: 0,
		rowsFetched: 0,
		rowsInvalid: 0,
		matchRowsAfterDedupe: 0,
		matchRowsSkippedByDedupe: 0,
		matchRowsDroppedNoMatchId: 0,
		matchRowsUpserted: 0,
		roundRowsAfterDedupe: 0,
		roundRowsSkippedByDedupe: 0,
		roundRowsUpserted: 0,
		roundStubsInserted: 0,
		roundStubsPlanned: 0,
		transferUpdatesApplied: 0,
		transferUpdatesPlanned: 0,
	};

	for (let i = 0; i < queue.length; i++) {
		const player = queue[i];
		const playerLabel = `${player.playerId} (${i + 1}/${queue.length})`;

		try {
			const { response, attempts } = await fetchPlayerStatsWithRetry(
				player.playerId,
				options,
				headers,
			);
			summaryAccumulator.requestsSucceeded++;

			if (!Array.isArray(response.stats)) {
				throw new Error(`Invalid response shape for player ${player.playerId}: missing stats[]`);
			}

			const { validRows, invalidCount } = normalizeStats(
				player.playerId,
				response.stats,
			);
			summaryAccumulator.rowsFetched += response.stats.length;
			summaryAccumulator.rowsInvalid += invalidCount;

			if (validRows.length === 0) {
				summaryAccumulator.playersWithNoStats++;
				summaryAccumulator.playersProcessed++;
				logger.info(
					`Player ${playerLabel}: no valid stats rows (attempts=${attempts})`,
				);
				if (i < queue.length - 1 && options.delayMs > 0) {
					await sleep(options.delayMs);
				}
				continue;
			}

				const {
					deduped: matchRows,
					skipped: matchRowsSkipped,
					droppedNoMatchId,
				} = dedupeBySeasonMatch(validRows);
				summaryAccumulator.matchRowsAfterDedupe += matchRows.length;
				summaryAccumulator.matchRowsSkippedByDedupe += matchRowsSkipped;
				summaryAccumulator.matchRowsDroppedNoMatchId += droppedNoMatchId;

				const {
					deduped: roundRows,
					skipped: roundRowsSkipped,
				} = dedupeBySeasonRound(validRows);
				summaryAccumulator.roundRowsAfterDedupe += roundRows.length;
				summaryAccumulator.roundRowsSkippedByDedupe += roundRowsSkipped;

				for (const row of roundRows) {
					const inserted = await ensureRoundExists(
						row.roundId,
						row.season,
					knownRoundIds,
					options.dryRun,
				);
				if (inserted === "inserted") {
					summaryAccumulator.roundStubsInserted++;
				} else if (inserted === "planned") {
					summaryAccumulator.roundStubsPlanned++;
				}
			}

				if (!options.dryRun) {
					const matchValues = matchRows
						.filter((row) => row.matchId != null)
						.map((row) => ({
							season: row.season,
							roundId: row.roundId,
							matchId: row.matchId as number,
							playerId: row.playerId,
							squadId: row.squadId,
							matchType: row.matchType,
							matchDate: row.matchDate,
							fantasyPoints: row.fantasyPoints,
							timeOnGround: row.timeOnGround,
							tries: row.tries,
							tryAssists: row.tryAssists,
							tackles: row.tackles,
							missedTackles: row.missedTackles,
							metresGained: row.metresGained,
							kickMetres: row.kickMetres,
							errors: row.errors,
							offloads: row.offloads,
							raw: row.raw,
						}));

					const roundValues = roundRows.map((row) => ({
						season: row.season,
						roundId: row.roundId,
						playerId: row.playerId,
						matchId: row.matchId,
						fantasyPoints: row.fantasyPoints,
						timeOnGround: row.timeOnGround,
						tries: row.tries,
						tryAssists: row.tryAssists,
						tackles: row.tackles,
						missedTackles: row.missedTackles,
						metresGained: row.metresGained,
						kickMetres: row.kickMetres,
						errors: row.errors,
						offloads: row.offloads,
						raw: row.raw,
					}));

					await db.transaction(async (tx) => {
						if (matchValues.length > 0) {
							await tx
								.insert(playerMatchStatsHistory)
								.values(matchValues)
								.onConflictDoUpdate({
									target: [
										playerMatchStatsHistory.season,
										playerMatchStatsHistory.matchId,
										playerMatchStatsHistory.playerId,
									],
									set: {
										roundId: sql`excluded.round_id`,
										squadId: sql`excluded.squad_id`,
										matchType: sql`excluded.match_type`,
										matchDate: sql`excluded.match_date`,
										fantasyPoints: sql`excluded.fantasy_points`,
										timeOnGround: sql`excluded.time_on_ground`,
										tries: sql`excluded.tries`,
										tryAssists: sql`excluded.try_assists`,
										tackles: sql`excluded.tackles`,
										missedTackles: sql`excluded.missed_tackles`,
										metresGained: sql`excluded.metres_gained`,
										kickMetres: sql`excluded.kick_metres`,
										errors: sql`excluded.errors`,
										offloads: sql`excluded.offloads`,
										raw: sql`excluded.raw`,
										updatedAt: sql`now()`,
									},
								});
						}

						if (roundValues.length > 0) {
							await tx
								.insert(playerRoundStats)
								.values(roundValues)
								.onConflictDoUpdate({
									target: [
										playerRoundStats.season,
										playerRoundStats.roundId,
										playerRoundStats.playerId,
									],
									set: {
										matchId: sql`excluded.match_id`,
										fantasyPoints: sql`excluded.fantasy_points`,
										timeOnGround: sql`excluded.time_on_ground`,
										tries: sql`excluded.tries`,
										tryAssists: sql`excluded.try_assists`,
										tackles: sql`excluded.tackles`,
										missedTackles: sql`excluded.missed_tackles`,
										metresGained: sql`excluded.metres_gained`,
										kickMetres: sql`excluded.kick_metres`,
										errors: sql`excluded.errors`,
										offloads: sql`excluded.offloads`,
										raw: sql`excluded.raw`,
										updatedAt: sql`now()`,
									},
								});
						}
					});
				}
				if (!options.dryRun) {
					summaryAccumulator.matchRowsUpserted += matchRows.length;
					summaryAccumulator.roundRowsUpserted += roundRows.length;
				}

			if (options.applyTransferUpdates) {
				const sortByEarliestMatch = (a: NormalizedStatRow, b: NormalizedStatRow) => {
					const dateDiff =
						(a.matchDate?.getTime() ?? Number.MAX_SAFE_INTEGER) -
						(b.matchDate?.getTime() ?? Number.MAX_SAFE_INTEGER);
					if (dateDiff !== 0) return dateDiff;
					if (a.roundId !== b.roundId) return a.roundId - b.roundId;
					return (a.matchId ?? Number.MAX_SAFE_INTEGER) - (b.matchId ?? Number.MAX_SAFE_INTEGER);
				};

				const transferSeasons = [referenceSeason, referenceSeason - 1];
				let candidate: NormalizedStatRow | undefined;

				for (const season of transferSeasons) {
					const seasonRows = validRows.filter((r) => r.season === season);
					if (seasonRows.length === 0) continue;

					const primaryRows = seasonRows
						.filter((r) => r.matchType === "nrl" || r.matchType === "finals")
						.sort(sortByEarliestMatch);
					if (primaryRows.length > 0) {
						candidate = primaryRows[0];
						break;
					}

					const anyRows = [...seasonRows].sort(sortByEarliestMatch);
					if (anyRows.length > 0) {
						candidate = anyRows[0];
						break;
					}
				}
				const canUpdateOriginal =
					candidate &&
					candidate.squadId !== player.squadId &&
					(player.originalSquadId == null || player.originalSquadId === 0);

				if (canUpdateOriginal && candidate) {
					summaryAccumulator.transferUpdatesPlanned++;
					if (!options.dryRun) {
						await db
							.update(players)
							.set({
								originalSquadId: candidate.squadId,
								updatedAt: new Date(),
							})
							.where(eq(players.playerId, player.playerId));
						summaryAccumulator.transferUpdatesApplied++;
					}
				}
			}

				summaryAccumulator.playersProcessed++;
				logger.info(
					`Player ${playerLabel}: fetched=${validRows.length}, matchRows=${matchRows.length}, roundRows=${roundRows.length}, invalid=${invalidCount}, attempts=${attempts}`,
				);
			} catch (error) {
			summaryAccumulator.playersFailed++;
			summaryAccumulator.requestsFailed++;
			failures.push({
				playerId: player.playerId,
				error: normalizeError(error),
				attempts: options.maxRetries + 1,
			});
			logger.error(`Player ${playerLabel} failed: ${normalizeError(error)}`);
		}

		if (i < queue.length - 1 && options.delayMs > 0) {
			await sleep(options.delayMs);
		}
	}

	const endedAt = new Date();
	const summary: RunSummary = {
		startedAt: startedAt.toISOString(),
		endedAt: endedAt.toISOString(),
		durationMs: endedAt.getTime() - startedAt.getTime(),
		dryRun: options.dryRun,
		currentSeason,
		referenceSeason,
		playersQueued: queue.length,
		playersProcessed: summaryAccumulator.playersProcessed,
		playersFailed: summaryAccumulator.playersFailed,
		playersWithNoStats: summaryAccumulator.playersWithNoStats,
		requestsSucceeded: summaryAccumulator.requestsSucceeded,
		requestsFailed: summaryAccumulator.requestsFailed,
		rowsFetched: summaryAccumulator.rowsFetched,
		rowsInvalid: summaryAccumulator.rowsInvalid,
		matchRowsAfterDedupe: summaryAccumulator.matchRowsAfterDedupe,
		matchRowsSkippedByDedupe: summaryAccumulator.matchRowsSkippedByDedupe,
		matchRowsDroppedNoMatchId: summaryAccumulator.matchRowsDroppedNoMatchId,
		matchRowsUpserted: summaryAccumulator.matchRowsUpserted,
		roundRowsAfterDedupe: summaryAccumulator.roundRowsAfterDedupe,
		roundRowsSkippedByDedupe: summaryAccumulator.roundRowsSkippedByDedupe,
		roundRowsUpserted: summaryAccumulator.roundRowsUpserted,
		roundStubsInserted: summaryAccumulator.roundStubsInserted,
		roundStubsPlanned: summaryAccumulator.roundStubsPlanned,
		transferUpdatesApplied: summaryAccumulator.transferUpdatesApplied,
		transferUpdatesPlanned: summaryAccumulator.transferUpdatesPlanned,
	};

	logger.info(`Backfill complete: ${JSON.stringify(summary)}`);
	await writeReports(options, summary, failures);

	if (summary.playersFailed > 0) {
		process.exitCode = 1;
	}
}

main().catch((error) => {
	logger.error(`Backfill crashed: ${normalizeError(error)}`);
	if (error instanceof Error && error.stack) {
		logger.error(error.stack);
	}
	process.exit(1);
});
