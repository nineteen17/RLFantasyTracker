import { eq, or, and, asc } from "drizzle-orm";
import db from "@database/data-source";
import { squads, players, fixtures } from "@database/schema";

export async function findAllSquads() {
	return db.query.squads.findMany({
		columns: {
			squadId: true,
			name: true,
			fullName: true,
			shortName: true,
			avatarVersion: true,
		},
		orderBy: [asc(squads.name)],
	});
}

export async function findSquadById(squadId: number) {
	return db.query.squads.findFirst({
		where: eq(squads.squadId, squadId),
		columns: {
			squadId: true,
			name: true,
			fullName: true,
			shortName: true,
			avatarVersion: true,
		},
	});
}

export async function findRosterBySquadId(squadId: number) {
	return db.query.players.findMany({
		where: eq(players.squadId, squadId),
		columns: {
			playerId: true,
			firstName: true,
			lastName: true,
			fullName: true,
			status: true,
			positions: true,
			cost: true,
			isBye: true,
			locked: true,
		},
		with: {
			current: {
				columns: {
					avgPoints: true,
					totalPoints: true,
					gamesPlayed: true,
					ownedBy: true,
					valueScore: true,
					ppmSeason: true,
					baseAvg: true,
					projAvg: true,
					breakEvens: true,
					seasonRank: true,
				},
			},
		},
		orderBy: [asc(players.fullName)],
	});
}

export async function findFixturesBySquadId(squadId: number, season: number) {
	return db.query.fixtures.findMany({
		where: and(
			eq(fixtures.season, season),
			or(
				eq(fixtures.homeSquadId, squadId),
				eq(fixtures.awaySquadId, squadId),
			),
		),
		columns: {
			fixtureId: true,
			roundId: true,
			homeSquadId: true,
			awaySquadId: true,
			venueId: true,
			kickoffAt: true,
		},
		with: {
			homeSquad: { columns: { squadId: true, name: true, shortName: true } },
			awaySquad: { columns: { squadId: true, name: true, shortName: true } },
			venue: { columns: { venueId: true, name: true } },
		},
		orderBy: [asc(fixtures.roundId)],
	});
}
