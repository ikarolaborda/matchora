/**
 * Knockout bracket resolution from group results.
 *
 * Slots can be unresolved; sources describe where each side comes from
 * (group position, winner/loser of another slot, or a fixed team). Resolution
 * fills slots as upstream results become available, supporting penalties.
 */

import { qualifiedTeamIds } from './simulator.js';
import type {
  BracketSlot,
  Fixture,
  GroupStanding,
  Id,
  KnockoutBracket,
  ScorePair,
  TeamSide,
} from './types.js';

export interface SlotResult {
  slotId: Id;
  winnerTeamId: Id | null;
  loserTeamId: Id | null;
}

function resolveSide(
  source: BracketSlot['homeSource'],
  standingsByGroup: Map<Id, GroupStanding>,
  resultsBySlot: Map<Id, SlotResult>,
  advancePerGroup: number,
): Id | null {
  switch (source.kind) {
    case 'team':
      return source.teamId;
    case 'group_position': {
      const standing = standingsByGroup.get(source.groupId);
      if (!standing || standing.provisional) {
        return null; // don't resolve from a provisional table
      }
      const ids = qualifiedTeamIds(standing, Math.max(advancePerGroup, source.position));
      return ids[source.position - 1] ?? null;
    }
    case 'winner_of':
      return resultsBySlot.get(source.slotId)?.winnerTeamId ?? null;
    case 'loser_of':
      return resultsBySlot.get(source.slotId)?.loserTeamId ?? null;
    default:
      return null;
  }
}

/** Decide a knockout fixture winner, honoring penalties when level. */
export function knockoutWinner(
  homeTeamId: Id | null,
  awayTeamId: Id | null,
  score: ScorePair,
  penalties: ScorePair | null,
): { winner: Id | null; loser: Id | null } {
  if (!homeTeamId || !awayTeamId) {
    return { winner: null, loser: null };
  }
  if (score.home > score.away) {
    return { winner: homeTeamId, loser: awayTeamId };
  }
  if (score.away > score.home) {
    return { winner: awayTeamId, loser: homeTeamId };
  }
  if (penalties) {
    if (penalties.home > penalties.away) {
      return { winner: homeTeamId, loser: awayTeamId };
    }
    if (penalties.away > penalties.home) {
      return { winner: awayTeamId, loser: homeTeamId };
    }
  }
  return { winner: null, loser: null };
}

/**
 * Fill bracket slots from finished standings and resolved fixtures. Returns a
 * new bracket with homeTeamId/awayTeamId populated where determinable.
 */
export function resolveBracket(
  bracket: KnockoutBracket,
  standings: readonly GroupStanding[],
  fixtures: readonly Fixture[],
  advancePerGroup: number,
): KnockoutBracket {
  const standingsByGroup = new Map(standings.map((s) => [s.groupId, s]));
  const fixtureById = new Map(fixtures.map((f) => [f.id, f]));
  const resultsBySlot = new Map<Id, SlotResult>();

  // Seed results from any slot that has a finished fixture.
  for (const slot of bracket.slots) {
    if (!slot.fixtureId) {
      continue;
    }
    const fx = fixtureById.get(slot.fixtureId);
    if (!fx || fx.snapshot.status !== 'finished') {
      continue;
    }
    const { winner, loser } = knockoutWinner(
      fx.homeTeamId,
      fx.awayTeamId,
      fx.snapshot.score,
      fx.snapshot.penalties,
    );
    resultsBySlot.set(slot.id, { slotId: slot.id, winnerTeamId: winner, loserTeamId: loser });
  }

  // Iterate to a fixed point so winner_of chains resolve across rounds.
  const slots: BracketSlot[] = bracket.slots.map((s) => ({ ...s }));
  let changed = true;
  let guard = 0;
  while (changed && guard < slots.length + 2) {
    changed = false;
    guard += 1;
    for (const slot of slots) {
      const home = resolveSide(slot.homeSource, standingsByGroup, resultsBySlot, advancePerGroup);
      const away = resolveSide(slot.awaySource, standingsByGroup, resultsBySlot, advancePerGroup);
      if (home !== slot.homeTeamId) {
        slot.homeTeamId = home;
        changed = true;
      }
      if (away !== slot.awayTeamId) {
        slot.awayTeamId = away;
        changed = true;
      }
    }
  }

  return { ...bracket, slots };
}

/** A pending matchup label helper for the UI (returns the two source descriptors). */
export function slotSides(slot: BracketSlot): { home: BracketSlot['homeSource']; away: BracketSlot['awaySource']; side: (s: TeamSide) => Id | null } {
  return {
    home: slot.homeSource,
    away: slot.awaySource,
    side: (s) => (s === 'home' ? slot.homeTeamId : slot.awayTeamId),
  };
}
