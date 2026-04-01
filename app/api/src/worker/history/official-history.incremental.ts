import { asc } from "drizzle-orm";
import db from "@database/data-source";
import { players, rounds } from "@database/schema";
import { calculateFantasyPoints } from "@src/logic/shared/constants/scoring";
import logger from "@src/logic/shared/utils/logger";
import { fetchUpstream, fetchUpstreamPath } from "@src/worker/upstream/client";
import type { UpstreamMatch, UpstreamMatchStats, UpstreamRound } from "@src/worker/upstream/types";
import { deriveSeason } from "@src/worker/utils/mappers";
import {
	dedupeBySeasonMatch,
	dedupeBySeasonRound,
	ensureRoundExists,
	type NormalizedStatRow,
	upsertHistoryRows,
} from "./footystats-history.ingest";

type SyncReason =
	| "match-complete"
	| "round-complete"
	| "nightly-reconcile"
	| "team-lists-baseline"
	| "manual";

export interface OfficialHistorySyncOptions {
	dryRun?: boolean;
	lookbackRounds?: number;
	targetRoundId?: number;
	delayMs?: number;
	reason?: SyncReason;
}

type SyncStatus =
	| "success"
	| "partial"
	| "failed"
	| "skipped_no_rounds"
	| "skipped_no_rows";

export interface OfficialHistorySyncResult {
	status: SyncStatus;
	reason: SyncReason;
	lookbackRounds: number;
	targetRoundId: number | null;
	processedRoundIds: number[];
	roundFetchFailures: number;
	rowsBuilt: number;
	rowsSkippedUnknownPlayer: number;
	rowsSkippedNoFixture: number;
	matchRowsAfterDedupe: number;
	matchRowsSkippedByDedupe: number;
	matchRowsDroppedNoMatchId: number;
	matchRowsUpserted: number;
	roundRowsAfterDedupe: number;
	roundRowsSkippedByDedupe: number;
	roundRowsUpserted: number;
	roundStubsInserted: number;
	roundStubsPlanned: number;
	durationMs: number;
}

interface PlayerRoundContext {
	playerId: number;
	squadId: number;
	originalSquadId: number | null;
	transferRound: number | null;
}

function toMatchType(round: UpstreamRound): string {
	return round.is_final === 1 ? "finals" : "nrl";
}

function getStat(stats: Record<string, number>, key: string): number | null {
	const value = stats[key];
	return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}

function inferSquadForRound(player: PlayerRoundContext, roundId: number): number {
	if (
		player.originalSquadId &&
		player.transferRound &&
		player.transferRound > 0 &&
		roundId < player.transferRound
	) {
		return player.originalSquadId;
	}
	return player.squadId;
}

function chooseAnchorRound(roundsList: UpstreamRound[], explicitRoundId?: number): number | null {
	if (explicitRoundId && explicitRoundId > 0) return explicitRoundId;

	const active = roundsList
		.filter((round) => round.status === "active")
		.map((round) => round.id)
		.sort((a, b) => b - a)[0];
	if (active) return active;

	const complete = roundsList
		.filter((round) => round.status === "complete")
		.map((round) => round.id)
		.sort((a, b) => b - a)[0];
	if (complete) return complete;

	return null;
}

function selectTargetRounds(
	roundsList: UpstreamRound[],
	lookbackRounds: number,
	anchorRoundId: number,
): UpstreamRound[] {
	const minRound = Math.max(1, anchorRoundId - lookbackRounds + 1);
	return roundsList
		.filter(
			(round) =>
				(round.status === "complete" || round.status === "active") &&
				round.id >= minRound &&
				round.id <= anchorRoundId,
		)
		.sort((a, b) => a.id - b.id);
}

function mapMatchesBySquad(round: UpstreamRound): Map<number, UpstreamMatch> {
	const fixtureBySquad = new Map<number, UpstreamMatch>();
	for (const match of round.matches) {
		fixtureBySquad.set(match.home_squad_id, match);
		fixtureBySquad.set(match.away_squad_id, match);
	}
	return fixtureBySquad;
}

function buildRowsForRound(
	round: UpstreamRound,
	rawStats: UpstreamMatchStats,
	playerContextMap: Map<number, PlayerRoundContext>,
): {
	rows: NormalizedStatRow[];
	skippedUnknownPlayer: number;
	skippedNoFixture: number;
} {
	const fixtureBySquad = mapMatchesBySquad(round);
	const season = deriveSeason(round.start);
	const matchType = toMatchType(round);

	const rows: NormalizedStatRow[] = [];
	let skippedUnknownPlayer = 0;
	let skippedNoFixture = 0;

	for (const [playerIdRaw, raw] of Object.entries(rawStats)) {
		const playerId = Number(playerIdRaw);
		if (!Number.isFinite(playerId)) continue;

		const playerContext = playerContextMap.get(playerId);
		if (!playerContext) {
			skippedUnknownPlayer++;
			continue;
		}

		const squadId = inferSquadForRound(playerContext, round.id);
		const match = fixtureBySquad.get(squadId);
		if (!match) {
			skippedNoFixture++;
			continue;
		}

		const stats = raw as Record<string, number>;
		rows.push({
			season,
			roundId: round.id,
			playerId,
			squadId,
			matchId: match.id,
			matchType,
			matchDate: match.date ? new Date(match.date) : null,
			fantasyPoints: calculateFantasyPoints(stats),
			timeOnGround: getStat(stats, "TOG"),
			tries: getStat(stats, "T"),
			tryAssists: getStat(stats, "TA"),
			tackles: getStat(stats, "TCK"),
			missedTackles: getStat(stats, "MT"),
			metresGained: getStat(stats, "MG"),
			kickMetres: getStat(stats, "KM"),
			errors: getStat(stats, "ER"),
			offloads: (getStat(stats, "OFH") ?? 0) + (getStat(stats, "OFG") ?? 0),
			raw: stats,
		});
	}

	return {
		rows,
		skippedUnknownPlayer,
		skippedNoFixture,
	};
}

export async function runOfficialHistoryIncrementalSync(
	options: OfficialHistorySyncOptions = {},
): Promise<OfficialHistorySyncResult> {
	const startedAt = Date.now();
	const dryRun = options.dryRun ?? false;
	const lookbackRounds = Math.max(1, Math.trunc(options.lookbackRounds ?? 3));
	const reason = options.reason ?? "manual";
	const delayMs = Math.max(0, Math.trunc(options.delayMs ?? 0));

	const result: OfficialHistorySyncResult = {
		status: "failed",
		reason,
		lookbackRounds,
		targetRoundId: null,
		processedRoundIds: [],
		roundFetchFailures: 0,
		rowsBuilt: 0,
		rowsSkippedUnknownPlayer: 0,
		rowsSkippedNoFixture: 0,
		matchRowsAfterDedupe: 0,
		matchRowsSkippedByDedupe: 0,
		matchRowsDroppedNoMatchId: 0,
		matchRowsUpserted: 0,
		roundRowsAfterDedupe: 0,
		roundRowsSkippedByDedupe: 0,
		roundRowsUpserted: 0,
		roundStubsInserted: 0,
		roundStubsPlanned: 0,
		durationMs: 0,
	};

	try {
		const roundsList = await fetchUpstream<UpstreamRound[]>("rounds");
		const anchorRoundId = chooseAnchorRound(roundsList, options.targetRoundId);
		result.targetRoundId = anchorRoundId;

		if (!anchorRoundId) {
			result.status = "skipped_no_rounds";
			result.durationMs = Date.now() - startedAt;
			return result;
		}

		const targetRounds = selectTargetRounds(roundsList, lookbackRounds, anchorRoundId);
		if (targetRounds.length === 0) {
			result.status = "skipped_no_rounds";
			result.durationMs = Date.now() - startedAt;
			return result;
		}

		const [playerRows, existingRounds] = await Promise.all([
			db
				.select({
					playerId: players.playerId,
					squadId: players.squadId,
					originalSquadId: players.originalSquadId,
					transferRound: players.transferRound,
				})
				.from(players)
				.orderBy(asc(players.playerId)),
			db.select({ roundId: rounds.roundId }).from(rounds),
		]);
		const playerContextMap = new Map<number, PlayerRoundContext>(
			playerRows.map((row) => [
				row.playerId,
				{
					playerId: row.playerId,
					squadId: row.squadId,
					originalSquadId: row.originalSquadId ?? null,
					transferRound: row.transferRound ?? null,
				},
			]),
		);
		const knownRoundIds = new Set<number>(existingRounds.map((row) => row.roundId));

		let allRows: NormalizedStatRow[] = [];
		for (let i = 0; i < targetRounds.length; i++) {
			const round = targetRounds[i];
			result.processedRoundIds.push(round.id);
			try {
				const ensured = await ensureRoundExists(
					round.id,
					deriveSeason(round.start),
					knownRoundIds,
					dryRun,
					{ sourceTag: "official-round-stats-incremental" },
				);
				if (ensured === "inserted") result.roundStubsInserted++;
				if (ensured === "planned") result.roundStubsPlanned++;

				const rawStats = await fetchUpstreamPath<UpstreamMatchStats>(
					`stats/${round.id}.json`,
				);
				const built = buildRowsForRound(round, rawStats, playerContextMap);
				allRows = allRows.concat(built.rows);
				result.rowsBuilt += built.rows.length;
				result.rowsSkippedUnknownPlayer += built.skippedUnknownPlayer;
				result.rowsSkippedNoFixture += built.skippedNoFixture;
			} catch (error) {
				result.roundFetchFailures++;
				logger.warn(
					`[OfficialHistorySync] Round ${round.id} stats fetch/processing failed: ${error instanceof Error ? error.message : String(error)}`,
				);
			}

			if (delayMs > 0 && i < targetRounds.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
		}

		if (allRows.length === 0) {
			result.status =
				result.roundFetchFailures > 0 ? "partial" : "skipped_no_rows";
			result.durationMs = Date.now() - startedAt;
			return result;
		}

		const matchDedupe = dedupeBySeasonMatch(allRows);
		const roundDedupe = dedupeBySeasonRound(allRows);
		result.matchRowsAfterDedupe = matchDedupe.deduped.length;
		result.matchRowsSkippedByDedupe = matchDedupe.skipped;
		result.matchRowsDroppedNoMatchId = matchDedupe.droppedNoMatchId;
		result.roundRowsAfterDedupe = roundDedupe.deduped.length;
		result.roundRowsSkippedByDedupe = roundDedupe.skipped;

		const upsert = await upsertHistoryRows({
			matchRows: matchDedupe.deduped,
			roundRows: roundDedupe.deduped,
			dryRun,
		});
		result.matchRowsUpserted = upsert.matchRowsUpserted;
		result.roundRowsUpserted = upsert.roundRowsUpserted;

		result.status = result.roundFetchFailures > 0 ? "partial" : "success";
		result.durationMs = Date.now() - startedAt;
		logger.info(`[OfficialHistorySync] Summary: ${JSON.stringify(result)}`);
		return result;
	} catch (error) {
		result.status = "failed";
		result.durationMs = Date.now() - startedAt;
		logger.error(
			`[OfficialHistorySync] Sync failed: ${error instanceof Error ? error.message : String(error)}`,
		);
		return result;
	}
}
