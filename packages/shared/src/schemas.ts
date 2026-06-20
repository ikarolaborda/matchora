/**
 * Zod schemas — the runtime validation contract for API I/O and provider
 * payloads. Schemas mirror ./types; inferred types are checked against the
 * canonical types in tests to prevent drift.
 */

import { z } from 'zod';

export const stageKindSchema = z.enum([
  'group',
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final',
]);

export const fixtureStatusSchema = z.enum([
  'scheduled',
  'live',
  'halftime',
  'extra_time',
  'penalties',
  'finished',
  'postponed',
  'cancelled',
]);

export const matchEventKindSchema = z.enum([
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

export const teamSideSchema = z.enum(['home', 'away']);

export const scorePairSchema = z.object({
  home: z.number().int().min(0),
  away: z.number().int().min(0),
});

export const teamSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  countryCode: z.string(),
  colorPrimary: z.string(),
  colorSecondary: z.string(),
});

export const fixtureSnapshotSchema = z.object({
  fixtureId: z.string(),
  status: fixtureStatusSchema,
  score: scorePairSchema,
  penalties: scorePairSchema.nullable(),
  minute: z.number().int().nullable(),
  lastSequence: z.number().int().min(0),
  redCards: scorePairSchema,
});

export const fixtureSchema = z.object({
  id: z.string(),
  competitionId: z.string(),
  stage: stageKindSchema,
  groupId: z.string().nullable(),
  knockoutRoundId: z.string().nullable(),
  homeTeamId: z.string().nullable(),
  awayTeamId: z.string().nullable(),
  venueId: z.string().nullable(),
  kickoffAt: z.string().datetime(),
  snapshot: fixtureSnapshotSchema,
});

export const matchEventPayloadSchema = z.object({
  score: scorePairSchema.optional(),
  penalties: scorePairSchema.optional(),
  playerOutId: z.string().optional(),
  playerInId: z.string().optional(),
  note: z.string().optional(),
  status: fixtureStatusSchema.optional(),
});

export const matchEventSchema = z.object({
  eventId: z.string(),
  fixtureId: z.string(),
  sequence: z.number().int().min(0),
  kind: matchEventKindSchema,
  matchClock: z.number().int().nullable(),
  side: teamSideSchema.nullable(),
  teamId: z.string().nullable(),
  playerId: z.string().nullable(),
  payload: matchEventPayloadSchema,
  emittedAt: z.string().datetime(),
  source: z.string(),
  externalId: z.string().nullable(),
  correctionOf: z.string().nullable(),
});

export const qualificationStateSchema = z.enum([
  'qualified',
  'provisionally_qualified',
  'still_possible',
  'eliminated',
  'unknown',
]);

export const standingRowSchema = z.object({
  teamId: z.string(),
  rank: z.number().int().min(1),
  played: z.number().int().min(0),
  won: z.number().int().min(0),
  drawn: z.number().int().min(0),
  lost: z.number().int().min(0),
  goalsFor: z.number().int().min(0),
  goalsAgainst: z.number().int().min(0),
  goalDifference: z.number().int(),
  points: z.number().int(),
  fairPlayPoints: z.number().int().min(0),
  qualification: qualificationStateSchema,
});

export const groupStandingSchema = z.object({
  groupId: z.string(),
  competitionId: z.string(),
  rows: z.array(standingRowSchema),
  provisional: z.boolean(),
});

/* ── API request/response contracts ─────────────────────────────────────── */

export const fixturesQuerySchema = z.object({
  competitionId: z.string().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: fixtureStatusSchema.optional(),
  groupId: z.string().optional(),
});
export type FixturesQuery = z.infer<typeof fixturesQuerySchema>;

export const standingsQuerySchema = z.object({
  competitionId: z.string(),
  groupId: z.string().optional(),
});
export type StandingsQuery = z.infer<typeof standingsQuerySchema>;

export const simulateRequestSchema = z.object({
  competitionId: z.string(),
  groupId: z.string(),
  overrides: z.array(
    z.object({
      fixtureId: z.string(),
      score: scorePairSchema,
    }),
  ),
});
export type SimulateRequest = z.infer<typeof simulateRequestSchema>;

/** Consistent API error shape. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export function apiError(code: string, message: string, details?: unknown): ApiError {
  return { error: { code, message, ...(details === undefined ? {} : { details }) } };
}

export const healthSchema = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  app: z.literal('ok'),
  database: z.enum(['ok', 'unconfigured', 'down']),
  provider: z.object({ name: z.string(), status: z.enum(['ok', 'down']) }),
  live: z.enum(['ok', 'down']),
  version: z.string(),
  time: z.string(),
});
export type Health = z.infer<typeof healthSchema>;
