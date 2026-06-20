import { describe, expect, it } from 'vitest';
import { qualifiedTeamIds, simulateGroupStanding } from '../simulator.js';
import { computeGroupStanding } from '../standings.js';
import { fixture, rules } from './factory.js';

const teamIds = ['t1', 't2', 't3', 't4'];

describe('simulator', () => {
  it('recomputes standings from hypothetical results without touching official data', () => {
    const fixtures = [
      fixture('m1', 't1', 't2', { status: 'finished', score: { home: 1, away: 0 } }),
      fixture('m2', 't3', 't4', { status: 'finished', score: { home: 0, away: 0 } }),
      fixture('m3', 't1', 't3', { status: 'scheduled' }),
      fixture('m4', 't2', 't4', { status: 'scheduled' }),
      fixture('m5', 't1', 't4', { status: 'scheduled' }),
      fixture('m6', 't2', 't3', { status: 'scheduled' }),
    ];

    const before = computeGroupStanding('A', 'comp', teamIds, fixtures, rules);
    expect(before.provisional).toBe(true);

    const sim = simulateGroupStanding('A', 'comp', teamIds, fixtures, rules, [
      { fixtureId: 'm3', score: { home: 2, away: 0 } },
      { fixtureId: 'm4', score: { home: 0, away: 3 } },
      { fixtureId: 'm5', score: { home: 1, away: 1 } },
      { fixtureId: 'm6', score: { home: 0, away: 0 } },
    ]);

    expect(sim.provisional).toBe(false);
    const qualifiers = qualifiedTeamIds(sim, rules.advancePerGroup);
    expect(qualifiers).toHaveLength(2);
    // t1 wins m1, m3, draws m5 → 7 pts, clear top
    expect(qualifiers[0]).toBe('t1');

    // original fixtures are not mutated by the simulation
    expect(fixtures.find((f) => f.id === 'm3')?.snapshot.status).toBe('scheduled');
  });
});
