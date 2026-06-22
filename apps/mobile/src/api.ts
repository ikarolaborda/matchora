/**
 * HTTP client for the MatchOra web API.
 *
 * The mobile app is a thin client: it talks to the existing Next.js API over
 * HTTP and reuses the canonical domain types from @matchora/shared. Response
 * envelopes mirror the web route handlers exactly (see apps/web/src/app/api/*).
 *
 * The base URL is resolved at runtime from the backend store (see
 * src/lib/backend.ts): a build-time default seeds it and the user can override
 * it from Settings. We resolve per-request so a URL change takes effect without
 * a reload.
 */
import type {
  Fixture,
  Group,
  GroupStanding,
  MatchEvent,
  FixtureStatus,
} from '@matchora/shared';
import { getBackendUrl } from './lib/backend';

export { getBackendUrl } from './lib/backend';

export const DEFAULT_COMPETITION_ID = 'wft-2026';

/** Shape of the API error envelope returned by errorResponse() on the web. */
interface ApiErrorEnvelope {
  error?: { code: string; message: string; details?: unknown };
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getBackendUrl();
  if (base === '') {
    throw new Error('Backend URL not set. Open Settings and enter your server URL.');
  }
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as ApiErrorEnvelope;
      if (body.error?.message) message = body.error.message;
    } catch {
      // non-JSON error body; keep the generic message
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

/* ── Fixtures ──────────────────────────────────────────────────────────── */

export interface FixturesQueryParams {
  competitionId?: string;
  /** YYYY-MM-DD (UTC day) */
  date?: string;
  status?: FixtureStatus;
  groupId?: string;
}

export async function fetchFixtures(params: FixturesQueryParams = {}): Promise<Fixture[]> {
  const qs = new URLSearchParams();
  qs.set('competitionId', params.competitionId ?? DEFAULT_COMPETITION_ID);
  if (params.date) qs.set('date', params.date);
  if (params.status) qs.set('status', params.status);
  if (params.groupId) qs.set('groupId', params.groupId);
  const data = await getJson<{ fixtures: Fixture[] }>(`/api/fixtures?${qs.toString()}`);
  return data.fixtures;
}

export async function fetchFixture(
  id: string,
): Promise<{ fixture: Fixture; events: MatchEvent[] }> {
  return getJson<{ fixture: Fixture; events: MatchEvent[] }>(`/api/fixtures/${id}`);
}

/* ── Groups ────────────────────────────────────────────────────────────── */

export async function fetchGroups(
  competitionId: string = DEFAULT_COMPETITION_ID,
): Promise<Group[]> {
  const data = await getJson<{ groups: Group[] }>(
    `/api/groups?competitionId=${encodeURIComponent(competitionId)}`,
  );
  return data.groups;
}

/* ── Standings ─────────────────────────────────────────────────────────── */

export async function fetchStandings(
  competitionId: string = DEFAULT_COMPETITION_ID,
  groupId?: string,
): Promise<GroupStanding[]> {
  const qs = new URLSearchParams({ competitionId });
  if (groupId) qs.set('groupId', groupId);
  const data = await getJson<{ standings: GroupStanding[] }>(`/api/standings?${qs.toString()}`);
  return data.standings;
}

/** Build a quick teamId → Team-ish lookup from the fixtures payload is not
 * available (the API does not expose /api/teams), so the UI derives team
 * codes/labels from fixtures where present and falls back to the id. */
