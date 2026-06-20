/**
 * Pure mapping layer: API-Football v3 payloads → @matchora/shared types.
 *
 * Kept side-effect-free so it can be unit-tested against frozen sample
 * payloads. API-Football does NOT expose a stable per-event id, so we derive
 * one deterministically (api-football:{fixtureId}:{hash}) and assign a
 * monotonic per-fixture sequence after sorting by match clock — this is what
 * makes repeated polls idempotent in the existing event-sourced pipeline.
 */

import {
  buildSnapshot,
  type Fixture,
  type FixtureSnapshot,
  type FixtureStatus,
  type GroupStanding,
  type MatchEvent,
  type MatchEventKind,
  type StandingRow,
  type TeamSide,
  type QualificationState,
} from '@matchora/shared';

export const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io';
export const COMPETITION_ID = 'wft-2026';

/* ── Raw API shapes (minimal subset we consume) ─────────────────────────── */

export interface RawFixture {
  fixture: {
    id: number;
    date: string;
    venue?: { id: number | null; name: string | null; city: string | null };
    status: { short: string; long: string; elapsed: number | null };
  };
  league: { id: number; season: number; round: string };
  teams: { home: { id: number; name: string }; away: { id: number; name: string } };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
}

export interface RawEvent {
  time: { elapsed: number | null; extra: number | null };
  team: { id: number; name: string };
  player: { id: number | null; name: string | null };
  assist: { id: number | null; name: string | null };
  type: string; // "Goal" | "Card" | "subst" | "Var"
  detail: string; // "Normal Goal" | "Own Goal" | "Penalty" | "Yellow Card" | ...
  comments: string | null;
}

export interface RawStandingRow {
  rank: number;
  team: { id: number; name: string };
  points: number;
  goalsDiff: number;
  group: string;
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
}

/** Stable internal ids derived from provider numeric ids. */
export function fixtureId(rawFixtureId: number): string {
  return `af-fx-${rawFixtureId}`;
}
export function teamId(rawTeamId: number): string {
  return `af-team-${rawTeamId}`;
}

/** API-Football status.short → normalized FixtureStatus (explicit, total). */
export function mapStatus(short: string): FixtureStatus {
  switch (short) {
    case 'NS':
    case 'TBD':
      return 'scheduled';
    case '1H':
    case '2H':
    case 'LIVE':
      return 'live';
    case 'HT':
      return 'halftime';
    case 'ET':
    case 'BT':
      return 'extra_time';
    case 'P':
      return 'penalties';
    case 'FT':
    case 'AET':
    case 'PEN':
      return 'finished';
    case 'PST':
    case 'SUSP':
    case 'INT':
      return 'postponed';
    case 'CANC':
    case 'ABD':
    case 'AWD':
    case 'WO':
      return 'cancelled';
    default:
      return 'scheduled';
  }
}

/** Build the current snapshot directly from a raw fixture (authoritative scoreline). */
export function mapFixtureSnapshot(raw: RawFixture): FixtureSnapshot {
  const status = mapStatus(raw.fixture.status.short);
  const home = raw.goals.home ?? 0;
  const away = raw.goals.away ?? 0;
  const pen = raw.score.penalty;
  const hasPenalties = pen.home !== null || pen.away !== null;
  return {
    fixtureId: fixtureId(raw.fixture.id),
    status,
    score: { home, away },
    penalties: hasPenalties ? { home: pen.home ?? 0, away: pen.away ?? 0 } : null,
    minute: raw.fixture.status.elapsed,
    lastSequence: 0,
    redCards: { home: 0, away: 0 },
  };
}

export function mapFixture(raw: RawFixture): Fixture {
  const isGroup = /group/i.test(raw.league.round);
  return {
    id: fixtureId(raw.fixture.id),
    competitionId: COMPETITION_ID,
    stage: isGroup ? 'group' : 'round_of_16',
    groupId: isGroup ? `af-${normalizeGroup(raw.league.round)}` : null,
    knockoutRoundId: null,
    homeTeamId: teamId(raw.teams.home.id),
    awayTeamId: teamId(raw.teams.away.id),
    venueId: raw.fixture.venue?.id != null ? `af-venue-${raw.fixture.venue.id}` : null,
    kickoffAt: new Date(raw.fixture.date).toISOString(),
    snapshot: mapFixtureSnapshot(raw),
  };
}

function normalizeGroup(round: string): string {
  const m = round.match(/group\s*([a-z0-9]+)/i);
  return m ? `group-${m[1]!.toLowerCase()}` : 'group-x';
}

/** API-Football event (type, detail) → normalized kind + side. */
export function mapEventKind(
  type: string,
  detail: string,
): MatchEventKind | null {
  const t = type.toLowerCase();
  const d = detail.toLowerCase();
  if (t === 'goal') {
    if (d.includes('own')) {
      return 'own_goal';
    }
    if (d.includes('penalty') && d.includes('missed')) {
      return 'penalty_missed';
    }
    if (d.includes('penalty')) {
      return 'penalty_goal';
    }
    return 'goal';
  }
  if (t === 'card') {
    if (d.includes('yellow') && d.includes('second')) {
      return 'second_yellow';
    }
    if (d.includes('red')) {
      return 'red_card';
    }
    if (d.includes('yellow')) {
      return 'yellow_card';
    }
    return null;
  }
  if (t === 'subst') {
    return 'substitution';
  }
  if (t === 'var') {
    return 'var_decision';
  }
  return null;
}

/** djb2 hash → short hex, for deterministic synthetic event ids. */
function hash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function stableEventId(rawFixtureId: number, ev: RawEvent): string {
  const key = [
    ev.time.elapsed ?? 0,
    ev.time.extra ?? 0,
    ev.team.id,
    ev.player.id ?? 0,
    ev.type,
    ev.detail,
  ].join('|');
  return `api-football:${rawFixtureId}:${hash(key)}`;
}

/**
 * Map + sort + sequence a fixture's raw events into normalized MatchEvents.
 * Sorting by (elapsed, extra, type, team, player) makes ordering deterministic
 * regardless of poll arrival order; sequence is assigned monotonically after.
 */
export function mapEvents(raw: RawFixture, rawEvents: readonly RawEvent[]): MatchEvent[] {
  const homeId = raw.teams.home.id;
  const sorted = [...rawEvents]
    .map((ev) => ({ ev, kind: mapEventKind(ev.type, ev.detail) }))
    .filter((x): x is { ev: RawEvent; kind: MatchEventKind } => x.kind !== null)
    .sort((a, b) => {
      const ea = (a.ev.time.elapsed ?? 0) * 100 + (a.ev.time.extra ?? 0);
      const eb = (b.ev.time.elapsed ?? 0) * 100 + (b.ev.time.extra ?? 0);
      if (ea !== eb) {
        return ea - eb;
      }
      return stableEventId(raw.fixture.id, a.ev).localeCompare(stableEventId(raw.fixture.id, b.ev));
    });

  return sorted.map(({ ev, kind }, i) => {
    const side: TeamSide = ev.team.id === homeId ? 'home' : 'away';
    return {
      eventId: stableEventId(raw.fixture.id, ev),
      fixtureId: fixtureId(raw.fixture.id),
      sequence: i + 1,
      kind,
      matchClock: ev.time.elapsed,
      side,
      teamId: teamId(ev.team.id),
      playerId: ev.player.id != null ? `af-player-${ev.player.id}` : null,
      payload: ev.detail ? { note: ev.detail } : {},
      emittedAt: new Date().toISOString(),
      source: 'api-football',
      externalId: null,
      correctionOf: null,
    };
  });
}

/** Derive a fixture snapshot purely from the event log (event-sourced view). */
export function snapshotFromEvents(raw: RawFixture): FixtureSnapshot {
  return buildSnapshot(fixtureId(raw.fixture.id), mapEvents(raw, []));
}

const QUALIFY_TOP = 2;

/** Map API-Football standings rows (grouped) → GroupStanding[]. */
export function mapStandings(rows: readonly RawStandingRow[]): GroupStanding[] {
  const byGroup = new Map<string, RawStandingRow[]>();
  for (const r of rows) {
    const g = `af-${normalizeGroup(r.group)}`;
    const arr = byGroup.get(g) ?? [];
    arr.push(r);
    byGroup.set(g, arr);
  }

  const out: GroupStanding[] = [];
  for (const [groupId, groupRows] of byGroup) {
    const sorted = [...groupRows].sort((a, b) => a.rank - b.rank);
    const totalMatches = sorted.length - 1; // single round robin
    const provisional = sorted.some((r) => r.all.played < totalMatches);
    const standingRows: StandingRow[] = sorted.map((r) => {
      let qualification: QualificationState;
      if (!provisional) {
        qualification = r.rank <= QUALIFY_TOP ? 'qualified' : 'eliminated';
      } else {
        qualification = r.rank <= QUALIFY_TOP ? 'provisionally_qualified' : 'still_possible';
      }
      return {
        teamId: teamId(r.team.id),
        rank: r.rank,
        played: r.all.played,
        won: r.all.win,
        drawn: r.all.draw,
        lost: r.all.lose,
        goalsFor: r.all.goals.for,
        goalsAgainst: r.all.goals.against,
        goalDifference: r.goalsDiff,
        points: r.points,
        fairPlayPoints: 0,
        qualification,
      };
    });
    out.push({ groupId, competitionId: COMPETITION_ID, rows: standingRows, provisional });
  }
  return out;
}
