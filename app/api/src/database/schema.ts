import { relations, sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	primaryKey,
	serial,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

// =====================
// Auth tables
// =====================

export const users = pgTable("user", {
	id: serial("id").primaryKey(),
	uuid: uuid("uuid").defaultRandom().unique().notNull(),
	username: varchar("username").unique().notNull(),
	email: varchar("email", { length: 255 }).unique().notNull(),
	password: varchar("password", { length: 255 }).notNull(),
	timezone: varchar("timezone", { length: 50 })
		.notNull()
		.default("Europe/Copenhagen"),
	active: boolean("active").notNull().default(true),
	createdAt: timestamp("createdAt", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true }),
	deletedAt: timestamp("deletedAt", { withTimezone: true }),
	version: integer("version").notNull().default(1),
});

export const userSessions = pgTable("user_session", {
	id: serial("id").primaryKey(),
	userId: integer("userId")
		.references(() => users.id, { onDelete: "cascade" })
		.notNull(),
	refreshToken: varchar("refreshToken").unique().notNull(),
	userAgent: varchar("userAgent"),
	ipAddress: varchar("ipAddress"),
	createdAt: timestamp("createdAt", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updatedAt", { withTimezone: true }),
	deletedAt: timestamp("deletedAt", { withTimezone: true }),
	version: integer("version").notNull().default(1),
});

// =====================
// 1. Reference tables
// =====================

export const squads = pgTable(
	"squads",
	{
		squadId: bigint("squad_id", { mode: "number" }).primaryKey(),
		fullName: text("full_name").notNull(),
		name: text("name").notNull(),
		shortName: text("short_name"),
		avatarVersion: integer("avatar_version"),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(t) => [index("idx_squads_name").on(t.name)],
);

export const venues = pgTable("venues", {
	venueId: bigint("venue_id", { mode: "number" }).primaryKey(),
	name: text("name").notNull(),
	shortName: text("short_name"),
	timezone: text("timezone"),
	updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const rounds = pgTable(
	"rounds",
	{
		roundId: integer("round_id").primaryKey(),
		season: integer("season").notNull(),
		roundDisplay: text("round_display"),
		startAt: timestamp("start_at", { withTimezone: true }),
		endAt: timestamp("end_at", { withTimezone: true }),
		isByeRound: boolean("is_bye_round").notNull().default(false),
		isBigByeRound: boolean("is_big_bye_round").notNull().default(false),
		raw: jsonb("raw"),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(t) => [index("idx_rounds_season").on(t.season)],
);

export const fixtures = pgTable(
	"fixtures",
	{
		fixtureId: bigint("fixture_id", { mode: "number" }).primaryKey(),
		season: integer("season").notNull(),
		roundId: integer("round_id")
			.references(() => rounds.roundId)
			.notNull(),
		homeSquadId: bigint("home_squad_id", { mode: "number" })
			.references(() => squads.squadId)
			.notNull(),
		awaySquadId: bigint("away_squad_id", { mode: "number" })
			.references(() => squads.squadId)
			.notNull(),
		venueId: bigint("venue_id", { mode: "number" }).references(
			() => venues.venueId,
		),
		kickoffAt: timestamp("kickoff_at", { withTimezone: true }),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(t) => [
		index("idx_fixtures_round").on(t.season, t.roundId),
		index("idx_fixtures_home").on(t.homeSquadId),
		index("idx_fixtures_away").on(t.awaySquadId),
	],
);


export const players = pgTable(
	"players",
	{
		playerId: bigint("player_id", { mode: "number" }).primaryKey(),
		firstName: text("first_name").notNull(),
		lastName: text("last_name").notNull(),
		fullName: text("full_name").notNull(),
		squadId: bigint("squad_id", { mode: "number" })
			.references(() => squads.squadId)
			.notNull(),
		status: text("status"),
		positions: integer("positions")
			.array()
			.notNull()
			.default(sql`'{}'::int[]`),
		originalPositions: integer("original_positions").array(),
		originalSquadId: bigint("original_squad_id", { mode: "number" }),
		transferRound: integer("transfer_round").default(0),
		cost: integer("cost").notNull(),
		isBye: boolean("is_bye").notNull().default(false),
		locked: boolean("locked").notNull().default(false),
		active: boolean("active").notNull().default(true),
		raw: jsonb("raw"),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(t) => [index("idx_players_squad").on(t.squadId)],
);

// =====================
// 2. Current snapshot
// =====================

export const playerCurrent = pgTable(
	"player_current",
	{
		playerId: bigint("player_id", { mode: "number" })
			.primaryKey()
			.references(() => players.playerId),
		season: integer("season").notNull(),
		price: integer("price").notNull(),

		// Stats from players.json
		avgPoints: numeric("avg_points", { precision: 5, scale: 2 }),
		highScore: integer("high_score"),
		lowScore: integer("low_score"),
		last3Avg: numeric("last_3_avg", { precision: 5, scale: 2 }),
		last5Avg: numeric("last_5_avg", { precision: 5, scale: 2 }),
		gamesPlayed: integer("games_played"),
		totalPoints: integer("total_points"),
		seasonRank: integer("season_rank"),

		// Time on ground
		tog: integer("tog"),
		totalTog: integer("total_tog"),
		last3TogAvg: numeric("last_3_tog_avg", { precision: 6, scale: 2 }),
		last5TogAvg: numeric("last_5_tog_avg", { precision: 6, scale: 2 }),

		// Ownership
		ownedBy: numeric("owned_by", { precision: 6, scale: 2 }),
		selections: integer("selections"),
		captainPct: numeric("captain_pct", { precision: 6, scale: 2 }),
		vcPct: numeric("vc_pct", { precision: 6, scale: 2 }),
		benchPct: numeric("bench_pct", { precision: 6, scale: 2 }),
		resPct: numeric("res_pct", { precision: 6, scale: 2 }),
		adp: integer("adp"),

		// Draft ownership
		draftOwnedBy: numeric("draft_owned_by", { precision: 6, scale: 2 }),
		draftOwnedByChange: numeric("draft_owned_by_change", {
			precision: 6,
			scale: 2,
		}),
		draftSelections: integer("draft_selections"),

		// Projections & rankings
		projAvg: numeric("proj_avg", { precision: 5, scale: 2 }),
		wpr: numeric("wpr", { precision: 8, scale: 4 }),
		roundWpr: jsonb("round_wpr"),
		careerAvg: numeric("career_avg", { precision: 5, scale: 2 }),
		last3ProjAvg: numeric("last_3_proj_avg", { precision: 5, scale: 2 }),
		positionRanks: jsonb("position_ranks"),

		// Break evens + projections
		breakEvens: jsonb("break_evens"),
		bePct: jsonb("be_pct"),
		projPrices: jsonb("proj_prices"),
		projScores: jsonb("proj_scores"),

		// Coach-only stats
		consistency: numeric("consistency", { precision: 5, scale: 2 }),
		in20Avg: numeric("in_20_avg", { precision: 5, scale: 2 }),
		out20Avg: numeric("out_20_avg", { precision: 5, scale: 2 }),

		// Splits
		careerAvgVs: jsonb("career_avg_vs"),
		opponents: jsonb("opponents"),
		venuesSplit: jsonb("venues"),

		// Round-by-round fantasy scores { roundId: points }
		scores: jsonb("scores"),

		// Historical context
		lastSeasonScores: jsonb("last_season_scores"),
		transfers: jsonb("transfers"),

		// Derived metrics
		baseAvg: numeric("base_avg", { precision: 5, scale: 2 }),
		ppmSeason: numeric("ppm_season", { precision: 8, scale: 4 }),
		ppmLast3: numeric("ppm_last_3", { precision: 8, scale: 4 }),
		ppmLast5: numeric("ppm_last_5", { precision: 8, scale: 4 }),
		ppmValue: numeric("ppm_value", { precision: 10, scale: 4 }),
		valueScore: numeric("value_score", { precision: 10, scale: 4 }),
		priceDelta3: integer("price_delta_3"),
		priceDelta5: integer("price_delta_5"),

		sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(t) => [
		index("idx_player_current_season").on(t.season),
		index("idx_player_current_owned_by").on(t.ownedBy),
		index("idx_player_current_value_score").on(t.valueScore),
		index("idx_player_current_adp").on(t.adp),
	],
);

// =====================
// 3. History tables
// =====================

export const playerRoundStats = pgTable(
	"player_round_stats",
	{
		season: integer("season").notNull(),
		roundId: integer("round_id")
			.references(() => rounds.roundId)
			.notNull(),
		playerId: bigint("player_id", { mode: "number" })
			.references(() => players.playerId)
			.notNull(),
		matchId: bigint("match_id", { mode: "number" }),
		fantasyPoints: integer("fantasy_points"),
		timeOnGround: integer("time_on_ground"),
		tries: integer("tries"),
		tryAssists: integer("try_assists"),
		tackles: integer("tackles"),
		missedTackles: integer("missed_tackles"),
		metresGained: integer("metres_gained"),
		kickMetres: integer("kick_metres"),
		errors: integer("errors"),
		offloads: integer("offloads"),
		raw: jsonb("raw"),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(t) => [
		primaryKey({ columns: [t.season, t.roundId, t.playerId] }),
		index("idx_prs_player").on(t.playerId, t.season),
		index("idx_prs_round").on(t.season, t.roundId),
	],
);

export const playerMatchStatsHistory = pgTable(
	"player_match_stats_history",
	{
		season: integer("season").notNull(),
		roundId: integer("round_id")
			.references(() => rounds.roundId)
			.notNull(),
		matchId: bigint("match_id", { mode: "number" }).notNull(),
		playerId: bigint("player_id", { mode: "number" })
			.references(() => players.playerId)
			.notNull(),
		squadId: bigint("squad_id", { mode: "number" }).notNull(),
		matchType: text("match_type").notNull(),
		matchDate: timestamp("match_date", { withTimezone: true }),
		fantasyPoints: integer("fantasy_points"),
		timeOnGround: integer("time_on_ground"),
		tries: integer("tries"),
		tryAssists: integer("try_assists"),
		tackles: integer("tackles"),
		missedTackles: integer("missed_tackles"),
		metresGained: integer("metres_gained"),
		kickMetres: integer("kick_metres"),
		errors: integer("errors"),
		offloads: integer("offloads"),
		raw: jsonb("raw"),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(t) => [
		primaryKey({ columns: [t.season, t.matchId, t.playerId] }),
		index("idx_pmsh_player").on(t.playerId, t.season),
		index("idx_pmsh_round").on(t.season, t.roundId),
		index("idx_pmsh_match").on(t.season, t.matchId),
	],
);

export const playerPriceHistory = pgTable(
	"player_price_history",
	{
		season: integer("season").notNull(),
		roundId: integer("round_id").notNull(),
		playerId: bigint("player_id", { mode: "number" })
			.references(() => players.playerId)
			.notNull(),
		price: integer("price").notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(t) => [
		primaryKey({ columns: [t.season, t.roundId, t.playerId] }),
		index("idx_pph_player").on(t.playerId, t.season),
	],
);

export const playerOwnershipHistory = pgTable(
	"player_ownership_history",
	{
		season: integer("season").notNull(),
		roundId: integer("round_id").notNull(),
		playerId: bigint("player_id", { mode: "number" })
			.references(() => players.playerId)
			.notNull(),
		ownedBy: numeric("owned_by", { precision: 6, scale: 2 }).notNull(),
		selections: integer("selections").notNull(),
		captainPct: numeric("captain_pct", { precision: 6, scale: 2 }),
		vcPct: numeric("vc_pct", { precision: 6, scale: 2 }),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(t) => [primaryKey({ columns: [t.season, t.roundId, t.playerId] })],
);

export const casualtyWard = pgTable(
	"casualty_ward",
	{
		competitionId: integer("competition_id").notNull(),
		playerUrl: text("player_url").notNull(),
		firstName: text("first_name").notNull(),
		lastName: text("last_name").notNull(),
		teamNickname: text("team_nickname").notNull(),
		injury: text("injury").notNull(),
		expectedReturn: text("expected_return").notNull(),
		imageUrl: text("image_url"),
		raw: jsonb("raw"),
		sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
	},
	(t) => [
		primaryKey({ columns: [t.competitionId, t.playerUrl] }),
		index("idx_casualty_ward_competition").on(t.competitionId),
		index("idx_casualty_ward_team").on(t.teamNickname),
		index("idx_casualty_ward_expected_return").on(t.expectedReturn),
	],
);

// =====================
// Relations
// =====================

export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(userSessions),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
	user: one(users, {
		fields: [userSessions.userId],
		references: [users.id],
	}),
}));

export const squadsRelations = relations(squads, ({ many }) => ({
	players: many(players),
	homeFixtures: many(fixtures, { relationName: "homeSquad" }),
	awayFixtures: many(fixtures, { relationName: "awaySquad" }),
}));

export const venuesRelations = relations(venues, ({ many }) => ({
	fixtures: many(fixtures),
}));

export const roundsRelations = relations(rounds, ({ many }) => ({
	fixtures: many(fixtures),
	playerRoundStats: many(playerRoundStats),
	playerMatchStatsHistory: many(playerMatchStatsHistory),
}));

export const fixturesRelations = relations(fixtures, ({ one }) => ({
	round: one(rounds, {
		fields: [fixtures.roundId],
		references: [rounds.roundId],
	}),
	homeSquad: one(squads, {
		fields: [fixtures.homeSquadId],
		references: [squads.squadId],
		relationName: "homeSquad",
	}),
	awaySquad: one(squads, {
		fields: [fixtures.awaySquadId],
		references: [squads.squadId],
		relationName: "awaySquad",
	}),
	venue: one(venues, {
		fields: [fixtures.venueId],
		references: [venues.venueId],
	}),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
	squad: one(squads, {
		fields: [players.squadId],
		references: [squads.squadId],
	}),
	current: one(playerCurrent, {
		fields: [players.playerId],
		references: [playerCurrent.playerId],
	}),
	roundStats: many(playerRoundStats),
	matchStatsHistory: many(playerMatchStatsHistory),
	priceHistory: many(playerPriceHistory),
	ownershipHistory: many(playerOwnershipHistory),
}));

export const playerCurrentRelations = relations(playerCurrent, ({ one }) => ({
	player: one(players, {
		fields: [playerCurrent.playerId],
		references: [players.playerId],
	}),
}));

export const playerRoundStatsRelations = relations(
	playerRoundStats,
	({ one }) => ({
		player: one(players, {
			fields: [playerRoundStats.playerId],
			references: [players.playerId],
		}),
		round: one(rounds, {
			fields: [playerRoundStats.roundId],
			references: [rounds.roundId],
		}),
	}),
);

export const playerPriceHistoryRelations = relations(
	playerPriceHistory,
	({ one }) => ({
		player: one(players, {
			fields: [playerPriceHistory.playerId],
			references: [players.playerId],
		}),
	}),
);

export const playerMatchStatsHistoryRelations = relations(
	playerMatchStatsHistory,
	({ one }) => ({
		player: one(players, {
			fields: [playerMatchStatsHistory.playerId],
			references: [players.playerId],
		}),
		round: one(rounds, {
			fields: [playerMatchStatsHistory.roundId],
			references: [rounds.roundId],
		}),
	}),
);

export const playerOwnershipHistoryRelations = relations(
	playerOwnershipHistory,
	({ one }) => ({
		player: one(players, {
			fields: [playerOwnershipHistory.playerId],
			references: [players.playerId],
		}),
	}),
);
