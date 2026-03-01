import {
	eq,
	and,
	or,
	ilike,
	arrayContains,
	asc,
	desc,
	count,
	type SQL,
} from "drizzle-orm";
import db from "@database/data-source";
import {
	players,
	playerCurrent,
	squads,
	fixtures,
} from "@database/schema";
import type { SearchQuery } from "./players.schema";

const SORT_COLUMNS = {
	avg_points: playerCurrent.avgPoints,
	price: playerCurrent.price,
	owned_by: playerCurrent.ownedBy,
	value_score: playerCurrent.valueScore,
	ppm_season: playerCurrent.ppmSeason,
} as const;

export async function searchPlayers(query: SearchQuery) {
	const conditions: SQL[] = [];

	if (query.q) {
		conditions.push(ilike(players.fullName, `%${query.q}%`));
	}
	if (query.squad_id) {
		conditions.push(eq(players.squadId, query.squad_id));
	}
	if (query.position) {
		conditions.push(arrayContains(players.positions, [query.position]));
	}
	if (query.status) {
		conditions.push(eq(players.status, query.status));
	}

	const where = conditions.length > 0 ? and(...conditions) : undefined;
	const sortCol = SORT_COLUMNS[query.sort as keyof typeof SORT_COLUMNS];
	const orderBy = query.order === "asc" ? asc(sortCol) : desc(sortCol);

	const [data, totalResult] = await Promise.all([
		db
			.select({
				playerId: players.playerId,
				firstName: players.firstName,
				lastName: players.lastName,
				fullName: players.fullName,
				squadId: players.squadId,
				status: players.status,
				positions: players.positions,
				cost: players.cost,
				isBye: players.isBye,
				locked: players.locked,
				squadName: squads.name,
				squadShortName: squads.shortName,
				avgPoints: playerCurrent.avgPoints,
				totalPoints: playerCurrent.totalPoints,
				gamesPlayed: playerCurrent.gamesPlayed,
				ownedBy: playerCurrent.ownedBy,
				valueScore: playerCurrent.valueScore,
				ppmSeason: playerCurrent.ppmSeason,
				projAvg: playerCurrent.projAvg,
				breakEvens: playerCurrent.breakEvens,
				seasonRank: playerCurrent.seasonRank,
				currentPrice: playerCurrent.price,
			})
			.from(players)
			.leftJoin(playerCurrent, eq(players.playerId, playerCurrent.playerId))
			.leftJoin(squads, eq(players.squadId, squads.squadId))
			.where(where)
			.orderBy(orderBy)
			.limit(query.limit)
			.offset(query.offset),
		db
			.select({ total: count() })
			.from(players)
			.where(where),
	]);

	return {
		data,
		total: totalResult[0]?.total ?? 0,
		limit: query.limit,
		offset: query.offset,
	};
}

export async function findPlayerById(playerId: number) {
	return db.query.players.findFirst({
		where: eq(players.playerId, playerId),
		columns: {
			playerId: true,
			firstName: true,
			lastName: true,
			fullName: true,
			squadId: true,
			status: true,
			positions: true,
			originalPositions: true,
			originalSquadId: true,
			transferRound: true,
			cost: true,
			isBye: true,
			locked: true,
		},
		with: {
			squad: {
				columns: { squadId: true, name: true, fullName: true, shortName: true },
			},
			current: true,
		},
	});
}

export async function findFixturesForPlayer(squadId: number, season: number) {
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
