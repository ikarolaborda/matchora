/**
 * No-spoilers mode — a PRESENTATION transform, never a data mutation.
 *
 * Source data, cache keys, and event processing are untouched. The UI asks for
 * a masked view of a fixture; favorites and navigation can flip masked/unmasked
 * without changing what is cached or streamed.
 */

import type { Fixture, FixtureSnapshot, MatchEvent } from './types.js';

export const MASKED_SCORE = '—';

export interface MaskedFixtureView {
  fixtureId: string;
  /** true when score/result is hidden. */
  masked: boolean;
  /** Status is shown as a neutral "in progress / finished" without the score. */
  statusLabelKey: string;
  homeScoreText: string;
  awayScoreText: string;
}

function statusKey(snapshot: FixtureSnapshot): string {
  switch (snapshot.status) {
    case 'scheduled':
      return 'status.scheduled';
    case 'postponed':
      return 'status.postponed';
    case 'cancelled':
      return 'status.cancelled';
    case 'finished':
      return 'spoilers.finished_hidden';
    default:
      return 'spoilers.in_progress_hidden';
  }
}

/**
 * Return a masked or unmasked view of a fixture's score.
 * `mask` is the user's no-spoilers preference; scheduled matches are never
 * masked (no result to hide).
 */
export function maskFixture(fixture: Fixture, mask: boolean): MaskedFixtureView {
  const { snapshot } = fixture;
  const hasResult = snapshot.status !== 'scheduled' && snapshot.status !== 'postponed';
  const masked = mask && hasResult;

  return {
    fixtureId: fixture.id,
    masked,
    statusLabelKey: masked ? statusKey(snapshot) : `status.${snapshot.status}`,
    homeScoreText: masked ? MASKED_SCORE : String(snapshot.score.home),
    awayScoreText: masked ? MASKED_SCORE : String(snapshot.score.away),
  };
}

/** Filter events that would reveal the score for a no-spoilers timeline. */
export function maskEvents(events: readonly MatchEvent[], mask: boolean): MatchEvent[] {
  if (!mask) {
    return [...events];
  }
  const revealing = new Set([
    'goal',
    'own_goal',
    'penalty_goal',
    'goal_cancelled',
    'score_corrected',
    'fulltime',
    'match_ended',
  ]);
  return events.filter((e) => !revealing.has(e.kind));
}
