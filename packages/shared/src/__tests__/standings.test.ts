import { describe, expect, it } from 'vitest';
import { computeGroupStanding } from '../standings.js';
import { fixture, rules } from './factory.js';

const teamIds = ['t1', 't2', 't3', 't4'];

describe('computeGroupStanding', () => {
  it('ranks by points then goal difference then goals for', () => {
    const fixtures = [
      fixture('m1', 't1', 't2', { status: 'finished', score: { home: 3, away: 0 } }),
      fixture('m2', 't3', 't4', { status: 'finished', score: { home: 1, away: 1 } }),
      fixture('m3', 't1', 't3', { status: 'finished', score: { home: 1, away: 0 } }),
      fixture('m4', 't2', 't4', { status: 'finished', score: { home: 2, away: 2 } }),
      fixture('m5', 't1', 't4', { status: 'finished', score: { home: 0, away: 0 } }),
      fixture('m6', 't2', 't3', { status: 'finished', score: { home: 1, away: 0 } }),
    ];
    const s = computeGroupStanding('A', 'comp', teamIds, fixtures, rules);
    expect(s.provisional).toBe(false);
    // t1: W,W,D = 7 pts; leads
    expect(s.rows[0]?.teamId).toBe('t1');
    expect(s.rows[0]?.points).toBe(7);
    expect(s.rows[0]?.qualification).toBe('qualified');
    // last place is eliminated once group is complete
    expect(s.rows[3]?.qualification).toBe('eliminated');
  });

  it('marks the table provisional while a match is live', () => {
    const fixtures = [
      fixture('m1', 't1', 't2', { status: 'finished', score: { home: 2, away: 0 } }),
      fixture('m2', 't3', 't4', { status: 'live', score: { home: 1, away: 0 } }),
      fixture('m3', 't1', 't3', { status: 'scheduled' }),
      fixture('m4', 't2', 't4', { status: 'scheduled' }),
      fixture('m5', 't1', 't4', { status: 'scheduled' }),
      fixture('m6', 't2', 't3', { status: 'scheduled' }),
    ];
    const s = computeGroupStanding('A', 'comp', teamIds, fixtures, rules);
    expect(s.provisional).toBe(true);
    // live result counts toward the provisional table
    const t3 = s.rows.find((r) => r.teamId === 't3');
    expect(t3?.points).toBe(3);
    // nobody is certainly qualified this early
    expect(s.rows.every((r) => r.qualification !== 'qualified')).toBe(true);
  });

  it('declares a team eliminated when it can no longer reach a top-2 slot', () => {
    // t4 lost both played; with one game left it cannot catch the top two.
    const fixtures = [
      fixture('m1', 't1', 't2', { status: 'finished', score: { home: 1, away: 1 } }),
      fixture('m2', 't3', 't4', { status: 'finished', score: { home: 3, away: 0 } }),
      fixture('m3', 't1', 't3', { status: 'finished', score: { home: 1, away: 1 } }),
      fixture('m4', 't2', 't4', { status: 'finished', score: { home: 4, away: 0 } }),
      fixture('m5', 't1', 't4', { status: 'scheduled' }),
      fixture('m6', 't2', 't3', { status: 'scheduled' }),
    ];
    const s = computeGroupStanding('A', 'comp', teamIds, fixtures, rules);
    const t4 = s.rows.find((r) => r.teamId === 't4');
    expect(t4?.points).toBe(0);
    expect(t4?.qualification).toBe('eliminated');
  });
});
