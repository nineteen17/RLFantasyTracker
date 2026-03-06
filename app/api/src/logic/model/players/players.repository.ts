import {
	eq,
	and,
	or,
	ne,
	inArray,
	ilike,
	arrayContains,
	asc,
	count,
	sql,
	type SQL,
} from "drizzle-orm";
import db from "@database/data-source";
import {
	players,
	playerCurrent,
	playerMatchStatsHistory,
	squads,
	fixtures,
	rounds,
} from "@database/schema";
import { calculateFantasyPoints } from "@src/logic/shared/constants/scoring";
import type { PlayerHistoryResponse, PlayerMatchRawStats } from "@nrl/types";
import type { SearchQuery } from "./players.schema";

const OFFICIAL_MATCH_TYPES = ["nrl", "finals"] as const;
const OFFICIAL_MATCH_TYPE_SET = new Set<string>(OFFICIAL_MATCH_TYPES);
const PRESEASON_MATCH_TYPES = [
	"pre-season-trial",
	"world-club-challenge",
	"allstar",
] as const;
const PRESEASON_MATCH_TYPE_SET = new Set<string>(PRESEASON_MATCH_TYPES);
const PRESEASON_MATCH_KEYWORDS = [
	"pre-season",
	"preseason",
	"trial",
	"allstar",
	"all-star",
	"world-club",
] as const;
const OFFICIAL_MATCH_KEYWORDS = ["nrl", "final"] as const;

const NEXT_BREAK_EVEN_SQL = sql<number>`
	(
		${playerCurrent.breakEvens} ->> (
			SELECT key
			FROM jsonb_object_keys(${playerCurrent.breakEvens}) AS key
			ORDER BY key::int
			LIMIT 1
		)
	)::numeric
`;

const SORT_COLUMNS = {
	avg_points: playerCurrent.avgPoints,
	price: playerCurrent.price,
	owned_by: playerCurrent.ownedBy,
	ppm_season: playerCurrent.ppmSeason,
	base_avg: playerCurrent.baseAvg,
	break_evens: NEXT_BREAK_EVEN_SQL,
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
	const direction = query.order === "asc" ? sql`ASC` : sql`DESC`;
	const orderBy = sql`${sortCol} ${direction} NULLS LAST`;

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
				baseAvg: playerCurrent.baseAvg,
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

function toInt(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number.parseInt(value, 10);
		return Number.isNaN(parsed) ? null : parsed;
	}
	return null;
}

function pickInt(raw: Record<string, unknown>, ...keys: string[]): number | null {
	for (const key of keys) {
		const val = toInt(raw[key]);
		if (val != null) return val;
	}
	return null;
}

function canonicalizePosition(rawValue: unknown): string | null {
	if (typeof rawValue !== "string") return null;
	const normalized = rawValue.trim().toLowerCase();
	if (!normalized) return null;

	switch (normalized) {
		case "fullback":
			return "Fullback";
		case "winger":
		case "wing":
			return "Wing";
		case "centre":
		case "center":
			return "Centre";
		case "five-eighth":
		case "five eighth":
		case "5/8":
			return "Five-Eighth";
		case "halfback":
			return "Halfback";
		case "hooker":
			return "Hooker";
		case "prop":
			return "Prop";
		case "2nd row":
		case "second row":
			return "2nd Row";
		case "lock":
			return "Lock";
		case "interchange":
			return "Interchange";
		case "replacement":
			return "Replacement";
		case "reserve":
			return "Reserve";
		default:
			return rawValue.trim() || null;
	}
}

function positionFromJersey(jerseyNumber: number | null): string | null {
	if (jerseyNumber == null) return null;
	switch (jerseyNumber) {
		case 1:
			return "Fullback";
		case 2:
		case 5:
			return "Wing";
		case 3:
		case 4:
			return "Centre";
		case 6:
			return "Five-Eighth";
		case 7:
			return "Halfback";
		case 8:
		case 10:
			return "Prop";
		case 9:
			return "Hooker";
		case 11:
		case 12:
			return "2nd Row";
		case 13:
			return "Lock";
		default:
			if (jerseyNumber >= 14 && jerseyNumber <= 17) return "Interchange";
			if (jerseyNumber >= 18) return "Reserve";
			return null;
	}
}

function deriveHistoricalRole(raw: Record<string, unknown>): {
	positionMatch: string | null;
	jerseyNumber: number | null;
	derivedPosition: string | null;
	isStarter: boolean | null;
} {
	const positionMatch = canonicalizePosition(raw.position_match);
	const jerseyNumber = pickInt(raw, "number");
	const derivedPosition = positionMatch ?? positionFromJersey(jerseyNumber);
	const isBenchRole =
		derivedPosition === "Interchange" ||
		derivedPosition === "Replacement" ||
		derivedPosition === "Reserve";

	let isStarter: boolean | null = null;
	if (jerseyNumber != null) {
		if (jerseyNumber >= 1 && jerseyNumber <= 13) {
			isStarter = true;
		} else if (jerseyNumber >= 14) {
			isStarter = false;
		}
	}

	// Bench-tagged roles are always treated as non-starters, even if jersey is noisy.
	if (isBenchRole) {
		isStarter = false;
	}

	return {
		positionMatch,
		jerseyNumber,
		derivedPosition,
		isStarter,
	};
}

function normalizeMatchStats(raw: Record<string, unknown>, row: {
	tries: number | null;
	tryAssists: number | null;
	tackles: number | null;
	missedTackles: number | null;
	metresGained: number | null;
	kickMetres: number | null;
	errors: number | null;
	timeOnGround: number | null;
}): PlayerMatchRawStats {
	return {
		T: row.tries ?? pickInt(raw, "tries", "T") ?? 0,
		TS: pickInt(raw, "try_saves", "TS") ?? 0,
		G: pickInt(raw, "goals", "G") ?? 0,
		FG: pickInt(raw, "field_goals", "FG") ?? 0,
		TA: row.tryAssists ?? pickInt(raw, "try_assists", "TA") ?? 0,
		LB: pickInt(raw, "line_breaks", "LB") ?? 0,
		LBA: pickInt(raw, "line_break_assists", "LBA") ?? 0,
		TCK: row.tackles ?? pickInt(raw, "tackles", "TCK") ?? 0,
		TB: pickInt(raw, "tackle_breaks", "TB") ?? 0,
		MT: row.missedTackles ?? pickInt(raw, "missed_tackles", "MT") ?? 0,
		OFH: pickInt(raw, "off_half", "ofh", "OFH") ?? 0,
		OFG: pickInt(raw, "off_game", "ofg", "OFG") ?? 0,
		ER: row.errors ?? pickInt(raw, "errors", "ER") ?? 0,
		FTF: pickInt(raw, "free_tries", "ftf", "FTF") ?? 0,
		MG: row.metresGained ?? pickInt(raw, "metres_gained", "MG") ?? 0,
		KM: row.kickMetres ?? pickInt(raw, "kick_metres", "KM") ?? 0,
		KD: pickInt(raw, "kick_defusals", "KD") ?? 0,
		PC: pickInt(raw, "penalties_conceded", "PC") ?? 0,
		SB: pickInt(raw, "sin_bin", "SB") ?? 0,
		SO: pickInt(raw, "send_off", "SO") ?? 0,
		TOG: row.timeOnGround ?? pickInt(raw, "time_on_ground", "TOG") ?? 0,
		FDO: pickInt(raw, "forced_drop_out", "FDO") ?? 0,
		TO: pickInt(raw, "forced_turn_over", "TO") ?? 0,
		SAI: pickInt(raw, "sai", "SAI") ?? 0,
		EFIG: pickInt(raw, "efig", "EFIG") ?? 0,
	};
}

function normalizeMatchTypeValue(value: string): string {
	return value.trim().toLowerCase();
}

function classifyMatchType(value: string): "official" | "preseason" | "other" {
	const normalized = normalizeMatchTypeValue(value);
	if (!normalized) return "other";

	if (OFFICIAL_MATCH_TYPE_SET.has(normalized)) return "official";
	if (PRESEASON_MATCH_TYPE_SET.has(normalized)) return "preseason";

	if (PRESEASON_MATCH_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
		return "preseason";
	}
	if (OFFICIAL_MATCH_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
		return "official";
	}

	return "other";
}

function shouldIncludeHistoryMatchType(
	matchType: string,
	includePreseason: boolean,
): boolean {
	const category = classifyMatchType(matchType);
	if (includePreseason) {
		return category === "official" || category === "preseason";
	}
	return category === "official";
}

export async function findPlayerHistoryById(
	playerId: number,
	includePreseason = false,
): Promise<PlayerHistoryResponse> {
	const rows = await db
		.select({
			season: playerMatchStatsHistory.season,
			roundId: playerMatchStatsHistory.roundId,
			matchId: playerMatchStatsHistory.matchId,
			squadId: playerMatchStatsHistory.squadId,
			matchType: playerMatchStatsHistory.matchType,
			matchDate: playerMatchStatsHistory.matchDate,
			fantasyPoints: playerMatchStatsHistory.fantasyPoints,
			timeOnGround: playerMatchStatsHistory.timeOnGround,
			tries: playerMatchStatsHistory.tries,
			tryAssists: playerMatchStatsHistory.tryAssists,
			tackles: playerMatchStatsHistory.tackles,
			missedTackles: playerMatchStatsHistory.missedTackles,
			metresGained: playerMatchStatsHistory.metresGained,
			kickMetres: playerMatchStatsHistory.kickMetres,
			errors: playerMatchStatsHistory.errors,
			raw: playerMatchStatsHistory.raw,
		})
		.from(playerMatchStatsHistory)
		.where(eq(playerMatchStatsHistory.playerId, playerId))
		.orderBy(
			asc(playerMatchStatsHistory.season),
			asc(playerMatchStatsHistory.roundId),
			asc(playerMatchStatsHistory.matchId),
		);

	const filteredRows = rows.filter((row) =>
		shouldIncludeHistoryMatchType(row.matchType, includePreseason),
	);
	const currentSeason =
		filteredRows.length > 0 ? Math.max(...filteredRows.map((r) => r.season)) : null;

	const matches = filteredRows.map((row) => {
		const raw = (row.raw ?? {}) as Record<string, unknown>;
		const stats = normalizeMatchStats(raw, row);
		const fantasyPoints = row.fantasyPoints ?? calculateFantasyPoints(stats);
		const role = deriveHistoricalRole(raw);

		return {
			season: row.season,
			roundId: row.roundId,
			matchId: row.matchId,
			matchType: normalizeMatchTypeValue(row.matchType),
			matchDate: row.matchDate ? row.matchDate.toISOString() : null,
			squadId: row.squadId,
			positionMatch: role.positionMatch,
			jerseyNumber: role.jerseyNumber,
			derivedPosition: role.derivedPosition,
			isStarter: role.isStarter,
			fantasyPoints,
			stats,
		};
	});

	return {
		playerId,
		currentSeason,
		matches,
	};
}

type ScoresMap = Record<string, number>;

interface PeriodResult {
	gamesWith: number;
	gamesWithout: number;
	avgWith: number;
	avgWithout: number | null;
	delta: number | null;
}

function computePeriod(
	playerScores: ScoresMap,
	teammateScores: ScoresMap,
	eligibleRounds: Set<string>,
): PeriodResult | null {
	const withRounds: number[] = [];
	const withoutRounds: number[] = [];

	for (const round of eligibleRounds) {
		const playerPts = playerScores[round];
		if (playerPts == null) continue;

		if (teammateScores[round] != null) {
			withRounds.push(playerPts);
		} else {
			withoutRounds.push(playerPts);
		}
	}

	if (withRounds.length === 0) return null;

	const avgWith = withRounds.reduce((a, b) => a + b, 0) / withRounds.length;
	const avgWithout =
		withoutRounds.length > 0
			? withoutRounds.reduce((a, b) => a + b, 0) / withoutRounds.length
			: null;
	const delta = avgWithout != null ? avgWith - avgWithout : null;

	return {
		gamesWith: withRounds.length,
		gamesWithout: withoutRounds.length,
		avgWith: Math.round(avgWith * 100) / 100,
		avgWithout: avgWithout != null ? Math.round(avgWithout * 100) / 100 : null,
		delta: delta != null ? Math.round(delta * 100) / 100 : null,
	};
}

function avgFromScores(scores: ScoresMap, rounds?: Set<string>): number | null {
	const values = rounds
		? [...rounds].map((r) => scores[r]).filter((v): v is number => v != null)
		: Object.values(scores).filter((v): v is number => v != null);
	if (values.length === 0) return null;
	return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

export async function getPlayedWithStats(
	playerId: number,
	minGames: number,
) {
	const target = await db
		.select({
			playerId: players.playerId,
			fullName: players.fullName,
			squadId: players.squadId,
		})
		.from(players)
		.where(eq(players.playerId, playerId))
		.limit(1);

	if (target.length === 0) return null;
	const t = target[0];

	// Team-switch safe baseline:
	// only target matches played for the player's current squad.
	const targetMatches = await db
		.select({
			season: playerMatchStatsHistory.season,
			matchId: playerMatchStatsHistory.matchId,
			squadId: playerMatchStatsHistory.squadId,
			fantasyPoints: playerMatchStatsHistory.fantasyPoints,
		})
		.from(playerMatchStatsHistory)
		.where(
			and(
				eq(playerMatchStatsHistory.playerId, playerId),
				eq(playerMatchStatsHistory.squadId, t.squadId),
				inArray(playerMatchStatsHistory.matchType, OFFICIAL_MATCH_TYPES),
			),
		);

	const currentSeason =
		targetMatches.length > 0
			? Math.max(...targetMatches.map((m) => m.season))
			: null;
	const lastSeasonYear = currentSeason != null ? currentSeason - 1 : null;

	const keyFor = (season: number, matchId: number) => `${season}_${matchId}`;
	const targetScores: ScoresMap = {};
	const targetSquadByMatchKey = new Map<string, number>();
	const seasonKeys = new Set<string>();
	const lastSeasonKeys = new Set<string>();
	const totalKeys = new Set<string>();

	for (const m of targetMatches) {
		const key = keyFor(m.season, m.matchId);
		targetScores[key] = m.fantasyPoints ?? 0;
		targetSquadByMatchKey.set(key, m.squadId);
		totalKeys.add(key);
		if (currentSeason != null && m.season === currentSeason) {
			seasonKeys.add(key);
		}
		if (lastSeasonYear != null && m.season === lastSeasonYear) {
			lastSeasonKeys.add(key);
		}
	}

	const seasonsInScope = [...new Set(targetMatches.map((m) => m.season))];
	const matchIdsInScope = [...new Set(targetMatches.map((m) => m.matchId))];

	const teammateMatchRows =
		seasonsInScope.length > 0 && matchIdsInScope.length > 0
			? await db
					.select({
						playerId: playerMatchStatsHistory.playerId,
						season: playerMatchStatsHistory.season,
						matchId: playerMatchStatsHistory.matchId,
						squadId: playerMatchStatsHistory.squadId,
					})
					.from(playerMatchStatsHistory)
					.where(
						and(
							inArray(playerMatchStatsHistory.season, seasonsInScope),
							inArray(playerMatchStatsHistory.matchId, matchIdsInScope),
							ne(playerMatchStatsHistory.playerId, playerId),
						),
					)
			: [];

	const teammateScoresById = new Map<number, ScoresMap>();
	for (const row of teammateMatchRows) {
		const key = keyFor(row.season, row.matchId);
		const targetSquad = targetSquadByMatchKey.get(key);
		if (targetSquad == null) continue;
		// "With teammate" only when both played for same squad in that match key.
		if (row.squadId !== targetSquad) continue;
		const existing = teammateScoresById.get(row.playerId) ?? {};
		existing[key] = 1;
		teammateScoresById.set(row.playerId, existing);
	}

	const teammateIds = [...teammateScoresById.keys()];
	const teammateRows =
		teammateIds.length > 0
			? await db
					.select({
						playerId: players.playerId,
						fullName: players.fullName,
						status: players.status,
						squadId: players.squadId,
					})
					.from(players)
					.where(inArray(players.playerId, teammateIds))
			: [];

	const squadMates = teammateRows.filter((mate) => mate.squadId === t.squadId);

	const teammates: Array<{
		playerId: number;
		playerName: string;
		status: string | null;
		season: PeriodResult | null;
		lastSeason: PeriodResult | null;
		total: PeriodResult | null;
	}> = [];

	for (const mate of squadMates) {
		const mateScores = teammateScoresById.get(mate.playerId) ?? {};

		const seasonResult =
			seasonKeys.size > 0 ? computePeriod(targetScores, mateScores, seasonKeys) : null;
		const lastSeasonResult =
			lastSeasonKeys.size > 0
				? computePeriod(targetScores, mateScores, lastSeasonKeys)
				: null;
		const totalResult =
			totalKeys.size > 0 ? computePeriod(targetScores, mateScores, totalKeys) : null;

		const totalGamesWith = totalResult?.gamesWith ?? 0;
		if (totalGamesWith < minGames) continue;

		teammates.push({
			playerId: mate.playerId,
			playerName: mate.fullName,
			status: mate.status,
			season: seasonResult,
			lastSeason: lastSeasonResult,
			total: totalResult,
		});
	}

	teammates.sort((a, b) => (b.total?.delta ?? 0) - (a.total?.delta ?? 0));

	return {
		playerId: t.playerId,
		playerName: t.fullName,
		squadId: t.squadId,
		seasonYear: currentSeason,
		lastSeasonYear,
		overallAvg: {
			season: avgFromScores(targetScores, seasonKeys),
			lastSeason: avgFromScores(targetScores, lastSeasonKeys),
			total: avgFromScores(targetScores, totalKeys),
		},
		teammates,
	};
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

function parseByeSquadsFromRaw(raw: unknown): number[] {
	if (!raw || typeof raw !== "object") return [];
	const maybeByeSquads = (raw as { bye_squads?: unknown }).bye_squads;
	if (!Array.isArray(maybeByeSquads)) return [];
	return maybeByeSquads.filter((id): id is number => Number.isInteger(id));
}

export async function findByeRoundsForSquad(squadId: number, season: number) {
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
