/**
 * FootballDataProvider — the source-agnostic data contract.
 *
 * The app depends ONLY on this interface and the LiveHub abstraction, never on
 * a concrete provider or the database. This keeps the mock runtime fully
 * functional offline and lets real adapters slot in behind the same surface.
 */

import type {
  Competition,
  Fixture,
  FixtureSnapshot,
  Group,
  GroupStanding,
  Id,
  KnockoutBracket,
  MatchEvent,
  Player,
  Team,
  Venue,
} from '@matchora/shared';

export interface MatchEventSubscription {
  /** Buffered events strictly after the given sequence cursor (for resume). */
  replay(afterSequence: number | null): MatchEvent[];
  /** Current snapshot, for the initial connect message. */
  snapshot(): FixtureSnapshot;
  /** Register a listener; returns an unsubscribe function. */
  subscribe(listener: (event: MatchEvent) => void): () => void;
}

export interface FootballDataProvider {
  readonly name: string;

  getCompetitions(): Promise<Competition[]>;
  getCompetition(id: Id): Promise<Competition | null>;
  getTeams(competitionId: Id): Promise<Team[]>;
  getTeam(teamId: Id): Promise<Team | null>;
  getPlayers(teamId: Id): Promise<Player[]>;
  getVenues(competitionId: Id): Promise<Venue[]>;
  getGroups(competitionId: Id): Promise<Group[]>;
  getFixtures(competitionId: Id): Promise<Fixture[]>;
  getFixture(fixtureId: Id): Promise<Fixture | null>;
  getFixtureEvents(fixtureId: Id): Promise<MatchEvent[]>;
  getLiveFixtureState(fixtureId: Id): Promise<FixtureSnapshot | null>;
  getStandings(competitionId: Id): Promise<GroupStanding[]>;
  getKnockoutBracket(competitionId: Id): Promise<KnockoutBracket | null>;

  /** Subscribe to the normalized live event stream for a fixture. */
  subscribeToMatchEvents(fixtureId: Id): MatchEventSubscription | null;
}
