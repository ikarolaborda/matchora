/**
 * MockFootballDataProvider — fully functional offline data source.
 *
 * Holds the generated dataset in memory, derives standings/bracket on demand
 * via @matchora/shared pure functions, and exposes a live subscription backed
 * by the LiveHub. Accepting raw events (ingest) keeps the snapshot and event
 * log consistent and republishes to subscribers.
 */

import {
  applyEvent,
  buildSnapshot,
  computeGroupStanding,
  resolveBracket,
  type Competition,
  type Fixture,
  type FixtureSnapshot,
  type Group,
  type GroupStanding,
  type Id,
  type KnockoutBracket,
  type MatchEvent,
  type Player,
  type Team,
  type Venue,
} from '@matchora/shared';
import type { FootballDataProvider, MatchEventSubscription } from '../provider.js';
import { LiveHub } from '../live/hub.js';
import { buildMockDataset, type MockDataset } from './dataset.js';

export class MockFootballDataProvider implements FootballDataProvider {
  readonly name = 'mock';
  private readonly data: MockDataset;
  private readonly snapshots = new Map<Id, FixtureSnapshot>();

  constructor(
    private readonly hub: LiveHub = new LiveHub(),
    nowMs?: number,
  ) {
    this.data = buildMockDataset(nowMs);
    for (const fx of this.data.fixtures) {
      this.snapshots.set(fx.id, fx.snapshot);
      const log = this.data.events.get(fx.id);
      if (log) {
        for (const e of log) {
          this.hub.publish(e);
        }
      }
    }
  }

  get liveHub(): LiveHub {
    return this.hub;
  }

  get liveFixtureIds(): Id[] {
    return this.data.liveFixtureIds;
  }

  private fixturesWithSnapshots(): Fixture[] {
    return this.data.fixtures.map((fx) => ({
      ...fx,
      snapshot: this.snapshots.get(fx.id) ?? fx.snapshot,
    }));
  }

  async getCompetitions(): Promise<Competition[]> {
    return [this.data.competition];
  }

  async getCompetition(id: Id): Promise<Competition | null> {
    return this.data.competition.id === id ? this.data.competition : null;
  }

  async getTeams(_competitionId?: Id): Promise<Team[]> {
    return this.data.teams;
  }

  async getTeam(teamId: Id): Promise<Team | null> {
    return this.data.teams.find((t) => t.id === teamId) ?? null;
  }

  async getPlayers(_teamId?: Id): Promise<Player[]> {
    return []; // lineups are a documented placeholder in the MVP
  }

  async getVenues(_competitionId?: Id): Promise<Venue[]> {
    return this.data.venues;
  }

  async getGroups(_competitionId?: Id): Promise<Group[]> {
    return this.data.groups;
  }

  async getFixtures(_competitionId?: Id): Promise<Fixture[]> {
    return this.fixturesWithSnapshots();
  }

  async getFixture(fixtureId: Id): Promise<Fixture | null> {
    const fx = this.data.fixtures.find((f) => f.id === fixtureId);
    if (!fx) {
      return null;
    }
    return { ...fx, snapshot: this.snapshots.get(fixtureId) ?? fx.snapshot };
  }

  async getFixtureEvents(fixtureId: Id): Promise<MatchEvent[]> {
    return [...(this.data.events.get(fixtureId) ?? [])];
  }

  async getLiveFixtureState(fixtureId: Id): Promise<FixtureSnapshot | null> {
    return this.snapshots.get(fixtureId) ?? null;
  }

  async getStandings(_competitionId?: Id): Promise<GroupStanding[]> {
    const fixtures = this.fixturesWithSnapshots();
    return this.data.groups.map((g) =>
      computeGroupStanding(g.id, this.data.competition.id, g.teamIds, fixtures, this.data.competition.rules),
    );
  }

  async getKnockoutBracket(_competitionId?: Id): Promise<KnockoutBracket | null> {
    const standings = await this.getStandings();
    return resolveBracket(
      this.data.bracket,
      standings,
      this.fixturesWithSnapshots(),
      this.data.competition.rules.advancePerGroup,
    );
  }

  /**
   * Ingest a normalized event: append to the log, advance the snapshot, and
   * publish to subscribers. Idempotent — duplicate eventIds are dropped.
   */
  ingest(event: MatchEvent): FixtureSnapshot {
    const log = this.data.events.get(event.fixtureId) ?? [];
    if (log.some((e) => e.eventId === event.eventId)) {
      return this.snapshots.get(event.fixtureId) ?? buildSnapshot(event.fixtureId, log);
    }
    log.push(event);
    this.data.events.set(event.fixtureId, log);
    const current = this.snapshots.get(event.fixtureId) ?? buildSnapshot(event.fixtureId, []);
    const next = applyEvent(current, event);
    this.snapshots.set(event.fixtureId, next);
    this.hub.publish(event);
    return next;
  }

  subscribeToMatchEvents(fixtureId: Id): MatchEventSubscription | null {
    const fx = this.data.fixtures.find((f) => f.id === fixtureId);
    if (!fx) {
      return null;
    }
    const hub = this.hub;
    const getSnapshot = () => this.snapshots.get(fixtureId) ?? fx.snapshot;
    return {
      replay: (afterSequence) => hub.replay(fixtureId, afterSequence) ?? [],
      snapshot: getSnapshot,
      subscribe: (listener) => hub.subscribe(fixtureId, listener),
    };
  }
}
