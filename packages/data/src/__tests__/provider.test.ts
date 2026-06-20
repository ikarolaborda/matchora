import { describe, expect, it } from 'vitest';
import { MockFootballDataProvider } from '../mock/provider.js';
import { SimulationEngine } from '../live/simulation.js';

const NOW = Date.parse('2026-06-19T18:00:00.000Z');

describe('MockFootballDataProvider', () => {
  it('serves a coherent dataset offline', async () => {
    const p = new MockFootballDataProvider(undefined, NOW);
    const comps = await p.getCompetitions();
    expect(comps).toHaveLength(1);
    const teams = await p.getTeams(comps[0]!.id);
    expect(teams).toHaveLength(32);
    const groups = await p.getGroups(comps[0]!.id);
    expect(groups).toHaveLength(8);
    const fixtures = await p.getFixtures(comps[0]!.id);
    expect(fixtures.length).toBe(48); // 8 groups * 6 round-robin matches
  });

  it('derives standings from snapshots and includes finished results', async () => {
    const p = new MockFootballDataProvider(undefined, NOW);
    const standings = await p.getStandings('wft-2026');
    expect(standings).toHaveLength(8);
    for (const s of standings) {
      expect(s.rows).toHaveLength(4);
      // matchday 1 is finished, so every team has at least one played match
      expect(s.rows.some((r) => r.played > 0)).toBe(true);
    }
  });

  it('exposes live fixtures and a resumable subscription', async () => {
    const p = new MockFootballDataProvider(undefined, NOW);
    expect(p.liveFixtureIds.length).toBeGreaterThan(0);
    const fixtureId = p.liveFixtureIds[0]!;
    const sub = p.subscribeToMatchEvents(fixtureId);
    expect(sub).not.toBeNull();
    const snap = sub!.snapshot();
    expect(snap.status).not.toBe('scheduled');
    // replay from the start returns the buffered live log
    const replayed = sub!.replay(0);
    expect(replayed.length).toBeGreaterThan(0);
  });

  it('ingests events idempotently and advances the snapshot', async () => {
    const p = new MockFootballDataProvider(undefined, NOW);
    const fixtureId = p.liveFixtureIds[0]!;
    const before = await p.getLiveFixtureState(fixtureId);
    const seq = (before?.lastSequence ?? 0) + 1;
    const event = {
      eventId: 'test-goal-1',
      fixtureId,
      sequence: seq,
      kind: 'goal' as const,
      matchClock: 50,
      side: 'home' as const,
      teamId: null,
      playerId: null,
      payload: {},
      emittedAt: new Date(NOW).toISOString(),
      source: 'test',
      externalId: null,
      correctionOf: null,
    };
    const after1 = p.ingest(event);
    const after2 = p.ingest(event); // duplicate eventId → no double count
    expect(after1.score.home).toBe(after2.score.home);
    expect(after1.lastSequence).toBe(seq);
  });

  it('simulation engine ticks a live fixture forward', async () => {
    const p = new MockFootballDataProvider(undefined, NOW);
    const engine = new SimulationEngine(p, { seed: 7 });
    const fixtureId = p.liveFixtureIds[0]!;
    const before = await p.getLiveFixtureState(fixtureId);
    const event = await engine.tickFixture(fixtureId);
    expect(event).not.toBeNull();
    const after = await p.getLiveFixtureState(fixtureId);
    expect(after!.lastSequence).toBeGreaterThan(before!.lastSequence);
  });
});
