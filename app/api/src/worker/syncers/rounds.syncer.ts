import db from "@database/data-source";
import { rounds, fixtures, venues } from "@database/schema";
import logger from "@src/logic/shared/utils/logger";
import type { UpstreamRound } from "../upstream/types";
import { intToBool, deriveSeason } from "../utils/mappers";

export async function syncRounds(
	data: UpstreamRound[],
): Promise<{ rounds: number; fixtures: number }> {
	let roundCount = 0;
	let fixtureCount = 0;

	// Collect all venue IDs from matches and upsert stubs for any missing ones
	const matchVenueIds = new Set<number>();
	for (const r of data) {
		for (const m of r.matches) {
			if (m.venue_id) matchVenueIds.add(m.venue_id);
		}
	}
	for (const venueId of matchVenueIds) {
		await db
			.insert(venues)
			.values({
				venueId,
				name: `Venue ${venueId}`,
			})
			.onConflictDoNothing();
	}

	for (const r of data) {
		const season = deriveSeason(r.start);
		const isBigBye = r.bye_squads.length > 2;

		await db
			.insert(rounds)
			.values({
				roundId: r.id,
				season,
				roundDisplay: `Round ${r.id}`,
				startAt: new Date(r.start),
				endAt: new Date(r.end),
				isByeRound: intToBool(r.is_bye),
				isBigByeRound: isBigBye,
				raw: r as unknown as Record<string, unknown>,
			})
			.onConflictDoUpdate({
				target: rounds.roundId,
				set: {
					season,
					roundDisplay: `Round ${r.id}`,
					startAt: new Date(r.start),
					endAt: new Date(r.end),
					isByeRound: intToBool(r.is_bye),
					isBigByeRound: isBigBye,
					raw: r as unknown as Record<string, unknown>,
					updatedAt: new Date(),
				},
			});
		roundCount++;

		for (const m of r.matches) {
			await db
				.insert(fixtures)
				.values({
					fixtureId: m.id,
					season,
					roundId: r.id,
					homeSquadId: m.home_squad_id,
					awaySquadId: m.away_squad_id,
					venueId: m.venue_id || null,
					kickoffAt: new Date(m.date),
				})
				.onConflictDoUpdate({
					target: fixtures.fixtureId,
					set: {
						season,
						roundId: r.id,
						homeSquadId: m.home_squad_id,
						awaySquadId: m.away_squad_id,
						venueId: m.venue_id || null,
						kickoffAt: new Date(m.date),
						updatedAt: new Date(),
					},
				});
			fixtureCount++;
		}
	}

	logger.info(`Synced ${roundCount} rounds, ${fixtureCount} fixtures`);
	return { rounds: roundCount, fixtures: fixtureCount };
}
