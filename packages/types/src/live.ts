import { z } from "zod";

// --- Match clock (only present when live) ---
export const MatchClockSchema = z
	.object({
		p: z.number(),
		s: z.number(),
	})
	.optional();

// --- A single match within the live round ---
export const LiveMatchSchema = z.object({
	id: z.number(),
	match: z.number(),
	homeSquadId: z.number(),
	awaySquadId: z.number(),
	homeSquadName: z.string(),
	awaySquadName: z.string(),
	homeScore: z.number(),
	awayScore: z.number(),
	status: z.string(),
	venueName: z.string(),
	date: z.string(),
	clock: MatchClockSchema,
});

// --- GET /api/live response ---
export const LiveRoundResponseSchema = z.object({
	roundId: z.number(),
	status: z.string(),
	matches: z.array(LiveMatchSchema),
});

// --- Raw stat abbreviations from upstream ---
export const PlayerMatchRawStatsSchema = z.object({
	T: z.number().default(0),
	TS: z.number().default(0),
	G: z.number().default(0),
	FG: z.number().default(0),
	TA: z.number().default(0),
	LB: z.number().default(0),
	LBA: z.number().default(0),
	TCK: z.number().default(0),
	TB: z.number().default(0),
	MT: z.number().default(0),
	OFH: z.number().default(0),
	OFG: z.number().default(0),
	ER: z.number().default(0),
	FTF: z.number().default(0),
	MG: z.number().default(0),
	KM: z.number().default(0),
	KD: z.number().default(0),
	PC: z.number().default(0),
	SB: z.number().default(0),
	SO: z.number().default(0),
	TOG: z.number().default(0),
	FDO: z.number().default(0),
	TO: z.number().default(0),
	SAI: z.number().default(0),
	EFIG: z.number().default(0),
});

// --- Enriched player stat (with player name from DB + calculated points) ---
export const LivePlayerStatSchema = z.object({
	playerId: z.number(),
	fullName: z.string(),
	squadId: z.number().nullable(),
	stats: PlayerMatchRawStatsSchema,
	points: z.number(),
});

// --- GET /api/live/stats/:round_id response ---
export const LiveStatsResponseSchema = z.object({
	roundId: z.number(),
	players: z.array(LivePlayerStatSchema),
});

// --- GET /api/live (all rounds summary) ---
export const LiveRoundSummarySchema = z.object({
	roundId: z.number(),
	status: z.string(),
	matchCount: z.number(),
});

export const LiveRoundsListResponseSchema = z.object({
	rounds: z.array(LiveRoundSummarySchema),
	activeRound: LiveRoundResponseSchema.nullable(),
});

// --- Inferred types ---
export type MatchClock = z.infer<typeof MatchClockSchema>;
export type LiveMatch = z.infer<typeof LiveMatchSchema>;
export type LiveRoundResponse = z.infer<typeof LiveRoundResponseSchema>;
export type PlayerMatchRawStats = z.infer<typeof PlayerMatchRawStatsSchema>;
export type LivePlayerStat = z.infer<typeof LivePlayerStatSchema>;
export type LiveStatsResponse = z.infer<typeof LiveStatsResponseSchema>;
export type LiveRoundSummary = z.infer<typeof LiveRoundSummarySchema>;
export type LiveRoundsListResponse = z.infer<typeof LiveRoundsListResponseSchema>;
