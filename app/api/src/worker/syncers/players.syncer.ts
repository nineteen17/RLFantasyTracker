import db from "@database/data-source";
import { players, playerCurrent } from "@database/schema";
import logger from "@src/logic/shared/utils/logger";
import { fetchUpstream } from "../upstream/client";
import type { UpstreamPlayer } from "../upstream/types";
import { intToBool, toNumericStr } from "../utils/mappers";
import { offSeasonTransfers } from "./data/off-season-transfers";

export async function syncPlayers(season: number): Promise<number> {
	const data = await fetchUpstream<UpstreamPlayer[]>("players");

	// Pre-load existing player records for auto-detecting transfers.
	// If a player's squad changed and the API doesn't report original_squad_id,
	// we preserve the old DB squadId so wereTeammatesLastSeason works correctly.
	const existingRows = await db
		.select({
			playerId: players.playerId,
			squadId: players.squadId,
			originalSquadId: players.originalSquadId,
		})
		.from(players);

	const existingMap = new Map(
		existingRows.map((r) => [r.playerId, r]),
	);

	let upserted = 0;
	let autoDetected = 0;
	const CHUNK_SIZE = 50;

	for (let i = 0; i < data.length; i += CHUNK_SIZE) {
		const chunk = data.slice(i, i + CHUNK_SIZE);

		await db.transaction(async (tx) => {
			for (const p of chunk) {
				const s = p.stats;

				const resolvedOriginalSquadId = resolveOriginalSquadId(
					p,
					existingMap.get(p.id),
				);
				if (
					resolvedOriginalSquadId &&
					!p.original_squad_id &&
					!offSeasonTransfers[p.id] &&
					existingMap.has(p.id)
				) {
					autoDetected++;
				}

				await tx
					.insert(players)
					.values({
						playerId: p.id,
						firstName: p.first_name,
						lastName: p.last_name,
						fullName: `${p.first_name} ${p.last_name}`,
						squadId: p.squad_id,
						status: p.status,
						positions: p.positions,
						originalPositions:
							p.original_positions.length > 0
								? p.original_positions
								: null,
						originalSquadId: resolvedOriginalSquadId,
						transferRound: p.transfer_round,
						cost: p.cost,
						isBye: intToBool(p.is_bye),
						locked: intToBool(p.locked),
						active: true,
						raw: p as unknown as Record<string, unknown>,
					})
					.onConflictDoUpdate({
						target: players.playerId,
						set: {
							firstName: p.first_name,
							lastName: p.last_name,
							fullName: `${p.first_name} ${p.last_name}`,
							squadId: p.squad_id,
							status: p.status,
							positions: p.positions,
							originalPositions:
								p.original_positions.length > 0
									? p.original_positions
									: null,
							originalSquadId: resolvedOriginalSquadId,
							transferRound: p.transfer_round,
							cost: p.cost,
							isBye: intToBool(p.is_bye),
							locked: intToBool(p.locked),
							active: true,
							raw: p as unknown as Record<string, unknown>,
							updatedAt: new Date(),
						},
					});

				await tx
					.insert(playerCurrent)
					.values({
						playerId: p.id,
						season,
						price: p.cost,
						avgPoints: toNumericStr(s.avg_points),
						highScore: s.high_score,
						lowScore: s.low_score,
						last3Avg: toNumericStr(s.last_3_avg),
						last5Avg: toNumericStr(s.last_5_avg),
						gamesPlayed: s.games_played,
						totalPoints: s.total_points,
						seasonRank: s.season_rank,
						tog: s.tog,
						ownedBy: toNumericStr(s.owned_by),
						selections: s.selections,
						captainPct: toNumericStr(s.selections_info?.c),
						vcPct: toNumericStr(s.selections_info?.vc),
						benchPct: toNumericStr(s.selections_info?.bc),
						resPct: toNumericStr(s.selections_info?.res),
						adp: s.adp,
						projAvg: toNumericStr(s.proj_avg),
						wpr: toNumericStr(s.wpr),
						roundWpr: s.round_wpr as unknown as Record<
							string,
							unknown
						>,
						careerAvg: toNumericStr(s.career_avg),
						last3ProjAvg: toNumericStr(s.last_3_proj_avg),
						careerAvgVs: s.career_avg_vs as unknown as Record<
							string,
							unknown
						>,
						scores: s.scores as unknown as Record<string, unknown>,
					})
					.onConflictDoUpdate({
						target: playerCurrent.playerId,
						set: {
							season,
							price: p.cost,
							avgPoints: toNumericStr(s.avg_points),
							highScore: s.high_score,
							lowScore: s.low_score,
							last3Avg: toNumericStr(s.last_3_avg),
							last5Avg: toNumericStr(s.last_5_avg),
							gamesPlayed: s.games_played,
							totalPoints: s.total_points,
							seasonRank: s.season_rank,
							tog: s.tog,
							ownedBy: toNumericStr(s.owned_by),
							selections: s.selections,
							captainPct: toNumericStr(s.selections_info?.c),
							vcPct: toNumericStr(s.selections_info?.vc),
							benchPct: toNumericStr(s.selections_info?.bc),
							resPct: toNumericStr(s.selections_info?.res),
							adp: s.adp,
							projAvg: toNumericStr(s.proj_avg),
							wpr: toNumericStr(s.wpr),
							roundWpr: s.round_wpr as unknown as Record<
								string,
								unknown
							>,
							careerAvg: toNumericStr(s.career_avg),
							last3ProjAvg: toNumericStr(s.last_3_proj_avg),
							careerAvgVs: s.career_avg_vs as unknown as Record<
								string,
								unknown
							>,
							scores: s.scores as unknown as Record<string, unknown>,
							updatedAt: new Date(),
						},
					});

				upserted++;
			}
		});

		logger.debug(
			`Synced player chunk ${i + 1}-${Math.min(i + CHUNK_SIZE, data.length)} of ${data.length}`,
		);
	}

	if (autoDetected > 0) {
		logger.info(`Auto-detected ${autoDetected} transfers from squad changes`);
	}
	logger.info(`Synced ${upserted} players (with playerCurrent)`);
	return upserted;
}

/**
 * Resolve the correct originalSquadId for a player using a priority chain:
 * 1. API-provided value (mid-season transfers the API tracks)
 * 2. Auto-detected: player exists in DB with a different squadId
 * 3. Preserved: DB already has a valid originalSquadId from a prior sync
 * 4. Static map: known off-season transfers for bootstrapping
 */
function resolveOriginalSquadId(
	incoming: UpstreamPlayer,
	existing?: { squadId: number; originalSquadId: number | null },
): number | null {
	// 1. API knows about this transfer
	if (incoming.original_squad_id) return incoming.original_squad_id;

	// 2. Squad changed since last sync — auto-detect
	if (existing && existing.squadId !== incoming.squad_id) {
		return existing.squadId;
	}

	// 3. Preserve previously resolved value
	if (existing?.originalSquadId) return existing.originalSquadId;

	// 4. Static map fallback (for first-time DB bootstrap)
	return offSeasonTransfers[incoming.id] || null;
}
