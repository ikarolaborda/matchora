/** Test factories — minimal builders for fixtures, teams, and events. */

import { emptySnapshot } from '../events.js';
import type {
  Fixture,
  FixtureStatus,
  MatchEvent,
  MatchEventKind,
  ScorePair,
  StageKind,
  Team,
  TeamSide,
  TournamentRules,
} from '../types.js';

export const rules: TournamentRules = {
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  tiebreakers: ['points', 'goal_difference', 'goals_for', 'head_to_head_points', 'fair_play'],
  advancePerGroup: 2,
  knockoutExtraTime: true,
};

export function team(id: string, code = id.toUpperCase()): Team {
  return {
    id,
    name: id,
    code,
    countryCode: code.slice(0, 2),
    colorPrimary: '#123456',
    colorSecondary: '#abcdef',
  };
}

export function fixture(
  id: string,
  home: string,
  away: string,
  opts: {
    status?: FixtureStatus;
    score?: ScorePair;
    groupId?: string;
    stage?: StageKind;
    penalties?: ScorePair | null;
  } = {},
): Fixture {
  const snapshot = emptySnapshot(id);
  snapshot.status = opts.status ?? 'scheduled';
  snapshot.score = opts.score ?? { home: 0, away: 0 };
  snapshot.penalties = opts.penalties ?? null;
  return {
    id,
    competitionId: 'comp',
    stage: opts.stage ?? 'group',
    groupId: opts.groupId ?? 'A',
    knockoutRoundId: null,
    homeTeamId: home,
    awayTeamId: away,
    venueId: null,
    kickoffAt: '2026-06-13T19:00:00.000Z',
    snapshot,
  };
}

let seq = 0;
export function event(
  fixtureId: string,
  kind: MatchEventKind,
  opts: {
    sequence?: number;
    side?: TeamSide | null;
    matchClock?: number | null;
    eventId?: string;
    score?: ScorePair;
    penalties?: ScorePair;
    status?: FixtureStatus;
    correctionOf?: string;
  } = {},
): MatchEvent {
  seq += 1;
  return {
    eventId: opts.eventId ?? `ev_${fixtureId}_${seq}`,
    fixtureId,
    sequence: opts.sequence ?? seq,
    kind,
    matchClock: opts.matchClock ?? null,
    side: opts.side ?? null,
    teamId: null,
    playerId: null,
    payload: {
      ...(opts.score ? { score: opts.score } : {}),
      ...(opts.penalties ? { penalties: opts.penalties } : {}),
      ...(opts.status ? { status: opts.status } : {}),
    },
    emittedAt: '2026-06-13T19:30:00.000Z',
    source: 'mock',
    externalId: null,
    correctionOf: opts.correctionOf ?? null,
  };
}
