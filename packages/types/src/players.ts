import { z } from "zod";
import { PlayerMatchRawStatsSchema } from "./live.js";

// --- Request schemas ---

export const searchQuerySchema = z.object({
	q: z.string().optional(),
	squad_id: z.coerce.number().int().positive().optional(),
	position: z.coerce.number().int().positive().optional(),
	status: z.string().optional(),
	sort: z
		.enum([
			"avg_points",
			"price",
			"owned_by",
			"ppm_season",
			"base_avg",
			"break_evens",
		])
		.default("avg_points"),
	order: z.enum(["asc", "desc"]).default("desc"),
	limit: z.coerce.number().int().min(1).max(100).default(25),
	offset: z.coerce.number().int().min(0).default(0),
});

export const playerIdParamSchema = z.object({
	player_id: z.coerce.number().int().positive(),
});

export const playerHistoryQuerySchema = z.object({
	includePreseason: z
		.preprocess((value) => {
			if (value == null || value === "") return false;
			if (typeof value === "string") {
				const normalized = value.trim().toLowerCase();
				return normalized === "true" || normalized === "1";
			}
			return value;
		}, z.boolean())
		.default(false),
});

// --- Response schemas ---

export const SearchResultSchema = z.object({
	playerId: z.number(),
	firstName: z.string(),
	lastName: z.string(),
	fullName: z.string(),
	squadId: z.number(),
	status: z.string().nullable(),
	positions: z.array(z.number()),
	cost: z.number(),
	isBye: z.boolean(),
	locked: z.boolean(),
	squadName: z.string().nullable(),
	squadShortName: z.string().nullable(),
	avgPoints: z.string().nullable(),
	totalPoints: z.number().nullable(),
	gamesPlayed: z.number().nullable(),
	ownedBy: z.string().nullable(),
	valueScore: z.string().nullable(),
	ppmSeason: z.string().nullable(),
	baseAvg: z.string().nullable(),
	projAvg: z.string().nullable(),
	breakEvens: z.any().nullable(),
	seasonRank: z.number().nullable(),
	currentPrice: z.number().nullable(),
});

export const SearchResponseSchema = z.object({
	data: z.array(SearchResultSchema),
	total: z.number(),
	limit: z.number(),
	offset: z.number(),
});

export const PlayerCurrentSchema = z.object({
	playerId: z.number(),
	season: z.number(),
	price: z.number(),
	avgPoints: z.string().nullable(),
	highScore: z.number().nullable(),
	lowScore: z.number().nullable(),
	last3Avg: z.string().nullable(),
	last5Avg: z.string().nullable(),
	gamesPlayed: z.number().nullable(),
	totalPoints: z.number().nullable(),
	seasonRank: z.number().nullable(),
	tog: z.number().nullable(),
	totalTog: z.number().nullable(),
	last3TogAvg: z.string().nullable(),
	last5TogAvg: z.string().nullable(),
	ownedBy: z.string().nullable(),
	selections: z.number().nullable(),
	captainPct: z.string().nullable(),
	vcPct: z.string().nullable(),
	benchPct: z.string().nullable(),
	resPct: z.string().nullable(),
	adp: z.number().nullable(),
	draftOwnedBy: z.string().nullable(),
	draftOwnedByChange: z.string().nullable(),
	draftSelections: z.number().nullable(),
	projAvg: z.string().nullable(),
	wpr: z.string().nullable(),
	roundWpr: z.any().nullable(),
	careerAvg: z.string().nullable(),
	last3ProjAvg: z.string().nullable(),
	positionRanks: z.any().nullable(),
	breakEvens: z.any().nullable(),
	bePct: z.any().nullable(),
	projPrices: z.any().nullable(),
	projScores: z.any().nullable(),
	consistency: z.string().nullable(),
	in20Avg: z.string().nullable(),
	out20Avg: z.string().nullable(),
	careerAvgVs: z.any().nullable(),
	opponents: z.any().nullable(),
	venuesSplit: z.any().nullable(),
	scores: z.record(z.string(), z.number()).nullable(),
	lastSeasonScores: z.any().nullable(),
	transfers: z.any().nullable(),
	baseAvg: z.string().nullable(),
	ppmSeason: z.string().nullable(),
	ppmLast3: z.string().nullable(),
	ppmLast5: z.string().nullable(),
	ppmValue: z.string().nullable(),
	valueScore: z.string().nullable(),
	priceDelta3: z.number().nullable(),
	priceDelta5: z.number().nullable(),
	sourceUpdatedAt: z.string().nullable(),
	updatedAt: z.string().nullable(),
});

export const PlayerInfoSchema = z.object({
	playerId: z.number(),
	firstName: z.string(),
	lastName: z.string(),
	fullName: z.string(),
	squadId: z.number(),
	status: z.string().nullable(),
	positions: z.array(z.number()),
	originalPositions: z.array(z.number()).nullable(),
	originalSquadId: z.number().nullable(),
	transferRound: z.number().nullable(),
	cost: z.number(),
	isBye: z.boolean(),
	locked: z.boolean(),
	squad: z.object({
		squadId: z.number(),
		name: z.string(),
		fullName: z.string(),
		shortName: z.string().nullable(),
	}),
});

export const PlayerDetailResponseSchema = z.object({
	player: PlayerInfoSchema,
	current: PlayerCurrentSchema.nullable(),
	fixtureStrip: z.array(z.any()),
});

export const PlayerHistoryMatchSchema = z.object({
	season: z.number(),
	roundId: z.number(),
	matchId: z.number(),
	matchType: z.string(),
	matchDate: z.string().nullable(),
	squadId: z.number(),
	positionMatch: z.string().nullable(),
	jerseyNumber: z.number().nullable(),
	derivedPosition: z.string().nullable(),
	isStarter: z.boolean().nullable(),
	fantasyPoints: z.number(),
	stats: PlayerMatchRawStatsSchema,
});

export const PlayerHistoryResponseSchema = z.object({
	playerId: z.number(),
	currentSeason: z.number().nullable(),
	matches: z.array(PlayerHistoryMatchSchema),
});

// --- Played With schemas ---

export const playedWithQuerySchema = z.object({
	minGames: z.coerce.number().int().min(1).default(3),
});

export const PlayedWithPeriodSchema = z.object({
	gamesWith: z.number(),
	gamesWithout: z.number(),
	avgWith: z.number(),
	avgWithout: z.number().nullable(),
	delta: z.number().nullable(),
});

export const PlayedWithTeammateSchema = z.object({
	playerId: z.number(),
	playerName: z.string(),
	season: PlayedWithPeriodSchema.nullable(),
	lastSeason: PlayedWithPeriodSchema.nullable(),
	total: PlayedWithPeriodSchema.nullable(),
});

export const PlayedWithResponseSchema = z.object({
	playerId: z.number(),
	playerName: z.string(),
	squadId: z.number(),
	seasonYear: z.number().nullable(),
	lastSeasonYear: z.number().nullable(),
	overallAvg: z.object({
		season: z.number().nullable(),
		lastSeason: z.number().nullable(),
		total: z.number().nullable(),
	}),
	teammates: z.array(PlayedWithTeammateSchema),
});

// --- Inferred types ---

export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
export type PlayerCurrent = z.infer<typeof PlayerCurrentSchema>;
export type PlayerInfo = z.infer<typeof PlayerInfoSchema>;
export type PlayerDetailResponse = z.infer<typeof PlayerDetailResponseSchema>;
export type PlayerHistoryMatch = z.infer<typeof PlayerHistoryMatchSchema>;
export type PlayerHistoryResponse = z.infer<typeof PlayerHistoryResponseSchema>;
export type PlayerHistoryQuery = z.infer<typeof playerHistoryQuerySchema>;
export type PlayedWithQuery = z.infer<typeof playedWithQuerySchema>;
export type PlayedWithResponse = z.infer<typeof PlayedWithResponseSchema>;
