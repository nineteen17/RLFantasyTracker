import { eq } from "drizzle-orm";
import db from "@database/data-source";
import { playerCurrent } from "@database/schema";
import logger from "@src/logic/shared/utils/logger";

function safeDivide(a: number | null, b: number | null): string | null {
	if (a == null || b == null || b === 0) return null;
	return (a / b).toFixed(4);
}

export async function deriveMetrics(): Promise<number> {
	const rows = await db.query.playerCurrent.findMany({
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
	});

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
				const valueScore = price > 0 && avgPts != null
					? (avgPts / (price / 100000)).toFixed(4)
					: null;
				const ppmValue = ppmSeason != null && price > 0
					? (Number(ppmSeason) / (price / 100000)).toFixed(4)
					: null;

				await tx
					.update(playerCurrent)
					.set({
						ppmSeason,
						ppmLast3,
						ppmLast5,
						valueScore,
						ppmValue,
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
