/**
 * Server-only data access. Centralizes the mock provider + competition id so
 * server components and route handlers share one provider singleton.
 */
import 'server-only';

import { getProvider } from '@matchora/data';
import type {
  Competition,
  Fixture,
  Group,
  GroupStanding,
  KnockoutBracket,
  MatchEvent,
  Team,
} from '@matchora/shared';

export const COMPETITION_ID = 'wft-2026';

export async function loadCompetition(): Promise<Competition | null> {
  return getProvider().getCompetition(COMPETITION_ID);
}

export async function loadTeams(): Promise<Team[]> {
  return getProvider().getTeams(COMPETITION_ID);
}

export async function loadTeamMap(): Promise<Map<string, Team>> {
  const teams = await loadTeams();
  return new Map(teams.map((t) => [t.id, t]));
}

export async function loadGroups(): Promise<Group[]> {
  return getProvider().getGroups(COMPETITION_ID);
}

export async function loadFixtures(): Promise<Fixture[]> {
  return getProvider().getFixtures(COMPETITION_ID);
}

export async function loadFixture(id: string): Promise<Fixture | null> {
  return getProvider().getFixture(id);
}

export async function loadFixtureEvents(id: string): Promise<MatchEvent[]> {
  return getProvider().getFixtureEvents(id);
}

export async function loadStandings(): Promise<GroupStanding[]> {
  return getProvider().getStandings(COMPETITION_ID);
}

export async function loadBracket(): Promise<KnockoutBracket | null> {
  return getProvider().getKnockoutBracket(COMPETITION_ID);
}
