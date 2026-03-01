import db from "@database/data-source";
import { squads } from "@database/schema";
import logger from "@src/logic/shared/utils/logger";
import { fetchUpstream } from "../upstream/client";
import type { UpstreamSquad } from "../upstream/types";

export async function syncSquads(): Promise<number> {
	const data = await fetchUpstream<UpstreamSquad[]>("squads");

	for (const s of data) {
		await db
			.insert(squads)
			.values({
				squadId: s.id,
				fullName: s.full_name,
				name: s.name,
				shortName: s.short_name,
				avatarVersion: s.avatar_version,
			})
			.onConflictDoUpdate({
				target: squads.squadId,
				set: {
					fullName: s.full_name,
					name: s.name,
					shortName: s.short_name,
					avatarVersion: s.avatar_version,
					updatedAt: new Date(),
				},
			});
	}

	logger.info(`Synced ${data.length} squads`);
	return data.length;
}
