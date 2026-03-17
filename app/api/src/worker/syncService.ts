import logger from "@src/logic/shared/utils/logger";
import { syncSquads } from "./syncers/squads.syncer";
import { syncVenues } from "./syncers/venues.syncer";
import { syncRounds } from "./syncers/rounds.syncer";
import { syncPlayers } from "./syncers/players.syncer";
import { syncCoach } from "./syncers/coach.syncer";
import { deriveMetrics } from "./syncers/derive.syncer";
import { syncCasualtyWard } from "./syncers/casualty.syncer";
import { syncTeamListsForRound } from "./syncers/team-lists.syncer";
import { deriveSeason } from "./utils/mappers";
import { fetchUpstream } from "./upstream/client";
import type { UpstreamRound } from "./upstream/types";

export interface SyncResult {
	squads: number;
	venues: number;
	rounds: number;
	fixtures: number;
	players: number;
	coach: number;
	casualties: number;
	teamLists: number;
	derived: number;
	durationMs: number;
}

export interface LightSyncResult {
	players: number;
	coach: number;
	durationMs: number;
}

/**
 * Light sync: only players.json + coach/players.json.
 * Fast — gets latest scores, ownership, break evens.
 */
export async function runLightSync(): Promise<LightSyncResult> {
	const start = Date.now();
	logger.info("=== Light Sync Started ===");

	const roundsData = await fetchUpstream<UpstreamRound[]>("rounds");
	const season =
		roundsData.length > 0
			? deriveSeason(roundsData[0].start)
			: new Date().getFullYear();

	const playersCount = await syncPlayers(season);
	const coachCount = await syncCoach();

	const durationMs = Date.now() - start;

	logger.info(`=== Light Sync Complete in ${durationMs}ms ===`);
	logger.info(`Results: players=${playersCount}, coach=${coachCount}`);

	return { players: playersCount, coach: coachCount, durationMs };
}

export async function runFullSync(): Promise<SyncResult> {
	const start = Date.now();
	logger.info("=== Full Sync Started ===");

	// Phase 1: Squads + venues (parallel, no FK deps) + fetch rounds data
	const [squadsCount, venuesCount, roundsData, casualtiesCount] =
		await Promise.all([
		syncSquads(),
		syncVenues(),
		fetchUpstream<UpstreamRound[]>("rounds"),
		syncCasualtyWard().catch((error) => {
			logger.warn(
				`Casualty ward fetch failed during full sync: ${error instanceof Error ? error.message : String(error)}`,
			);
			return 0;
		}),
	]);

	// Derive season from first round's start date
	const season =
		roundsData.length > 0
			? deriveSeason(roundsData[0].start)
			: new Date().getFullYear();

	// Phase 2: Rounds + fixtures (depends on squads/venues FKs)
	const roundsResult = await syncRounds(roundsData);

	// Phase 2b: Team lists for active/scheduled round (best-effort)
	let teamListsCount = 0;
	try {
		const targetRound =
			roundsData.find((r) => r.status === "active") ??
			roundsData.find((r) => r.status === "scheduled");
		if (targetRound) {
			teamListsCount = await syncTeamListsForRound({
				roundId: targetRound.id,
				season: deriveSeason(targetRound.start),
			});
		}
	} catch (error) {
		logger.warn(
			`Team-list sync failed during full sync: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	// Phase 3: Players + playerCurrent (depends on squads FK)
	const playersCount = await syncPlayers(season);

	// Phase 4: Coach data → enriches playerCurrent
	const coachCount = await syncCoach();

	// Phase 5: Derive metrics (PPM, value scores)
	const derivedCount = await deriveMetrics();

	const durationMs = Date.now() - start;

	const result: SyncResult = {
		squads: squadsCount,
		venues: venuesCount,
		rounds: roundsResult.rounds,
		fixtures: roundsResult.fixtures,
		players: playersCount,
		coach: coachCount,
		casualties: casualtiesCount,
		teamLists: teamListsCount,
		derived: derivedCount,
		durationMs,
	};

	logger.info(`=== Full Sync Complete in ${durationMs}ms ===`);
	logger.info(`Results: ${JSON.stringify(result)}`);

	return result;
}
