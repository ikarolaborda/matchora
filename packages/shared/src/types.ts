/**
 * Canonical domain types for MatchOra.
 *
 * This module is the FROZEN contract that every other package depends on.
 * Keep it stable; additive changes only unless coordinated across packages.
 * All instants are ISO-8601 UTC strings (see ./time). No locale logic here.
 */

export type Iso8601 = string; // always UTC, e.g. "2026-06-13T19:00:00.000Z"
export type Id = string;

/** Tournament phases — not limited to two; configurable structure. */
export type StageKind =
  | 'group'
  | 'round_of_32'
  | 'round_of_16'
  | 'quarter_final'
  | 'semi_final'
  | 'third_place'
  | 'final';

export const KNOCKOUT_STAGES: StageKind[] = [
  'round_of_32',
  'round_of_16',
  'quarter_final',
  'semi_final',
  'third_place',
  'final',
];

/** Lifecycle of a fixture. Drives UI status chips and minute display. */
export type FixtureStatus =
  | 'scheduled'
  | 'live'
  | 'halftime'
  | 'extra_time'
  | 'penalties'
  | 'finished'
  | 'postponed'
  | 'cancelled';

export const LIVE_STATUSES: FixtureStatus[] = ['live', 'halftime', 'extra_time', 'penalties'];

/**
 * Normalized match-event kinds. Modeled on the ingestion envelope from the
 * reference design: provider raw events normalized into these kinds.
 * Includes correction kinds so VAR / score corrections are first-class.
 */
export type MatchEventKind =
  | 'match_started'
  | 'period_started'
  | 'period_ended'
  | 'goal'
  | 'own_goal'
  | 'penalty_goal'
  | 'penalty_missed'
  | 'yellow_card'
  | 'red_card'
  | 'second_yellow'
  | 'substitution'
  | 'var_review_started'
  | 'var_decision'
  | 'halftime'
  | 'fulltime'
  | 'match_ended'
  // corrections (idempotent, reference a prior event):
  | 'goal_cancelled'
  | 'card_corrected'
  | 'score_corrected';

export type TeamSide = 'home' | 'away';

export interface Venue {
  id: Id;
  name: string;
  city: string;
  countryCode: string; // ISO 3166-1 alpha-2/3, neutral data only
}

export interface Team {
  id: Id;
  /** Neutral display name; no protected federation marks. */
  name: string;
  /** Short code, e.g. "BRA" — used for compact cards and a11y labels. */
  code: string;
  /** ISO country code, used only to derive an emoji-flag fallback. */
  countryCode: string;
  /** Brand-safe accent color for the neutral placeholder badge. */
  colorPrimary: string;
  colorSecondary: string;
}

export interface Player {
  id: Id;
  teamId: Id;
  name: string;
  shirtNumber: number | null;
  position: string | null;
}

export interface Group {
  id: Id;
  competitionId: Id;
  name: string; // "Group A"
  teamIds: Id[];
}

export interface Competition {
  id: Id;
  name: string; // neutral, configurable tournament label
  season: string; // e.g. "2026"
  /** Ordered tiebreaker rules; see standings. Configurable per competition. */
  rules: TournamentRules;
}

/** Explicit, testable tournament rules — never implicit logic. */
export interface TournamentRules {
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  /** Applied in order until a pair is separated. */
  tiebreakers: Tiebreaker[];
  /** How many teams advance from each group. */
  advancePerGroup: number;
  /** Extra time + penalties apply to knockout fixtures only. */
  knockoutExtraTime: boolean;
}

export type Tiebreaker =
  | 'points'
  | 'goal_difference'
  | 'goals_for'
  | 'head_to_head_points'
  | 'head_to_head_goal_difference'
  | 'fair_play'
  | 'wins';

export interface ScorePair {
  home: number;
  away: number;
}

/**
 * Current derived state of a fixture (the "snapshot"), always rebuildable
 * from the event log via applyEvent. Standings are derived from snapshots,
 * never mutated incrementally.
 */
export interface FixtureSnapshot {
  fixtureId: Id;
  status: FixtureStatus;
  /** Regulation/ET goals. */
  score: ScorePair;
  /** Penalty shootout tally, present only when status reaches penalties. */
  penalties: ScorePair | null;
  /** Match clock in minutes (e.g. 67). null when not started/known. */
  minute: number | null;
  /** Monotonic sequence of the last applied event for this fixture. */
  lastSequence: number;
  /** Red cards per side, for quick display. */
  redCards: ScorePair;
}

export interface Fixture {
  id: Id;
  competitionId: Id;
  stage: StageKind;
  /** Set for group-stage fixtures. */
  groupId: Id | null;
  /** Knockout round identifier when stage is a knockout. */
  knockoutRoundId: Id | null;
  homeTeamId: Id | null; // null = unresolved bracket slot
  awayTeamId: Id | null;
  venueId: Id | null;
  kickoffAt: Iso8601;
  snapshot: FixtureSnapshot;
}

/**
 * The append-only event envelope. Idempotent by eventId; ordered by a
 * monotonic per-fixture sequence. Corrections reference a prior event.
 */
export interface MatchEvent {
  eventId: Id; // ULID-like; globally unique → idempotency key
  fixtureId: Id;
  sequence: number; // monotonic per fixture; SSE resume cursor
  kind: MatchEventKind;
  /** Match clock minute when the event occurred. */
  matchClock: number | null;
  /** Which side the event belongs to, when applicable. */
  side: TeamSide | null;
  teamId: Id | null;
  playerId: Id | null;
  /** Free-form normalized payload for kind-specific detail. */
  payload: MatchEventPayload;
  /** When the event was emitted/ingested (UTC). */
  emittedAt: Iso8601;
  /** Provider origin: "mock" | "sportmonks" | ... */
  source: string;
  /** External provider's own event id, when present. */
  externalId: string | null;
  /** For correction kinds: the eventId being corrected. */
  correctionOf: Id | null;
}

export interface MatchEventPayload {
  /** Replacement score for score_corrected / authoritative goal events. */
  score?: ScorePair;
  penalties?: ScorePair;
  /** substitution detail */
  playerOutId?: Id;
  playerInId?: Id;
  /** human-readable note (e.g. VAR decision outcome) */
  note?: string;
  /** new status when the event changes lifecycle */
  status?: FixtureStatus;
}

export type QualificationState =
  | 'qualified'
  | 'provisionally_qualified'
  | 'still_possible'
  | 'eliminated'
  | 'unknown';

export interface StandingRow {
  teamId: Id;
  rank: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  /** sum of disciplinary points for fair-play tiebreaker (lower is better). */
  fairPlayPoints: number;
  qualification: QualificationState;
}

export interface GroupStanding {
  groupId: Id;
  competitionId: Id;
  rows: StandingRow[];
  /** true while any contributing fixture is still live/unfinished. */
  provisional: boolean;
}

export interface KnockoutRound {
  id: Id;
  competitionId: Id;
  stage: StageKind;
  name: string; // localized at the UI layer; key-friendly here
  order: number;
}

export interface BracketSlot {
  id: Id;
  roundId: Id;
  /** Resolved fixture, if scheduled. */
  fixtureId: Id | null;
  /** Source describing where each side comes from when unresolved. */
  homeSource: SlotSource;
  awaySource: SlotSource;
  /** Resolved team ids, null while pending. */
  homeTeamId: Id | null;
  awayTeamId: Id | null;
  /** Winner advances to this slot+side. */
  feedsIntoSlotId: Id | null;
  feedsIntoSide: TeamSide | null;
}

export type SlotSource =
  | { kind: 'group_position'; groupId: Id; position: number }
  | { kind: 'winner_of'; slotId: Id }
  | { kind: 'loser_of'; slotId: Id }
  | { kind: 'team'; teamId: Id };

export interface KnockoutBracket {
  competitionId: Id;
  rounds: KnockoutRound[];
  slots: BracketSlot[];
}

/* ── User / preferences / notifications (web + mobile shared) ───────────── */

export type AlertType =
  | 'match_start'
  | 'goal'
  | 'penalty'
  | 'red_card'
  | 'halftime'
  | 'fulltime'
  | 'group_table_changed'
  | 'lineup_available';

export interface QuietHours {
  enabled: boolean;
  /** local "HH:mm" 24h */
  start: string;
  end: string;
}

export interface NotificationPreference {
  alerts: Record<AlertType, boolean>;
  quietHours: QuietHours;
  noSpoilers: boolean;
}

export interface UserPreferences {
  favoriteTeamIds: Id[];
  favoriteFixtureIds: Id[];
  locale: Locale;
  timeZone: string; // IANA, e.g. "America/Sao_Paulo"
  notifications: NotificationPreference;
}

export type Locale = 'pt-BR' | 'pt-PT' | 'en' | 'es';
export const LOCALES: Locale[] = ['pt-BR', 'pt-PT', 'en', 'es'];
export const DEFAULT_LOCALE: Locale = 'pt-BR';
