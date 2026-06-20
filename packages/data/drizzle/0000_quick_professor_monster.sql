CREATE TYPE "public"."fixture_status" AS ENUM('scheduled', 'live', 'halftime', 'extra_time', 'penalties', 'finished', 'postponed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."match_event_kind" AS ENUM('match_started', 'period_started', 'period_ended', 'goal', 'own_goal', 'penalty_goal', 'penalty_missed', 'yellow_card', 'red_card', 'second_yellow', 'substitution', 'var_review_started', 'var_decision', 'halftime', 'fulltime', 'match_ended', 'goal_cancelled', 'card_corrected', 'score_corrected');--> statement-breakpoint
CREATE TYPE "public"."stage_kind" AS ENUM('group', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final');--> statement-breakpoint
CREATE TYPE "public"."team_side" AS ENUM('home', 'away');--> statement-breakpoint
CREATE TABLE "bracket_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"round_id" text NOT NULL,
	"fixture_id" text,
	"home_source" jsonb NOT NULL,
	"away_source" jsonb NOT NULL,
	"home_team_id" text,
	"away_team_id" text,
	"feeds_into_slot_id" text,
	"feeds_into_side" "team_side"
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rules" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"platform" text NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorite_fixtures" (
	"user_id" text NOT NULL,
	"fixture_id" text NOT NULL,
	CONSTRAINT "favorite_fixtures_user_id_fixture_id_pk" PRIMARY KEY("user_id","fixture_id")
);
--> statement-breakpoint
CREATE TABLE "favorite_teams" (
	"user_id" text NOT NULL,
	"team_id" text NOT NULL,
	CONSTRAINT "favorite_teams_user_id_team_id_pk" PRIMARY KEY("user_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "fixture_teams" (
	"fixture_id" text NOT NULL,
	"team_id" text NOT NULL,
	"side" "team_side" NOT NULL,
	CONSTRAINT "fixture_teams_fixture_id_team_id_pk" PRIMARY KEY("fixture_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "fixtures" (
	"id" text PRIMARY KEY NOT NULL,
	"competition_id" text NOT NULL,
	"stage" "stage_kind" NOT NULL,
	"group_id" text,
	"knockout_round_id" text,
	"home_team_id" text,
	"away_team_id" text,
	"venue_id" text,
	"kickoff_at" timestamp with time zone NOT NULL,
	"status" "fixture_status" DEFAULT 'scheduled' NOT NULL,
	"home_score" integer DEFAULT 0 NOT NULL,
	"away_score" integer DEFAULT 0 NOT NULL,
	"home_penalties" integer,
	"away_penalties" integer,
	"minute" integer,
	"last_sequence" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_teams" (
	"group_id" text NOT NULL,
	"team_id" text NOT NULL,
	CONSTRAINT "group_teams_group_id_team_id_pk" PRIMARY KEY("group_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" text PRIMARY KEY NOT NULL,
	"competition_id" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingestion_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"fixture_id" text,
	"external_id" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"raw" jsonb,
	"outcome" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knockout_rounds" (
	"id" text PRIMARY KEY NOT NULL,
	"competition_id" text NOT NULL,
	"stage" "stage_kind" NOT NULL,
	"name" text NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_activity_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"fixture_id" text NOT NULL,
	"push_to_start_token" text,
	"activity_token" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "match_events" (
	"event_id" text PRIMARY KEY NOT NULL,
	"fixture_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"kind" "match_event_kind" NOT NULL,
	"match_clock" integer,
	"side" "team_side",
	"team_id" text,
	"player_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"emitted_at" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"external_id" text,
	"correction_of" text
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"alerts" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"quiet_hours" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"no_spoilers" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"name" text NOT NULL,
	"shirt_number" integer,
	"position" text
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" text PRIMARY KEY NOT NULL,
	"competition_id" text NOT NULL,
	"label" text NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "standings" (
	"group_id" text NOT NULL,
	"team_id" text NOT NULL,
	"rank" integer NOT NULL,
	"played" integer DEFAULT 0 NOT NULL,
	"won" integer DEFAULT 0 NOT NULL,
	"drawn" integer DEFAULT 0 NOT NULL,
	"lost" integer DEFAULT 0 NOT NULL,
	"goals_for" integer DEFAULT 0 NOT NULL,
	"goals_against" integer DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"qualification" text DEFAULT 'unknown' NOT NULL,
	CONSTRAINT "standings_group_id_team_id_pk" PRIMARY KEY("group_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"country_code" text NOT NULL,
	"color_primary" text NOT NULL,
	"color_secondary" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"locale" text DEFAULT 'pt-BR' NOT NULL,
	"time_zone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"country_code" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bracket_slots" ADD CONSTRAINT "bracket_slots_round_id_knockout_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."knockout_rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_slots" ADD CONSTRAINT "bracket_slots_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_slots" ADD CONSTRAINT "bracket_slots_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bracket_slots" ADD CONSTRAINT "bracket_slots_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_fixtures" ADD CONSTRAINT "favorite_fixtures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_fixtures" ADD CONSTRAINT "favorite_fixtures_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_teams" ADD CONSTRAINT "favorite_teams_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite_teams" ADD CONSTRAINT "favorite_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixture_teams" ADD CONSTRAINT "fixture_teams_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixture_teams" ADD CONSTRAINT "fixture_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_knockout_round_id_knockout_rounds_id_fk" FOREIGN KEY ("knockout_round_id") REFERENCES "public"."knockout_rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fixtures" ADD CONSTRAINT "fixtures_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_teams" ADD CONSTRAINT "group_teams_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_teams" ADD CONSTRAINT "group_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knockout_rounds" ADD CONSTRAINT "knockout_rounds_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_activity_subscriptions" ADD CONSTRAINT "live_activity_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_activity_subscriptions" ADD CONSTRAINT "live_activity_subscriptions_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "match_events_source_external_idx" ON "match_events" USING btree ("source","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "match_events_fixture_sequence_idx" ON "match_events" USING btree ("fixture_id","sequence");