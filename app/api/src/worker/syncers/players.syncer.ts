import db from "@database/data-source";
import { players, playerCurrent } from "@database/schema";
import logger from "@src/logic/shared/utils/logger";
import { fetchUpstream } from "../upstream/client";
import type { UpstreamPlayer } from "../upstream/types";
import { intToBool, toNumericStr } from "../utils/mappers";

export async function syncPlayers(season: number): Promise<number> {
	const data = await fetchUpstream<UpstreamPlayer[]>("players");

	let upserted = 0;
	const CHUNK_SIZE = 50;

	for (let i = 0; i < data.length; i += CHUNK_SIZE) {
		const chunk = data.slice(i, i + CHUNK_SIZE);

		await db.transaction(async (tx) => {
			for (const p of chunk) {
				const s = p.stats;

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
						originalSquadId: p.original_squad_id || null,
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
							originalSquadId: p.original_squad_id || null,
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

	logger.info(`Synced ${upserted} players (with playerCurrent)`);
	return upserted;
}
