/**
 * Drizzle (PostgreSQL) schema — the future persistence/analytics path.
 *
 * NOTE: the running MVP serves data from the in-memory mock provider; the DB is
 * NOT required at runtime. This schema exists for db:generate/migrate/seed and
 * the worker-extraction path. It stores BOTH the append-only event log
 * (match_events) and the derived snapshot (fixtures.*), mirroring the domain
 * model in @matchora/shared. Event ingestion is idempotent on (external) ids.
 */

import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const stageKind = pgEnum('stage_kind', [
  'group',
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final',
]);

export const fixtureStatus = pgEnum('fixture_status', [
  'scheduled',
  'live',
  'halftime',
  'extra_time',
  'penalties',
  'finished',
  'postponed',
  'cancelled',
]);

export const matchEventKind = pgEnum('match_event_kind', [
  'match_started',
  'period_started',
  'period_ended',
  'goal',
  'own_goal',
  'penalty_goal',
  'penalty_missed',
  'yellow_card',
  'red_card',
  'second_yellow',
  'substitution',
  'var_review_started',
  'var_decision',
  'halftime',
  'fulltime',
  'match_ended',
  'goal_cancelled',
  'card_corrected',
  'score_corrected',
]);

export const teamSide = pgEnum('team_side', ['home', 'away']);

export const competitions = pgTable('competitions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  rules: jsonb('rules').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const seasons = pgTable('seasons', {
  id: text('id').primaryKey(),
  competitionId: text('competition_id')
    .notNull()
    .references(() => competitions.id),
  label: text('label').notNull(), // e.g. "2026"
  startsAt: timestamp('starts_at', { withTimezone: true }),
  endsAt: timestamp('ends_at', { withTimezone: true }),
});

export const venues = pgTable('venues', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  countryCode: text('country_code').notNull(),
});

export const teams = pgTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  countryCode: text('country_code').notNull(),
  colorPrimary: text('color_primary').notNull(),
  colorSecondary: text('color_secondary').notNull(),
});

export const players = pgTable('players', {
  id: text('id').primaryKey(),
  teamId: text('team_id')
    .notNull()
    .references(() => teams.id),
  name: text('name').notNull(),
  shirtNumber: integer('shirt_number'),
  position: text('position'),
});

export const groups = pgTable('groups', {
  id: text('id').primaryKey(),
  competitionId: text('competition_id')
    .notNull()
    .references(() => competitions.id),
  name: text('name').notNull(),
});

export const groupTeams = pgTable(
  'group_teams',
  {
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id),
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id),
  },
  (t) => ({ pk: primaryKey({ columns: [t.groupId, t.teamId] }) }),
);

export const knockoutRounds = pgTable('knockout_rounds', {
  id: text('id').primaryKey(),
  competitionId: text('competition_id')
    .notNull()
    .references(() => competitions.id),
  stage: stageKind('stage').notNull(),
  name: text('name').notNull(),
  order: integer('order').notNull(),
});

export const fixtures = pgTable('fixtures', {
  id: text('id').primaryKey(),
  competitionId: text('competition_id')
    .notNull()
    .references(() => competitions.id),
  stage: stageKind('stage').notNull(),
  groupId: text('group_id').references(() => groups.id),
  knockoutRoundId: text('knockout_round_id').references(() => knockoutRounds.id),
  homeTeamId: text('home_team_id').references(() => teams.id),
  awayTeamId: text('away_team_id').references(() => teams.id),
  venueId: text('venue_id').references(() => venues.id),
  kickoffAt: timestamp('kickoff_at', { withTimezone: true }).notNull(),
  // derived snapshot:
  status: fixtureStatus('status').notNull().default('scheduled'),
  homeScore: integer('home_score').notNull().default(0),
  awayScore: integer('away_score').notNull().default(0),
  homePenalties: integer('home_penalties'),
  awayPenalties: integer('away_penalties'),
  minute: integer('minute'),
  lastSequence: integer('last_sequence').notNull().default(0),
});

export const fixtureTeams = pgTable(
  'fixture_teams',
  {
    fixtureId: text('fixture_id')
      .notNull()
      .references(() => fixtures.id),
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id),
    side: teamSide('side').notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.fixtureId, t.teamId] }) }),
);

export const matchEvents = pgTable(
  'match_events',
  {
    eventId: text('event_id').primaryKey(),
    fixtureId: text('fixture_id')
      .notNull()
      .references(() => fixtures.id),
    sequence: integer('sequence').notNull(),
    kind: matchEventKind('kind').notNull(),
    matchClock: integer('match_clock'),
    side: teamSide('side'),
    teamId: text('team_id').references(() => teams.id),
    playerId: text('player_id').references(() => players.id),
    payload: jsonb('payload').notNull().default({}),
    emittedAt: timestamp('emitted_at', { withTimezone: true }).notNull(),
    source: text('source').notNull(),
    externalId: text('external_id'),
    correctionOf: text('correction_of'),
  },
  (t) => ({
    // idempotency: a provider's external event id is unique per source
    bySource: uniqueIndex('match_events_source_external_idx').on(t.source, t.externalId),
    bySequence: uniqueIndex('match_events_fixture_sequence_idx').on(t.fixtureId, t.sequence),
  }),
);

export const standings = pgTable(
  'standings',
  {
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id),
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id),
    rank: integer('rank').notNull(),
    played: integer('played').notNull().default(0),
    won: integer('won').notNull().default(0),
    drawn: integer('drawn').notNull().default(0),
    lost: integer('lost').notNull().default(0),
    goalsFor: integer('goals_for').notNull().default(0),
    goalsAgainst: integer('goals_against').notNull().default(0),
    points: integer('points').notNull().default(0),
    qualification: text('qualification').notNull().default('unknown'),
  },
  (t) => ({ pk: primaryKey({ columns: [t.groupId, t.teamId] }) }),
);

export const bracketSlots = pgTable('bracket_slots', {
  id: text('id').primaryKey(),
  roundId: text('round_id')
    .notNull()
    .references(() => knockoutRounds.id),
  fixtureId: text('fixture_id').references(() => fixtures.id),
  homeSource: jsonb('home_source').notNull(),
  awaySource: jsonb('away_source').notNull(),
  homeTeamId: text('home_team_id').references(() => teams.id),
  awayTeamId: text('away_team_id').references(() => teams.id),
  feedsIntoSlotId: text('feeds_into_slot_id'),
  feedsIntoSide: teamSide('feeds_into_side'),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  locale: text('locale').notNull().default('pt-BR'),
  timeZone: text('time_zone').notNull().default('UTC'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const favoriteTeams = pgTable(
  'favorite_teams',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    teamId: text('team_id')
      .notNull()
      .references(() => teams.id),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.teamId] }) }),
);

export const favoriteFixtures = pgTable(
  'favorite_fixtures',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    fixtureId: text('fixture_id')
      .notNull()
      .references(() => fixtures.id),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.fixtureId] }) }),
);

export const notificationPreferences = pgTable('notification_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id),
  alerts: jsonb('alerts').notNull().default({}),
  quietHours: jsonb('quiet_hours').notNull().default({}),
  noSpoilers: boolean('no_spoilers').notNull().default(false),
});

export const deviceTokens = pgTable('device_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  platform: text('platform').notNull(), // ios | android | web
  token: text('token').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const liveActivitySubscriptions = pgTable('live_activity_subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  fixtureId: text('fixture_id')
    .notNull()
    .references(() => fixtures.id),
  pushToStartToken: text('push_to_start_token'),
  activityToken: text('activity_token'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
});

export const ingestionLogs = pgTable('ingestion_logs', {
  id: text('id').primaryKey(),
  source: text('source').notNull(),
  fixtureId: text('fixture_id'),
  externalId: text('external_id'),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  raw: jsonb('raw'),
  outcome: text('outcome').notNull(), // applied | duplicate | rejected
});

export const competitionsRelations = relations(competitions, ({ many }) => ({
  groups: many(groups),
  fixtures: many(fixtures),
  knockoutRounds: many(knockoutRounds),
}));

export const fixturesRelations = relations(fixtures, ({ one, many }) => ({
  competition: one(competitions, {
    fields: [fixtures.competitionId],
    references: [competitions.id],
  }),
  group: one(groups, { fields: [fixtures.groupId], references: [groups.id] }),
  events: many(matchEvents),
}));

export const matchEventsRelations = relations(matchEvents, ({ one }) => ({
  fixture: one(fixtures, { fields: [matchEvents.fixtureId], references: [fixtures.id] }),
}));
