import { eq } from "drizzle-orm";
import db from "@database/data-source";
import { playerCurrent, players } from "@database/schema";
import logger from "@src/logic/shared/utils/logger";
import { fetchUpstream, fetchUpstreamPath } from "@src/worker/upstream/client";
import type {
	UpstreamRound,
	UpstreamMatchStats,
} from "@src/worker/upstream/types";

function safeDivide(a: number | null, b: number | null): string | null {
	if (a == null || b == null || b === 0) return null;
	return (a / b).toFixed(4);
}

/** Base stats: TCK, MG, KM, G — the reliable weekly floor */
const BASE_STATS: Record<string, number> = {
	TCK: 1,
	G: 2,
};

function calculateBasePoints(stats: Record<string, number>): number {
	let pts = 0;
	for (const [key, multiplier] of Object.entries(BASE_STATS)) {
		pts += (stats[key] ?? 0) * multiplier;
	}
	pts += Math.floor((stats.MG ?? 0) / 10);
	pts += Math.floor((stats.KM ?? 0) / 30);
	return pts;
}

/**
 * Fetch per-round stats from upstream and compute base avg per player.
 * Returns a map of playerId → baseAvg (string for numeric column).
 */
async function computeBaseAverages(): Promise<Map<number, string>> {
	const baseMap = new Map<number, string>();

	try {
		const rounds = await fetchUpstream<UpstreamRound[]>("rounds");
		const playedRounds = rounds.filter(
			(r) => r.status === "complete" || r.status === "active",
		);

		if (playedRounds.length === 0) return baseMap;

		// playerId → total base points across rounds
		const playerBase = new Map<number, { total: number; games: number }>();

		for (const round of playedRounds) {
			try {
				const raw = await fetchUpstreamPath<UpstreamMatchStats>(
					`stats/${round.id}.json`,
				);

				for (const [idStr, stats] of Object.entries(raw)) {
					const playerId = Number(idStr);
					const basePts = calculateBasePoints(stats as Record<string, number>);
					const existing = playerBase.get(playerId);
					if (existing) {
						existing.total += basePts;
						existing.games += 1;
					} else {
						playerBase.set(playerId, { total: basePts, games: 1 });
					}
				}
			} catch {
				logger.warn(`Could not fetch stats for round ${round.id}`);
			}
		}

		for (const [playerId, data] of playerBase) {
			baseMap.set(playerId, (data.total / data.games).toFixed(2));
		}

		logger.info(
			`Computed base averages for ${baseMap.size} players from ${playedRounds.length} round(s)`,
		);
	} catch (err) {
		logger.warn("Failed to compute base averages from upstream", err);
	}

	return baseMap;
}

/**
 * Compute position ranks by sorting players within each position group
 * by seasonRank (ascending — lower rank = better).
 * Returns a map of playerId → { positionId: rank }.
 */
async function computePositionRanks(): Promise<
	Map<number, Record<string, number>>
> {
	const result = new Map<number, Record<string, number>>();

	const rows = await db
		.select({
			playerId: players.playerId,
			positions: players.positions,
			seasonRank: playerCurrent.seasonRank,
			avgPoints: playerCurrent.avgPoints,
		})
		.from(players)
		.innerJoin(playerCurrent, eq(players.playerId, playerCurrent.playerId));

	// Group players by position
	const byPosition = new Map<number, { playerId: number; avgPoints: number }[]>();
	for (const r of rows) {
		if (!r.positions) continue;
		const avg = r.avgPoints ? Number(r.avgPoints) : 0;
		for (const pos of r.positions) {
			let list = byPosition.get(pos);
			if (!list) {
				list = [];
				byPosition.set(pos, list);
			}
			list.push({ playerId: r.playerId, avgPoints: avg });
		}
	}

	// Sort each position group by avg points descending and assign rank
	for (const [posId, playerList] of byPosition) {
		playerList.sort((a, b) => b.avgPoints - a.avgPoints);
		for (let i = 0; i < playerList.length; i++) {
			const pid = playerList[i].playerId;
			let ranks = result.get(pid);
			if (!ranks) {
				ranks = {};
				result.set(pid, ranks);
			}
			ranks[String(posId)] = i + 1;
		}
	}

	logger.info(
		`Computed position ranks for ${result.size} players across ${byPosition.size} positions`,
	);
	return result;
}

export async function deriveMetrics(): Promise<number> {
	const [rows, baseAverages, positionRanks] = await Promise.all([
		db.query.playerCurrent.findMany({
			columns: {
				playerId: true,
				price: true,
				avgPoints: true,
				tog: true,
				last3Avg: true,
				last5Avg: true,
				last3TogAvg: true,
				last5TogAvg: true,
			},
		}),
		computeBaseAverages(),
		computePositionRanks(),
	]);

	let updated = 0;
	const CHUNK_SIZE = 50;

	for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
		const chunk = rows.slice(i, i + CHUNK_SIZE);

		await db.transaction(async (tx) => {
			for (const r of chunk) {
				const avgPts = r.avgPoints ? Number(r.avgPoints) : null;
				const tog = r.tog;
				const price = r.price;
				const l3Avg = r.last3Avg ? Number(r.last3Avg) : null;
				const l5Avg = r.last5Avg ? Number(r.last5Avg) : null;
				const l3Tog = r.last3TogAvg ? Number(r.last3TogAvg) : null;
				const l5Tog = r.last5TogAvg ? Number(r.last5TogAvg) : null;

				const ppmSeason = safeDivide(avgPts, tog);
				const ppmLast3 = safeDivide(l3Avg, l3Tog);
				const ppmLast5 = safeDivide(l5Avg, l5Tog);
				const valueScore =
					price > 0 && avgPts != null
						? (avgPts / (price / 100000)).toFixed(4)
						: null;
				const ppmValue =
					ppmSeason != null && price > 0
						? (Number(ppmSeason) / (price / 100000)).toFixed(4)
						: null;

				const baseAvg = baseAverages.get(r.playerId) ?? null;
				const posRanks = positionRanks.get(r.playerId) ?? null;

				await tx
					.update(playerCurrent)
					.set({
						ppmSeason,
						ppmLast3,
						ppmLast5,
						valueScore,
						ppmValue,
						baseAvg,
						positionRanks: posRanks as unknown as Record<string, unknown>,
						updatedAt: new Date(),
					})
					.where(eq(playerCurrent.playerId, r.playerId));

				updated++;
			}
		});
	}

	logger.info(`Derived metrics for ${updated} players`);
	return updated;
}
