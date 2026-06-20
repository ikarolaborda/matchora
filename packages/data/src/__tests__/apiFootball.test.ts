import { describe, expect, it } from 'vitest';
import {
  mapEventKind,
  mapEvents,
  mapFixture,
  mapStandings,
  mapStatus,
  stableEventId,
  type RawEvent,
  type RawFixture,
  type RawStandingRow,
} from '../adapters/apiFootballMap.js';

const rawFixture: RawFixture = {
  fixture: {
    id: 239625,
    date: '2026-06-13T14:00:00+00:00',
    venue: { id: 1887, name: 'Stadium 1', city: 'Host City' },
    status: { short: 'HT', long: 'Halftime', elapsed: 45 },
  },
  league: { id: 1, season: 2026, round: 'Group A - 1' },
  teams: { home: { id: 967, name: 'Brazil' }, away: { id: 968, name: 'Morocco' } },
  goals: { home: 0, away: 1 },
  score: {
    halftime: { home: 0, away: 1 },
    fulltime: { home: null, away: null },
    extratime: { home: null, away: null },
    penalty: { home: null, away: null },
  },
};

const rawEvents: RawEvent[] = [
  { time: { elapsed: 25, extra: null }, team: { id: 968, name: 'Morocco' }, player: { id: 1, name: 'A' }, assist: { id: null, name: null }, type: 'Goal', detail: 'Normal Goal', comments: null },
  { time: { elapsed: 33, extra: null }, team: { id: 967, name: 'Brazil' }, player: { id: 2, name: 'B' }, assist: { id: null, name: null }, type: 'Card', detail: 'Yellow Card', comments: null },
  { time: { elapsed: 12, extra: null }, team: { id: 967, name: 'Brazil' }, player: { id: 3, name: 'C' }, assist: { id: null, name: null }, type: 'subst', detail: 'Substitution 1', comments: null },
];

describe('API-Football mapping', () => {
  it('maps status codes to normalized states', () => {
    expect(mapStatus('NS')).toBe('scheduled');
    expect(mapStatus('1H')).toBe('live');
    expect(mapStatus('HT')).toBe('halftime');
    expect(mapStatus('ET')).toBe('extra_time');
    expect(mapStatus('P')).toBe('penalties');
    expect(mapStatus('FT')).toBe('finished');
    expect(mapStatus('PST')).toBe('postponed');
    expect(mapStatus('CANC')).toBe('cancelled');
    expect(mapStatus('???')).toBe('scheduled'); // unknown fallback
  });

  it('maps event type/detail pairs', () => {
    expect(mapEventKind('Goal', 'Normal Goal')).toBe('goal');
    expect(mapEventKind('Goal', 'Own Goal')).toBe('own_goal');
    expect(mapEventKind('Goal', 'Penalty')).toBe('penalty_goal');
    expect(mapEventKind('Goal', 'Missed Penalty')).toBe('penalty_missed');
    expect(mapEventKind('Card', 'Yellow Card')).toBe('yellow_card');
    expect(mapEventKind('Card', 'Red Card')).toBe('red_card');
    expect(mapEventKind('subst', 'Substitution 1')).toBe('substitution');
    expect(mapEventKind('Var', 'Goal cancelled')).toBe('var_decision');
  });

  it('maps a fixture to the normalized model with derived snapshot', () => {
    const fx = mapFixture(rawFixture);
    expect(fx.id).toBe('af-fx-239625');
    expect(fx.stage).toBe('group');
    expect(fx.groupId).toBe('af-group-a');
    expect(fx.homeTeamId).toBe('af-team-967');
    expect(fx.snapshot.status).toBe('halftime');
    expect(fx.snapshot.score).toEqual({ home: 0, away: 1 });
    expect(fx.snapshot.minute).toBe(45);
  });

  it('produces stable, deterministic event ids and ordered sequences', () => {
    const a = mapEvents(rawFixture, rawEvents);
    const b = mapEvents(rawFixture, [...rawEvents].reverse());
    // sorted by match clock → substitution(12) before goal(25) before card(33)
    expect(a.map((e) => e.matchClock)).toEqual([12, 25, 33]);
    expect(a.map((e) => e.sequence)).toEqual([1, 2, 3]);
    // ids and order are identical regardless of input order (idempotent)
    expect(a.map((e) => e.eventId)).toEqual(b.map((e) => e.eventId));
    expect(stableEventId(239625, rawEvents[0]!)).toMatch(/^api-football:239625:[0-9a-f]{8}$/);
  });

  it('assigns sides relative to the home team', () => {
    const events = mapEvents(rawFixture, rawEvents);
    const goal = events.find((e) => e.kind === 'goal')!;
    expect(goal.side).toBe('away'); // Morocco (968) scored, home is Brazil (967)
  });

  it('maps grouped standings with qualification certainty', () => {
    const rows: RawStandingRow[] = [
      { rank: 1, team: { id: 1, name: 'A' }, points: 9, goalsDiff: 5, group: 'Group A', all: { played: 3, win: 3, draw: 0, lose: 0, goals: { for: 7, against: 2 } } },
      { rank: 2, team: { id: 2, name: 'B' }, points: 6, goalsDiff: 2, group: 'Group A', all: { played: 3, win: 2, draw: 0, lose: 1, goals: { for: 5, against: 3 } } },
      { rank: 3, team: { id: 3, name: 'C' }, points: 3, goalsDiff: -3, group: 'Group A', all: { played: 3, win: 1, draw: 0, lose: 2, goals: { for: 3, against: 6 } } },
      { rank: 4, team: { id: 4, name: 'D' }, points: 0, goalsDiff: -4, group: 'Group A', all: { played: 3, win: 0, draw: 0, lose: 3, goals: { for: 1, against: 5 } } },
    ];
    const standings = mapStandings(rows);
    expect(standings).toHaveLength(1);
    expect(standings[0]!.provisional).toBe(false);
    expect(standings[0]!.rows[0]!.qualification).toBe('qualified');
    expect(standings[0]!.rows[3]!.qualification).toBe('eliminated');
  });
});
