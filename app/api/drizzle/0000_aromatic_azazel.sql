CREATE TABLE "fixtures" (
	"fixture_id" bigint PRIMARY KEY NOT NULL,
	"season" integer NOT NULL,
	"round_id" integer NOT NULL,
	"home_squad_id" bigint NOT NULL,
	"away_squad_id" bigint NOT NULL,
	"venue_id" bigint,
	"kickoff_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "player_current" (
	"player_id" bigint PRIMARY KEY NOT NULL,
	"season" integer NOT NULL,
	"price" integer NOT NULL,
	"avg_points" numeric(5, 2),
	"high_score" integer,
	"low_score" integer,
	"last_3_avg" numeric(5, 2),
	"last_5_avg" numeric(5, 2),
	"games_played" integer,
	"total_points" integer,
	"season_rank" integer,
	"tog" integer,
	"total_tog" integer,
	"last_3_tog_avg" numeric(6, 2),
	"last_5_tog_avg" numeric(6, 2),
	"owned_by" numeric(6, 2),
	"selections" integer,
	"captain_pct" numeric(6, 2),
	"vc_pct" numeric(6, 2),
	"bench_pct" numeric(6, 2),
	"res_pct" numeric(6, 2),
	"adp" integer,
	"draft_owned_by" numeric(6, 2),
	"draft_owned_by_change" numeric(6, 2),
	"draft_selections" integer,
	"proj_avg" numeric(5, 2),
	"wpr" numeric(8, 4),
	"round_wpr" jsonb,
	"career_avg" numeric(5, 2),
	"last_3_proj_avg" numeric(5, 2),
	"position_ranks" jsonb,
	"break_evens" jsonb,
	"be_pct" jsonb,
	"proj_prices" jsonb,
	"proj_scores" jsonb,
	"consistency" numeric(5, 2),
	"in_20_avg" numeric(5, 2),
	"out_20_avg" numeric(5, 2),
	"career_avg_vs" jsonb,
	"opponents" jsonb,
	"venues" jsonb,
	"last_season_scores" jsonb,
	"transfers" jsonb,
	"ppm_season" numeric(8, 4),
	"ppm_last_3" numeric(8, 4),
	"ppm_last_5" numeric(8, 4),
	"ppm_value" numeric(10, 4),
	"value_score" numeric(10, 4),
	"price_delta_3" integer,
	"price_delta_5" integer,
	"source_updated_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "player_ownership_history" (
	"season" integer NOT NULL,
	"round_id" integer NOT NULL,
	"player_id" bigint NOT NULL,
	"owned_by" numeric(6, 2) NOT NULL,
	"selections" integer NOT NULL,
	"captain_pct" numeric(6, 2),
	"vc_pct" numeric(6, 2),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "player_ownership_history_season_round_id_player_id_pk" PRIMARY KEY("season","round_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "player_price_history" (
	"season" integer NOT NULL,
	"round_id" integer NOT NULL,
	"player_id" bigint NOT NULL,
	"price" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "player_price_history_season_round_id_player_id_pk" PRIMARY KEY("season","round_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "player_round_stats" (
	"season" integer NOT NULL,
	"round_id" integer NOT NULL,
	"player_id" bigint NOT NULL,
	"match_id" bigint,
	"fantasy_points" integer,
	"time_on_ground" integer,
	"tries" integer,
	"try_assists" integer,
	"tackles" integer,
	"missed_tackles" integer,
	"metres_gained" integer,
	"kick_metres" integer,
	"errors" integer,
	"offloads" integer,
	"raw" jsonb,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "player_round_stats_season_round_id_player_id_pk" PRIMARY KEY("season","round_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"player_id" bigint PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"full_name" text NOT NULL,
	"squad_id" bigint NOT NULL,
	"status" text,
	"positions" integer[] DEFAULT '{}'::int[] NOT NULL,
	"original_positions" integer[],
	"original_squad_id" bigint,
	"transfer_round" integer DEFAULT 0,
	"cost" integer NOT NULL,
	"is_bye" boolean DEFAULT false NOT NULL,
	"locked" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"raw" jsonb,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"round_id" integer PRIMARY KEY NOT NULL,
	"season" integer NOT NULL,
	"round_display" text,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"is_bye_round" boolean DEFAULT false NOT NULL,
	"is_big_bye_round" boolean DEFAULT false NOT NULL,
	"raw" jsonb,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "squads" (
	"squad_id" bigint PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"avatar_version" integer,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_session" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"refreshToken" varchar NOT NULL,
	"userAgent" varchar,
	"ipAddress" varchar,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone,
	"deletedAt" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "user_session_refreshToken_unique" UNIQUE("refreshToken")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"timezone" varchar(50) DEFAULT 'Europe/Copenhagen' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone,
	"deletedAt" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "user_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "user_username_unique" UNIQUE("username"),
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"venue_id" bigint PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text,
	"timezone" text,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_round_id_rounds_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("round_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_home_squad_id_squads_squad_id_fk" FOREIGN KEY ("home_squad_id") REFERENCES "public"."squads"("squad_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_away_squad_id_squads_squad_id_fk" FOREIGN KEY ("away_squad_id") REFERENCES "public"."squads"("squad_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_venue_id_venues_venue_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("venue_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_current" ADD CONSTRAINT "player_current_player_id_players_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("player_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_ownership_history" ADD CONSTRAINT "player_ownership_history_player_id_players_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("player_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_price_history" ADD CONSTRAINT "player_price_history_player_id_players_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("player_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_round_stats" ADD CONSTRAINT "player_round_stats_round_id_rounds_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("round_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_round_stats" ADD CONSTRAINT "player_round_stats_player_id_players_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("player_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_squad_id_squads_squad_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."squads"("squad_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_session" ADD CONSTRAINT "user_session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_fixtures_round" ON "fixtures" USING btree ("season","round_id");--> statement-breakpoint
CREATE INDEX "idx_fixtures_home" ON "fixtures" USING btree ("home_squad_id");--> statement-breakpoint
CREATE INDEX "idx_fixtures_away" ON "fixtures" USING btree ("away_squad_id");--> statement-breakpoint
CREATE INDEX "idx_player_current_season" ON "player_current" USING btree ("season");--> statement-breakpoint
CREATE INDEX "idx_player_current_owned_by" ON "player_current" USING btree ("owned_by");--> statement-breakpoint
CREATE INDEX "idx_player_current_value_score" ON "player_current" USING btree ("value_score");--> statement-breakpoint
CREATE INDEX "idx_player_current_adp" ON "player_current" USING btree ("adp");--> statement-breakpoint
CREATE INDEX "idx_pph_player" ON "player_price_history" USING btree ("player_id","season");--> statement-breakpoint
CREATE INDEX "idx_prs_player" ON "player_round_stats" USING btree ("player_id","season");--> statement-breakpoint
CREATE INDEX "idx_prs_round" ON "player_round_stats" USING btree ("season","round_id");--> statement-breakpoint
CREATE INDEX "idx_players_squad" ON "players" USING btree ("squad_id");--> statement-breakpoint
CREATE INDEX "idx_rounds_season" ON "rounds" USING btree ("season");--> statement-breakpoint
CREATE INDEX "idx_squads_name" ON "squads" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_players_name_gin" ON "players" USING gin (to_tsvector('simple', "full_name"));--> statement-breakpoint
CREATE INDEX "idx_players_positions_gin" ON "players" USING gin ("positions");
