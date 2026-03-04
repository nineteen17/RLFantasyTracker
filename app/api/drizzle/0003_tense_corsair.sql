CREATE TABLE "player_match_stats_history" (
	"season" integer NOT NULL,
	"round_id" integer NOT NULL,
	"match_id" bigint NOT NULL,
	"player_id" bigint NOT NULL,
	"squad_id" bigint NOT NULL,
	"match_type" text NOT NULL,
	"match_date" timestamp with time zone,
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
	CONSTRAINT "player_match_stats_history_season_match_id_player_id_pk" PRIMARY KEY("season","match_id","player_id")
);
--> statement-breakpoint
ALTER TABLE "player_match_stats_history" ADD CONSTRAINT "player_match_stats_history_round_id_rounds_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("round_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "player_match_stats_history" ADD CONSTRAINT "player_match_stats_history_player_id_players_player_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("player_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_pmsh_player" ON "player_match_stats_history" USING btree ("player_id","season");
--> statement-breakpoint
CREATE INDEX "idx_pmsh_round" ON "player_match_stats_history" USING btree ("season","round_id");
--> statement-breakpoint
CREATE INDEX "idx_pmsh_match" ON "player_match_stats_history" USING btree ("season","match_id");
