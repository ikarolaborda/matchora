/**
 * Event application: pure, deterministic, idempotent.
 *
 * A fixture's current state is always derivable by folding its event log with
 * applyEvent. Standings and UI never mutate snapshots directly — they rebuild.
 */

import type {
  FixtureSnapshot,
  Id,
  MatchEvent,
  ScorePair,
} from './types.js';

export function emptySnapshot(fixtureId: Id): FixtureSnapshot {
  return {
    fixtureId,
    status: 'scheduled',
    score: { home: 0, away: 0 },
    penalties: null,
    minute: null,
    lastSequence: 0,
    redCards: { home: 0, away: 0 },
  };
}

function cloneScore(s: ScorePair): ScorePair {
  return { home: s.home, away: s.away };
}

function bump(score: ScorePair, side: 'home' | 'away' | null, by: number): ScorePair {
  const next = cloneScore(score);
  if (side === 'home') {
    next.home += by;
  }
  if (side === 'away') {
    next.away += by;
  }
  return next;
}

/**
 * Apply a single event to a snapshot.
 *
 * Idempotency/ordering rule: events carry a monotonic per-fixture `sequence`.
 * An event whose sequence is not strictly greater than the snapshot's
 * lastSequence is treated as already-applied (or stale) and ignored. Full
 * eventId-level dedup happens in buildSnapshot before folding.
 */
export function applyEvent(snapshot: FixtureSnapshot, event: MatchEvent): FixtureSnapshot {
  if (event.fixtureId !== snapshot.fixtureId) {
    return snapshot;
  }

  if (event.sequence <= snapshot.lastSequence) {
    return snapshot;
  }

  const next: FixtureSnapshot = {
    ...snapshot,
    score: cloneScore(snapshot.score),
    penalties: snapshot.penalties ? cloneScore(snapshot.penalties) : null,
    redCards: cloneScore(snapshot.redCards),
    lastSequence: event.sequence,
  };

  if (event.matchClock !== null) {
    next.minute = event.matchClock;
  }

  switch (event.kind) {
    case 'match_started':
    case 'period_started':
      next.status = 'live';
      if (next.minute === null) {
        next.minute = 0;
      }
      break;

    case 'goal':
    case 'penalty_goal':
      next.score = bump(next.score, event.side, 1);
      break;

    case 'own_goal':
      // own goal credits the opposing side
      next.score = bump(next.score, event.side === 'home' ? 'away' : 'home', 1);
      break;

    case 'goal_cancelled':
      // VAR-disallowed goal: prefer authoritative score in payload, else decrement.
      if (event.payload.score) {
        next.score = cloneScore(event.payload.score);
      } else {
        next.score = bump(next.score, event.side, -1);
        next.score.home = Math.max(0, next.score.home);
        next.score.away = Math.max(0, next.score.away);
      }
      break;

    case 'score_corrected':
      if (event.payload.score) {
        next.score = cloneScore(event.payload.score);
      }
      if (event.payload.penalties) {
        next.penalties = cloneScore(event.payload.penalties);
      }
      break;

    case 'red_card':
    case 'second_yellow':
      next.redCards = bump(next.redCards, event.side, 1);
      break;

    case 'card_corrected':
      // payload.score reused to convey corrected red-card tallies when needed
      if (event.payload.score) {
        next.redCards = cloneScore(event.payload.score);
      }
      break;

    case 'halftime':
      next.status = 'halftime';
      break;

    case 'period_ended':
      // status refined by subsequent period_started / fulltime / payload.status
      break;

    case 'penalty_missed':
      // shootout miss tracked via score_corrected/penalties payload when relevant
      if (event.payload.penalties) {
        next.penalties = cloneScore(event.payload.penalties);
      }
      break;

    case 'fulltime':
    case 'match_ended':
      next.status = 'finished';
      if (event.payload.penalties) {
        next.penalties = cloneScore(event.payload.penalties);
      }
      break;

    case 'var_review_started':
    case 'var_decision':
    case 'substitution':
    case 'yellow_card':
      // no score/status effect; timeline-only
      break;

    default:
      break;
  }

  // explicit status override (e.g. postponed, penalties, extra_time)
  if (event.payload.status) {
    next.status = event.payload.status;
  }
  if (event.payload.penalties && next.penalties === null) {
    next.penalties = cloneScore(event.payload.penalties);
  }

  return next;
}

/**
 * Rebuild a snapshot from an event log. Deduplicates by eventId (idempotency)
 * then folds in ascending sequence order. Out-of-order delivery is tolerated.
 */
export function buildSnapshot(fixtureId: Id, events: readonly MatchEvent[]): FixtureSnapshot {
  const seen = new Set<Id>();
  const ordered = events
    .filter((e) => e.fixtureId === fixtureId)
    .filter((e) => {
      if (seen.has(e.eventId)) {
        return false;
      }
      seen.add(e.eventId);
      return true;
    })
    .sort((a, b) => a.sequence - b.sequence);

  return ordered.reduce<FixtureSnapshot>(applyEvent, emptySnapshot(fixtureId));
}

/** Whether an event should trigger a user-facing alert of the given concern. */
export function isAlertableGoal(kind: MatchEvent['kind']): boolean {
  return kind === 'goal' || kind === 'penalty_goal' || kind === 'own_goal';
}

/**
 * Monotonic, lexicographically sortable id generator (ULID-shaped: time + rand).
 * Deterministic ordering for the same millisecond is preserved by a counter.
 */
let _counter = 0;
export function generateEventId(nowMs: number = Date.now()): Id {
  _counter = (_counter + 1) % 0xffffff;
  const time = nowMs.toString(36).padStart(9, '0');
  const rand = _counter.toString(36).padStart(5, '0');
  return `ev_${time}${rand}`;
}
