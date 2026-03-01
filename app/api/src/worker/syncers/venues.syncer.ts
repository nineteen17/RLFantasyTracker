import db from "@database/data-source";
import { venues } from "@database/schema";
import logger from "@src/logic/shared/utils/logger";
import { fetchUpstream } from "../upstream/client";
import type { UpstreamVenue } from "../upstream/types";

export async function syncVenues(): Promise<number> {
	const data = await fetchUpstream<UpstreamVenue[]>("venues");

	for (const v of data) {
		await db
			.insert(venues)
			.values({
				venueId: v.id,
				name: v.name,
				shortName: v.short_name,
				timezone: v.timezone,
			})
			.onConflictDoUpdate({
				target: venues.venueId,
				set: {
					name: v.name,
					shortName: v.short_name,
					timezone: v.timezone,
					updatedAt: new Date(),
				},
			});
	}

	logger.info(`Synced ${data.length} venues`);
	return data.length;
}
