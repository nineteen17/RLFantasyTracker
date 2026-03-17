import { and, eq, inArray, not } from "drizzle-orm";
import db from "@database/data-source";
import { casualtyWard } from "@database/schema";
import logger from "@src/logic/shared/utils/logger";
import { fetchCasualtyWard } from "../upstream/client";

/**
 * Fetches latest casualty ward data from nrl.com and upserts it into DB.
 */
export async function syncCasualtyWard(): Promise<number> {
	const data = await fetchCasualtyWard();
	const competitionId = data.selectedCompetitionId ?? 111;
	const casualties = Array.isArray(data.casualties) ? data.casualties : [];
	const now = new Date();

	const normalized = casualties
		.map((entry) => ({
			competitionId,
			playerUrl: entry.url?.trim() ?? "",
			firstName: entry.firstName ?? "",
			lastName: entry.lastName ?? "",
			teamNickname: entry.teamNickname ?? "",
			injury: entry.injury ?? "",
			expectedReturn: entry.expectedReturn ?? "",
			imageUrl: entry.imageUrl ?? null,
			raw: entry as unknown as Record<string, unknown>,
			sourceUpdatedAt: now,
		}))
		.filter((entry) => entry.playerUrl.length > 0);

	await db.transaction(async (tx) => {
		for (const entry of normalized) {
			await tx
				.insert(casualtyWard)
				.values(entry)
				.onConflictDoUpdate({
					target: [casualtyWard.competitionId, casualtyWard.playerUrl],
					set: {
						firstName: entry.firstName,
						lastName: entry.lastName,
						teamNickname: entry.teamNickname,
						injury: entry.injury,
						expectedReturn: entry.expectedReturn,
						imageUrl: entry.imageUrl,
						raw: entry.raw,
						sourceUpdatedAt: now,
						updatedAt: now,
					},
				});
		}

		const currentUrls = normalized.map((entry) => entry.playerUrl);
		if (currentUrls.length === 0) {
			await tx
				.delete(casualtyWard)
				.where(eq(casualtyWard.competitionId, competitionId));
			return;
		}

		await tx
			.delete(casualtyWard)
			.where(
				and(
					eq(casualtyWard.competitionId, competitionId),
					not(inArray(casualtyWard.playerUrl, currentUrls)),
				),
			);
	});

	logger.info(`Synced casualty ward feed (${normalized.length} entries)`);
	return normalized.length;
}
