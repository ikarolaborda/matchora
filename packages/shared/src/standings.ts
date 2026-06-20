/**
 * Group standings — derived purely from fixture snapshots.
 *
 * Standings are never mutated incrementally; they are recomputed from the
 * authoritative fixture states so corrections and out-of-order live updates
 * can never cause divergence. Qualification uses a conservative certainty
 * model (no false "qualified"/"eliminated" while outcomes remain open).
 */

import type {
  Fixture,
  GroupStanding,
  Id,
  QualificationState,
  StandingRow,
  TournamentRules,
  Tiebreaker,
} from './types.js';

interface Tally {
  teamId: Id;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  fairPlayPoints: number;
  /** group fixtures involving this team that are not finished */
  remaining: number;
}

function emptyTally(teamId: Id): Tally {
  return {
    teamId,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
    fairPlayPoints: 0,
    remaining: 0,
  };
}

const FINISHED = new Set(['finished']);

/** Count contributing (started) results into tallies; track remaining matches. */
function buildTallies(
  teamIds: readonly Id[],
  fixtures: readonly Fixture[],
  rules: TournamentRules,
): { tallies: Map<Id, Tally>; anyUnfinished: boolean } {
  const tallies = new Map<Id, Tally>();
  for (const id of teamIds) {
    tallies.set(id, emptyTally(id));
  }

  let anyUnfinished = false;

  for (const fx of fixtures) {
    const { homeTeamId, awayTeamId } = fx;
    if (!homeTeamId || !awayTeamId) {
      continue;
    }
    const home = tallies.get(homeTeamId);
    const away = tallies.get(awayTeamId);
    if (!home || !away) {
      continue;
    }

    const finished = FINISHED.has(fx.snapshot.status);
    const started = fx.snapshot.status !== 'scheduled' && fx.snapshot.status !== 'postponed';

    if (!finished) {
      anyUnfinished = true;
      home.remaining += 1;
      away.remaining += 1;
    }

    // Only count results once the match has produced a meaningful state.
    if (!started) {
      continue;
    }

    const { home: hg, away: ag } = fx.snapshot.score;
    home.goalsFor += hg;
    home.goalsAgainst += ag;
    away.goalsFor += ag;
    away.goalsAgainst += hg;
    home.fairPlayPoints += fx.snapshot.redCards.home * 3;
    away.fairPlayPoints += fx.snapshot.redCards.away * 3;

    // Provisional/finished both contribute to the live table.
    home.played += 1;
    away.played += 1;
    if (hg > ag) {
      home.won += 1;
      away.lost += 1;
      home.points += rules.pointsWin;
      away.points += rules.pointsLoss;
    } else if (hg < ag) {
      away.won += 1;
      home.lost += 1;
      away.points += rules.pointsWin;
      home.points += rules.pointsLoss;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += rules.pointsDraw;
      away.points += rules.pointsDraw;
    }
  }

  return { tallies, anyUnfinished };
}

function goalDiff(t: Tally): number {
  return t.goalsFor - t.goalsAgainst;
}

/** Head-to-head sub-table between exactly the tied teams. */
function headToHead(
  tied: readonly Id[],
  fixtures: readonly Fixture[],
  rules: TournamentRules,
): Map<Id, { points: number; gd: number }> {
  const set = new Set(tied);
  const acc = new Map<Id, { points: number; gd: number }>();
  for (const id of tied) {
    acc.set(id, { points: 0, gd: 0 });
  }
  for (const fx of fixtures) {
    const { homeTeamId: h, awayTeamId: a } = fx;
    if (!h || !a || !set.has(h) || !set.has(a)) {
      continue;
    }
    if (!FINISHED.has(fx.snapshot.status)) {
      continue;
    }
    const { home: hg, away: ag } = fx.snapshot.score;
    const hh = acc.get(h)!;
    const aa = acc.get(a)!;
    hh.gd += hg - ag;
    aa.gd += ag - hg;
    if (hg > ag) {
      hh.points += rules.pointsWin;
      aa.points += rules.pointsLoss;
    } else if (hg < ag) {
      aa.points += rules.pointsWin;
      hh.points += rules.pointsLoss;
    } else {
      hh.points += rules.pointsDraw;
      aa.points += rules.pointsDraw;
    }
  }
  return acc;
}

function compareByTiebreaker(
  a: Tally,
  b: Tally,
  tb: Tiebreaker,
  fixtures: readonly Fixture[],
  rules: TournamentRules,
): number {
  switch (tb) {
    case 'points':
      return b.points - a.points;
    case 'goal_difference':
      return goalDiff(b) - goalDiff(a);
    case 'goals_for':
      return b.goalsFor - a.goalsFor;
    case 'wins':
      return b.won - a.won;
    case 'fair_play':
      // fewer disciplinary points ranks higher
      return a.fairPlayPoints - b.fairPlayPoints;
    case 'head_to_head_points': {
      const hh = headToHead([a.teamId, b.teamId], fixtures, rules);
      return (hh.get(b.teamId)?.points ?? 0) - (hh.get(a.teamId)?.points ?? 0);
    }
    case 'head_to_head_goal_difference': {
      const hh = headToHead([a.teamId, b.teamId], fixtures, rules);
      return (hh.get(b.teamId)?.gd ?? 0) - (hh.get(a.teamId)?.gd ?? 0);
    }
    default:
      return 0;
  }
}

/** Sort tallies applying the configured tiebreakers in order. */
export function sortTallies(
  tallies: Tally[],
  fixtures: readonly Fixture[],
  rules: TournamentRules,
): Tally[] {
  return [...tallies].sort((a, b) => {
    for (const tb of rules.tiebreakers) {
      const r = compareByTiebreaker(a, b, tb, fixtures, rules);
      if (r !== 0) {
        return r;
      }
    }
    // stable final fallback: team id for determinism
    return a.teamId < b.teamId ? -1 : a.teamId > b.teamId ? 1 : 0;
  });
}

function classifyQualification(
  sorted: Tally[],
  rules: TournamentRules,
  groupFinished: boolean,
): Map<Id, QualificationState> {
  const out = new Map<Id, QualificationState>();
  const N = rules.advancePerGroup;

  if (groupFinished) {
    sorted.forEach((t, i) => {
      out.set(t.teamId, i < N ? 'qualified' : 'eliminated');
    });
    return out;
  }

  sorted.forEach((team, idx) => {
    const maxPoints = team.points + rules.pointsWin * team.remaining;
    const minPoints = team.points;

    // Conservative: a rival "could be >=" if its max reaches this team's floor.
    const rivalsCouldMatchOrBeat = sorted.filter(
      (o) => o.teamId !== team.teamId && o.points + rules.pointsWin * o.remaining >= minPoints,
    ).length;

    // Rivals guaranteed strictly ahead even if this team maxes out.
    const rivalsCertainlyAhead = sorted.filter(
      (o) => o.teamId !== team.teamId && o.points > maxPoints,
    ).length;

    let state: QualificationState;
    if (rivalsCouldMatchOrBeat < N) {
      state = 'qualified';
    } else if (rivalsCertainlyAhead >= N) {
      state = 'eliminated';
    } else if (idx < N) {
      state = 'provisionally_qualified';
    } else {
      state = 'still_possible';
    }
    out.set(team.teamId, state);
  });

  return out;
}

export function computeGroupStanding(
  groupId: Id,
  competitionId: Id,
  teamIds: readonly Id[],
  fixtures: readonly Fixture[],
  rules: TournamentRules,
): GroupStanding {
  const groupFixtures = fixtures.filter((f) => f.groupId === groupId);
  const { tallies, anyUnfinished } = buildTallies(teamIds, groupFixtures, rules);
  const sorted = sortTallies([...tallies.values()], groupFixtures, rules);
  const groupFinished = !anyUnfinished && groupFixtures.length > 0;
  const qualification = classifyQualification(sorted, rules, groupFinished);

  const rows: StandingRow[] = sorted.map((t, i) => ({
    teamId: t.teamId,
    rank: i + 1,
    played: t.played,
    won: t.won,
    drawn: t.drawn,
    lost: t.lost,
    goalsFor: t.goalsFor,
    goalsAgainst: t.goalsAgainst,
    goalDifference: goalDiff(t),
    points: t.points,
    fairPlayPoints: t.fairPlayPoints,
    qualification: qualification.get(t.teamId) ?? 'unknown',
  }));

  return { groupId, competitionId, rows, provisional: anyUnfinished };
}
