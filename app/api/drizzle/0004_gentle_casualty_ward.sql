CREATE TABLE IF NOT EXISTS "casualty_ward" (
	"competition_id" integer NOT NULL,
	"player_url" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"team_nickname" text NOT NULL,
	"injury" text NOT NULL,
	"expected_return" text NOT NULL,
	"image_url" text,
	"raw" jsonb,
	"source_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "casualty_ward_competition_id_player_url_pk" PRIMARY KEY("competition_id","player_url")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_casualty_ward_competition" ON "casualty_ward" USING btree ("competition_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_casualty_ward_team" ON "casualty_ward" USING btree ("team_nickname");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_casualty_ward_expected_return" ON "casualty_ward" USING btree ("expected_return");
