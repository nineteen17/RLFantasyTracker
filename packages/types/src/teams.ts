import { z } from "zod";

// --- Schemas ---

export const SquadSchema = z.object({
	squadId: z.number(),
	name: z.string(),
	fullName: z.string(),
	shortName: z.string().nullable(),
	avatarVersion: z.number().nullable(),
});

export const PlayerCardSchema = z.object({
	playerId: z.number(),
	firstName: z.string(),
	lastName: z.string(),
	fullName: z.string(),
	status: z.string().nullable(),
	positions: z.array(z.number()),
	cost: z.number(),
	isBye: z.boolean(),
	locked: z.boolean(),
	current: z
		.object({
			avgPoints: z.string().nullable(),
			totalPoints: z.number().nullable(),
			gamesPlayed: z.number().nullable(),
			ownedBy: z.string().nullable(),
			valueScore: z.string().nullable(),
			ppmSeason: z.string().nullable(),
			projAvg: z.string().nullable(),
			breakEvens: z.any().nullable(),
			seasonRank: z.number().nullable(),
		})
		.nullable(),
});

export const FixtureStripItemSchema = z.object({
	fixtureId: z.number(),
	roundId: z.number(),
	homeSquadId: z.number(),
	awaySquadId: z.number(),
	venueId: z.number().nullable(),
	kickoffAt: z.string().nullable(),
	homeSquad: z
		.object({ squadId: z.number(), name: z.string(), shortName: z.string().nullable() })
		.nullable(),
	awaySquad: z
		.object({ squadId: z.number(), name: z.string(), shortName: z.string().nullable() })
		.nullable(),
	venue: z.object({ venueId: z.number(), name: z.string() }).nullable(),
});

export const TeamsListResponseSchema = z.object({
	data: z.array(SquadSchema),
});

export const TeamDetailResponseSchema = z.object({
	data: SquadSchema.extend({
		roster: z.array(PlayerCardSchema),
		fixtureStrip: z.array(FixtureStripItemSchema),
	}),
});

// --- Inferred types ---

export type Squad = z.infer<typeof SquadSchema>;
export type PlayerCard = z.infer<typeof PlayerCardSchema>;
export type FixtureStripItem = z.infer<typeof FixtureStripItemSchema>;
export type TeamsListResponse = z.infer<typeof TeamsListResponseSchema>;
export type TeamDetailResponse = z.infer<typeof TeamDetailResponseSchema>;
