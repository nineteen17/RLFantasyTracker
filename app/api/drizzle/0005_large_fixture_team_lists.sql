CREATE TABLE IF NOT EXISTS "fixture_team_lists" (
	"season" integer NOT NULL,
	"round_id" integer NOT NULL,
	"fixture_id" bigint NOT NULL,
	"home_squad_id" bigint NOT NULL,
	"away_squad_id" bigint NOT NULL,
	"home_players" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"away_players" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" text DEFAULT 'nrl.com' NOT NULL,
	"source_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "fixture_team_lists_round_id_fixture_id_pk" PRIMARY KEY("round_id","fixture_id"),
	CONSTRAINT "fixture_team_lists_round_id_rounds_round_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("round_id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "fixture_team_lists_fixture_id_fixtures_fixture_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("fixture_id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fixture_team_lists_round" ON "fixture_team_lists" USING btree ("season","round_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fixture_team_lists_fixture" ON "fixture_team_lists" USING btree ("fixture_id");
