import { eq, or, and, asc } from "drizzle-orm";
import db from "@database/data-source";
import { squads, players, fixtures, rounds } from "@database/schema";

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

function parseByeSquadsFromRaw(raw: unknown): number[] {
	if (!raw || typeof raw !== "object") return [];
	const maybeByeSquads = (raw as { bye_squads?: unknown }).bye_squads;
	if (!Array.isArray(maybeByeSquads)) return [];
	return maybeByeSquads.filter((id): id is number => Number.isInteger(id));
}

export async function findByeRoundsBySquad(squadId: number, season: number) {
	const [seasonRounds, squadFixtures] = await Promise.all([
		db.query.rounds.findMany({
			where: eq(rounds.season, season),
			columns: {
				roundId: true,
				isByeRound: true,
				raw: true,
			},
			orderBy: [asc(rounds.roundId)],
		}),
		db.query.fixtures.findMany({
			where: and(
				eq(fixtures.season, season),
				or(
					eq(fixtures.homeSquadId, squadId),
					eq(fixtures.awaySquadId, squadId),
				),
			),
			columns: {
				roundId: true,
			},
		}),
	]);

	const fixtureRoundIds = new Set<number>(squadFixtures.map((fixture) => fixture.roundId));

	return seasonRounds
		.filter((round) => {
			const byeSquads = parseByeSquadsFromRaw(round.raw);
			if (byeSquads.includes(squadId)) return true;
			return round.isByeRound && !fixtureRoundIds.has(round.roundId);
		})
		.map((round) => round.roundId);
}

function isFinalRound(raw: unknown): boolean {
	if (!raw || typeof raw !== "object") return false;
	const isFinalValue = (raw as { is_final?: unknown }).is_final;
	if (typeof isFinalValue === "number") return isFinalValue === 1;
	if (typeof isFinalValue === "string") {
		const normalized = isFinalValue.trim();
		return normalized === "1" || normalized.toLowerCase() === "true";
	}
	if (typeof isFinalValue === "boolean") return isFinalValue;
	return false;
}

function getRoundStatus(raw: unknown): string | null {
	if (!raw || typeof raw !== "object") return null;
	const statusValue = (raw as { status?: unknown }).status;
	return typeof statusValue === "string" ? statusValue : null;
}

export async function findByePlanner(season: number) {
	const [allSquads, seasonRounds, seasonFixtures] = await Promise.all([
		findAllSquads(),
		db.query.rounds.findMany({
			where: eq(rounds.season, season),
			columns: {
				roundId: true,
				raw: true,
			},
			orderBy: [asc(rounds.roundId)],
		}),
		db.query.fixtures.findMany({
			where: eq(fixtures.season, season),
			columns: {
				roundId: true,
				homeSquadId: true,
				awaySquadId: true,
			},
		}),
	]);

	const roundsWithFixtures = new Set<number>(
		seasonFixtures.map((fixture) => fixture.roundId),
	);

	const regularRounds = seasonRounds
		.filter((round) => !isFinalRound(round.raw))
		.map((round) => round.roundId)
		.filter((roundId) => roundsWithFixtures.has(roundId));

	const orderedRounds =
		regularRounds.length > 0
			? regularRounds
			: [...roundsWithFixtures].sort((a, b) => a - b);

	const roundStatusById = new Map<number, string | null>(
		seasonRounds.map((round) => [round.roundId, getRoundStatus(round.raw)]),
	);
	const activeRoundId = orderedRounds.find(
		(roundId) => roundStatusById.get(roundId) === "active",
	);
	const scheduledRoundId = orderedRounds.find(
		(roundId) => roundStatusById.get(roundId) === "scheduled",
	);
	const referenceRoundId =
		activeRoundId ?? scheduledRoundId ?? Number.POSITIVE_INFINITY;

	const playedRoundsBySquad = new Map<number, Set<number>>();
	for (const squad of allSquads) {
		playedRoundsBySquad.set(squad.squadId, new Set<number>());
	}
	for (const fixture of seasonFixtures) {
		playedRoundsBySquad.get(fixture.homeSquadId)?.add(fixture.roundId);
		playedRoundsBySquad.get(fixture.awaySquadId)?.add(fixture.roundId);
	}

	const teams = allSquads
		.map((squad) => {
			const playedRounds = playedRoundsBySquad.get(squad.squadId) ?? new Set<number>();
			const byeRounds = orderedRounds.filter((roundId) => !playedRounds.has(roundId));
			const nextByeRound =
				byeRounds.find((roundId) => roundId >= referenceRoundId) ?? null;
			return {
				squadId: squad.squadId,
				name: squad.name,
				fullName: squad.fullName,
				shortName: squad.shortName,
				byeRounds,
				nextByeRound,
			};
		})
		.sort((a, b) => {
			const aNext = a.nextByeRound ?? Number.POSITIVE_INFINITY;
			const bNext = b.nextByeRound ?? Number.POSITIVE_INFINITY;
			if (aNext !== bNext) return aNext - bNext;
			return a.name.localeCompare(b.name);
		});

	return {
		season,
		rounds: orderedRounds,
		teams,
	};
}
