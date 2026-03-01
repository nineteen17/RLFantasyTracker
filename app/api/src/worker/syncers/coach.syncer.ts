import { eq } from "drizzle-orm";
import db from "@database/data-source";
import { playerCurrent } from "@database/schema";
import logger from "@src/logic/shared/utils/logger";
import { fetchCoachPlayers } from "../upstream/client";
import { toNumericStr } from "../utils/mappers";

export async function syncCoach(): Promise<number> {
	const data = await fetchCoachPlayers();
	const entries = Object.entries(data);

	let updated = 0;
	const CHUNK_SIZE = 50;

	for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
		const chunk = entries.slice(i, i + CHUNK_SIZE);

		await db.transaction(async (tx) => {
			for (const [playerIdStr, c] of chunk) {
				const playerId = Number(playerIdStr);

				await tx
					.update(playerCurrent)
					.set({
						breakEvens: c.break_evens as unknown as Record<string, unknown>,
						bePct: c.be_pct as unknown as Record<string, unknown>,
						projPrices: c.proj_prices as unknown as Record<string, unknown>,
						projScores: c.proj_scores as unknown as Record<string, unknown>,
						consistency: toNumericStr(c.consistency),
						in20Avg: toNumericStr(c.in_20_avg),
						out20Avg: toNumericStr(c.out_20_avg),
						last3ProjAvg: toNumericStr(c.last_3_proj_avg),
						last3TogAvg: toNumericStr(c.last_3_tog_avg),
						last5TogAvg: toNumericStr(c.last_5_tog_avg),
						draftOwnedBy: toNumericStr(c.draft_owned_by),
						draftOwnedByChange: toNumericStr(c.draft_owned_by_change),
						draftSelections: c.draft_selections,
						opponents: c.opponents as unknown as Record<string, unknown>,
						venuesSplit: c.venues as unknown as Record<string, unknown>,
						lastSeasonScores: c.last_season_scores as unknown as Record<string, unknown>,
						transfers: c.transfers as Record<string, unknown>,
						updatedAt: new Date(),
					})
					.where(eq(playerCurrent.playerId, playerId));

				updated++;
			}
		});

		logger.debug(
			`Synced coach chunk ${i + 1}-${Math.min(i + CHUNK_SIZE, entries.length)} of ${entries.length}`,
		);
	}

	logger.info(`Synced coach data for ${updated} players`);
	return updated;
}
