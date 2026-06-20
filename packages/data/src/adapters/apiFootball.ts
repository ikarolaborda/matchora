/**
 * ApiFootballAdapter — REAL data source (API-Football v3).
 *
 * Implements the same FootballDataProvider interface as the mock, mapping live
 * provider payloads into the @matchora/shared normalized model and feeding the
 * SAME LiveHub/event pipeline. Enabled only when FOOTBALL_DATA_PROVIDER=
 * api-football AND API_FOOTBALL_KEY is set; otherwise the factory falls back to
 * mock (fail-closed) so the project always runs without credentials.
 *
 * Docs verified via Context7 (/websites/api-sports_io_football_v3).
 */

import {
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
  type TournamentRules,
  type Venue,
} from '@matchora/shared';
import type { FootballDataProvider, MatchEventSubscription } from '../provider.js';
import { LiveHub } from '../live/hub.js';
import {
  API_FOOTBALL_BASE_URL,
  COMPETITION_ID,
  mapEvents,
  mapFixture,
  mapStandings,
  teamId,
  type RawEvent,
  type RawFixture,
  type RawStandingRow,
} from './apiFootballMap.js';

interface ApiFootballResponse<T> {
  errors: unknown;
  results: number;
  response: T[];
}

export interface ApiFootballConfig {
  apiKey: string;
  leagueId: number; // World Cup = 1
  season: number; // e.g. 2026
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

const RULES: TournamentRules = {
  pointsWin: 3,
  pointsDraw: 1,
  pointsLoss: 0,
  tiebreakers: ['points', 'goal_difference', 'goals_for', 'head_to_head_points', 'fair_play'],
  advancePerGroup: 2,
  knockoutExtraTime: true,
};

function rawFixtureIdOf(internalId: Id): number | null {
  const m = internalId.match(/^af-fx-(\d+)$/);
  return m ? Number(m[1]) : null;
}

function synthTeam(rawId: number, name: string): Team {
  const code = name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'TBD';
  return {
    id: teamId(rawId),
    name,
    code,
    countryCode: '',
    colorPrimary: '#26303f',
    colorSecondary: '#9aa7b8',
  };
}

export class ApiFootballAdapter implements FootballDataProvider {
  readonly name = 'api-football';
  private readonly base: string;
  private readonly fetchImpl: typeof fetch;
  private readonly fixtureCache = new Map<Id, RawFixture>();
  private readonly emitted = new Map<Id, Set<Id>>();

  constructor(
    private readonly config: ApiFootballConfig,
    private readonly hub: LiveHub = new LiveHub(),
  ) {
    this.base = config.baseUrl ?? API_FOOTBALL_BASE_URL;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  private async get<T>(path: string, params: Record<string, string | number>): Promise<T[]> {
    const url = new URL(`${this.base}${path}`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
    const res = await this.fetchImpl(url.toString(), {
      headers: { 'x-apisports-key': this.config.apiKey },
    });
    if (!res.ok) {
      throw new Error(`API-Football ${path} failed: ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as ApiFootballResponse<T>;
    return json.response ?? [];
  }

  private async fetchRawFixtures(): Promise<RawFixture[]> {
    const raw = await this.get<RawFixture>('/fixtures', {
      league: this.config.leagueId,
      season: this.config.season,
    });
    for (const r of raw) {
      this.fixtureCache.set(`af-fx-${r.fixture.id}`, r);
    }
    return raw;
  }

  private async competition(): Promise<Competition> {
    return {
      id: COMPETITION_ID,
      name: 'World Football Tournament',
      season: String(this.config.season),
      rules: RULES,
    };
  }

  async getCompetitions(): Promise<Competition[]> {
    return [await this.competition()];
  }

  async getCompetition(id: Id): Promise<Competition | null> {
    return id === COMPETITION_ID ? this.competition() : null;
  }

  async getTeams(): Promise<Team[]> {
    const raw = await this.fetchRawFixtures();
    const seen = new Map<number, { id: number; name: string }>();
    for (const r of raw) {
      seen.set(r.teams.home.id, r.teams.home);
      seen.set(r.teams.away.id, r.teams.away);
    }
    return [...seen.values()].map((t) => synthTeam(t.id, t.name));
  }

  async getTeam(id: Id): Promise<Team | null> {
    return (await this.getTeams()).find((t) => t.id === id) ?? null;
  }

  async getPlayers(): Promise<Player[]> {
    return []; // squads endpoint not wired in the MVP adapter
  }

  async getVenues(): Promise<Venue[]> {
    const raw = await this.fetchRawFixtures();
    const out = new Map<string, Venue>();
    for (const r of raw) {
      const v = r.fixture.venue;
      if (v?.id != null) {
        out.set(`af-venue-${v.id}`, {
          id: `af-venue-${v.id}`,
          name: v.name ?? 'Venue',
          city: v.city ?? '',
          countryCode: '',
        });
      }
    }
    return [...out.values()];
  }

  async getGroups(): Promise<Group[]> {
    const standings = await this.getStandings();
    return standings.map((s) => ({
      id: s.groupId,
      competitionId: COMPETITION_ID,
      name: s.groupId.replace('af-group-', 'Group ').replace(/group-/i, 'Group '),
      teamIds: s.rows.map((r) => r.teamId),
    }));
  }

  async getFixtures(): Promise<Fixture[]> {
    return (await this.fetchRawFixtures()).map(mapFixture);
  }

  async getFixture(fixtureId: Id): Promise<Fixture | null> {
    const rawId = rawFixtureIdOf(fixtureId);
    if (rawId === null) {
      return null;
    }
    const raw = await this.get<RawFixture>('/fixtures', { id: rawId });
    const first = raw[0];
    if (!first) {
      return null;
    }
    this.fixtureCache.set(fixtureId, first);
    return mapFixture(first);
  }

  async getFixtureEvents(fixtureId: Id): Promise<MatchEvent[]> {
    const rawId = rawFixtureIdOf(fixtureId);
    if (rawId === null) {
      return [];
    }
    let raw = this.fixtureCache.get(fixtureId);
    if (!raw) {
      const fetched = await this.get<RawFixture>('/fixtures', { id: rawId });
      raw = fetched[0];
      if (raw) {
        this.fixtureCache.set(fixtureId, raw);
      }
    }
    if (!raw) {
      return [];
    }
    const events = await this.get<RawEvent>('/fixtures/events', { fixture: rawId });
    return mapEvents(raw, events);
  }

  async getLiveFixtureState(fixtureId: Id): Promise<FixtureSnapshot | null> {
    const fx = await this.getFixture(fixtureId);
    return fx?.snapshot ?? null;
  }

  async getStandings(): Promise<GroupStanding[]> {
    const raw = await this.get<{ league: { standings: RawStandingRow[][] } }>('/standings', {
      league: this.config.leagueId,
      season: this.config.season,
    });
    const groups = raw[0]?.league.standings ?? [];
    return mapStandings(groups.flat());
  }

  async getKnockoutBracket(): Promise<KnockoutBracket | null> {
    // Knockout resolution from the live feed is intentionally out of scope for
    // the MVP real adapter; the mock provider demonstrates the full bracket.
    return null;
  }

  /** Poll a live fixture once, emitting only unseen events into the hub (idempotent). */
  async pollLiveOnce(fixtureId: Id): Promise<MatchEvent[]> {
    const events = await this.getFixtureEvents(fixtureId);
    const seen = this.emitted.get(fixtureId) ?? new Set<Id>();
    const fresh = events.filter((e) => !seen.has(e.eventId));
    for (const e of fresh) {
      seen.add(e.eventId);
      this.hub.publish(e);
    }
    this.emitted.set(fixtureId, seen);
    return fresh;
  }

  subscribeToMatchEvents(fixtureId: Id): MatchEventSubscription | null {
    const hub = this.hub;
    void this.pollLiveOnce(fixtureId);
    const fallback: FixtureSnapshot = {
      fixtureId,
      status: 'scheduled',
      score: { home: 0, away: 0 },
      penalties: null,
      minute: null,
      lastSequence: 0,
      redCards: { home: 0, away: 0 },
    };
    return {
      replay: (afterSequence) => hub.replay(fixtureId, afterSequence) ?? [],
      snapshot: () => {
        const raw = this.fixtureCache.get(fixtureId);
        return raw ? mapFixture(raw).snapshot : fallback;
      },
      subscribe: (listener) => hub.subscribe(fixtureId, listener),
    };
  }
}
