/**
 * Hypothetical simulation: "what if this result stays / changes?"
 *
 * Overrides are applied as a presentation/scenario layer — they never touch
 * the authoritative event log or official snapshots. The simulator clones
 * fixtures, forces the overridden results to finished, and recomputes.
 */

import { computeGroupStanding } from './standings.js';
import type { Fixture, GroupStanding, Id, ScorePair, TournamentRules } from './types.js';

export interface ScoreOverride {
  fixtureId: Id;
  score: ScorePair;
}

export function applyOverrides(
  fixtures: readonly Fixture[],
  overrides: readonly ScoreOverride[],
): Fixture[] {
  const byId = new Map(overrides.map((o) => [o.fixtureId, o.score]));
  return fixtures.map((fx) => {
    const override = byId.get(fx.id);
    if (!override) {
      return fx;
    }
    return {
      ...fx,
      snapshot: {
        ...fx.snapshot,
        status: 'finished',
        score: { home: override.home, away: override.away },
      },
    };
  });
}

export function simulateGroupStanding(
  groupId: Id,
  competitionId: Id,
  teamIds: readonly Id[],
  fixtures: readonly Fixture[],
  rules: TournamentRules,
  overrides: readonly ScoreOverride[],
): GroupStanding {
  const simulated = applyOverrides(fixtures, overrides);
  return computeGroupStanding(groupId, competitionId, teamIds, simulated, rules);
}

/** The teams that would advance from a group under the current/simulated table. */
export function qualifiedTeamIds(standing: GroupStanding, advancePerGroup: number): Id[] {
  return standing.rows.slice(0, advancePerGroup).map((r) => r.teamId);
}
