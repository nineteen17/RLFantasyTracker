import { z } from "zod";

// --- Request schemas ---

export const searchQuerySchema = z.object({
	q: z.string().optional(),
	squad_id: z.coerce.number().int().positive().optional(),
	position: z.coerce.number().int().positive().optional(),
	status: z.string().optional(),
	sort: z
		.enum(["avg_points", "price", "owned_by", "value_score", "ppm_season"])
		.default("avg_points"),
	order: z.enum(["asc", "desc"]).default("desc"),
	limit: z.coerce.number().int().min(1).max(100).default(25),
	offset: z.coerce.number().int().min(0).default(0),
});

export const playerIdParamSchema = z.object({
	player_id: z.coerce.number().int().positive(),
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
	lastSeasonScores: z.any().nullable(),
	transfers: z.any().nullable(),
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

// --- Inferred types ---

export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
export type PlayerCurrent = z.infer<typeof PlayerCurrentSchema>;
export type PlayerInfo = z.infer<typeof PlayerInfoSchema>;
export type PlayerDetailResponse = z.infer<typeof PlayerDetailResponseSchema>;
