import dotenv from "dotenv";
dotenv.config();

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, asc, eq, gte, sql, type SQL } from "drizzle-orm";
import db from "@database/data-source";
import { playerCurrent, players, rounds } from "@database/schema";
import logger from "@src/logic/shared/utils/logger";
import {
	buildFootyStatsHeadersFromEnv,
	dedupeBySeasonMatch,
	dedupeBySeasonRound,
	ensureRoundExists,
	fetchPlayerStatsWithRetry,
	normalizeError,
	normalizeStats,
	parseIntSafe,
	sleep,
	type NormalizedStatRow,
	upsertHistoryRows,
} from "@src/worker/history/footystats-history.ingest";

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

interface Failure {
	playerId: number;
	error: string;
	attempts: number;
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

function sortByEarliestMatch(a: NormalizedStatRow, b: NormalizedStatRow): number {
	const dateDiff =
		(a.matchDate?.getTime() ?? Number.MAX_SAFE_INTEGER) -
		(b.matchDate?.getTime() ?? Number.MAX_SAFE_INTEGER);
	if (dateDiff !== 0) return dateDiff;
	if (a.roundId !== b.roundId) return a.roundId - b.roundId;
	return (a.matchId ?? Number.MAX_SAFE_INTEGER) - (b.matchId ?? Number.MAX_SAFE_INTEGER);
}

async function main() {
	const options = parseArgs(process.argv.slice(2));

	const auth = buildFootyStatsHeadersFromEnv();
	if (!auth.headers) {
		throw new Error(
			`Missing required FootyStats auth env vars: ${auth.missing.join(", ")}`,
		);
	}

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
	const existingRounds = await db.select({ roundId: rounds.roundId }).from(rounds);
	const knownRoundIds = new Set(existingRounds.map((row) => row.roundId));

	logger.info(
		`Footystats backfill started (dryRun=${options.dryRun}, players=${queue.length}, referenceSeason=${referenceSeason})`,
	);

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
				{
					timeoutMs: options.timeoutMs,
					maxRetries: options.maxRetries,
				},
				auth.headers,
			);
			summaryAccumulator.requestsSucceeded++;

			if (!Array.isArray(response.stats)) {
				throw new Error(
					`Invalid response shape for player ${player.playerId}: missing stats[]`,
				);
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
					{ sourceTag: "footystatistics-backfill" },
				);
				if (inserted === "inserted") {
					summaryAccumulator.roundStubsInserted++;
				} else if (inserted === "planned") {
					summaryAccumulator.roundStubsPlanned++;
				}
			}

			const upserted = await upsertHistoryRows({
				matchRows,
				roundRows,
				dryRun: options.dryRun,
			});
			summaryAccumulator.matchRowsUpserted += upserted.matchRowsUpserted;
			summaryAccumulator.roundRowsUpserted += upserted.roundRowsUpserted;

			if (options.applyTransferUpdates) {
				const transferSeasons = [referenceSeason, referenceSeason - 1];
				let candidate: NormalizedStatRow | undefined;

				for (const season of transferSeasons) {
					const seasonRows = validRows.filter((row) => row.season === season);
					if (seasonRows.length === 0) continue;

					const primaryRows = seasonRows
						.filter((row) => row.matchType === "nrl" || row.matchType === "finals")
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
