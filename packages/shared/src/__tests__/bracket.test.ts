import { describe, expect, it } from 'vitest';
import { knockoutWinner, resolveBracket } from '../bracket.js';
import type { GroupStanding, KnockoutBracket } from '../types.js';
import { fixture } from './factory.js';

describe('knockoutWinner', () => {
  it('uses penalties when level after regulation/ET', () => {
    expect(
      knockoutWinner('t1', 't2', { home: 1, away: 1 }, { home: 5, away: 4 }).winner,
    ).toBe('t1');
    expect(knockoutWinner('t1', 't2', { home: 2, away: 0 }, null).winner).toBe('t1');
    expect(knockoutWinner('t1', 't2', { home: 0, away: 0 }, null).winner).toBeNull();
  });
});

describe('resolveBracket', () => {
  it('fills slots from finished group standings and propagates winners', () => {
    const standingA: GroupStanding = {
      groupId: 'A',
      competitionId: 'comp',
      provisional: false,
      rows: [
        { teamId: 'a1', rank: 1, played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 6, goalsAgainst: 1, goalDifference: 5, points: 9, fairPlayPoints: 0, qualification: 'qualified' },
        { teamId: 'a2', rank: 2, played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 4, goalsAgainst: 3, goalDifference: 1, points: 6, fairPlayPoints: 0, qualification: 'qualified' },
      ],
    };
    const standingB: GroupStanding = {
      ...standingA,
      groupId: 'B',
      rows: [
        { ...standingA.rows[0]!, teamId: 'b1' },
        { ...standingA.rows[1]!, teamId: 'b2' },
      ],
    };

    const bracket: KnockoutBracket = {
      competitionId: 'comp',
      rounds: [
        { id: 'r16', competitionId: 'comp', stage: 'round_of_16', name: 'R16', order: 1 },
        { id: 'qf', competitionId: 'comp', stage: 'quarter_final', name: 'QF', order: 2 },
      ],
      slots: [
        {
          id: 's1',
          roundId: 'r16',
          fixtureId: 'k1',
          homeSource: { kind: 'group_position', groupId: 'A', position: 1 },
          awaySource: { kind: 'group_position', groupId: 'B', position: 2 },
          homeTeamId: null,
          awayTeamId: null,
          feedsIntoSlotId: 's3',
          feedsIntoSide: 'home',
        },
        {
          id: 's2',
          roundId: 'r16',
          fixtureId: 'k2',
          homeSource: { kind: 'group_position', groupId: 'B', position: 1 },
          awaySource: { kind: 'group_position', groupId: 'A', position: 2 },
          homeTeamId: null,
          awayTeamId: null,
          feedsIntoSlotId: 's3',
          feedsIntoSide: 'away',
        },
        {
          id: 's3',
          roundId: 'qf',
          fixtureId: null,
          homeSource: { kind: 'winner_of', slotId: 's1' },
          awaySource: { kind: 'winner_of', slotId: 's2' },
          homeTeamId: null,
          awayTeamId: null,
          feedsIntoSlotId: null,
          feedsIntoSide: null,
        },
      ],
    };

    const fixtures = [
      fixture('k1', 'a1', 'b2', { status: 'finished', score: { home: 2, away: 0 }, stage: 'round_of_16' }),
      fixture('k2', 'b1', 'a2', { status: 'finished', score: { home: 1, away: 1 }, penalties: { home: 4, away: 2 }, stage: 'round_of_16' }),
    ];

    const resolved = resolveBracket(bracket, [standingA, standingB], fixtures, 2);
    const s1 = resolved.slots.find((s) => s.id === 's1')!;
    const s3 = resolved.slots.find((s) => s.id === 's3')!;
    expect(s1.homeTeamId).toBe('a1');
    expect(s1.awayTeamId).toBe('b2');
    // winners propagate into the QF slot
    expect(s3.homeTeamId).toBe('a1'); // winner of k1
    expect(s3.awayTeamId).toBe('b1'); // winner of k2 on penalties
  });

  it('does not resolve from a provisional group table', () => {
    const provisional: GroupStanding = {
      groupId: 'A',
      competitionId: 'comp',
      provisional: true,
      rows: [{ teamId: 'a1', rank: 1, played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 1, goalsAgainst: 0, goalDifference: 1, points: 3, fairPlayPoints: 0, qualification: 'provisionally_qualified' }],
    };
    const bracket: KnockoutBracket = {
      competitionId: 'comp',
      rounds: [{ id: 'r16', competitionId: 'comp', stage: 'round_of_16', name: 'R16', order: 1 }],
      slots: [
        {
          id: 's1',
          roundId: 'r16',
          fixtureId: null,
          homeSource: { kind: 'group_position', groupId: 'A', position: 1 },
          awaySource: { kind: 'team', teamId: 'x9' },
          homeTeamId: null,
          awayTeamId: null,
          feedsIntoSlotId: null,
          feedsIntoSide: null,
        },
      ],
    };
    const resolved = resolveBracket(bracket, [provisional], [], 2);
    expect(resolved.slots[0]?.homeTeamId).toBeNull();
    expect(resolved.slots[0]?.awayTeamId).toBe('x9');
  });
});
