import { describe, expect, it } from 'vitest';
import { MASKED_SCORE, maskEvents, maskFixture } from '../spoilers.js';
import { event, fixture } from './factory.js';

describe('no-spoilers masking', () => {
  it('hides the score of a finished match when enabled', () => {
    const fx = fixture('m1', 't1', 't2', { status: 'finished', score: { home: 2, away: 1 } });
    const masked = maskFixture(fx, true);
    expect(masked.masked).toBe(true);
    expect(masked.homeScoreText).toBe(MASKED_SCORE);
    expect(masked.awayScoreText).toBe(MASKED_SCORE);
    expect(masked.statusLabelKey).toBe('spoilers.finished_hidden');
  });

  it('does not mask scheduled matches (no result to hide)', () => {
    const fx = fixture('m1', 't1', 't2', { status: 'scheduled' });
    const masked = maskFixture(fx, true);
    expect(masked.masked).toBe(false);
    expect(masked.statusLabelKey).toBe('status.scheduled');
  });

  it('shows the real score when masking is off', () => {
    const fx = fixture('m1', 't1', 't2', { status: 'live', score: { home: 1, away: 0 } });
    const masked = maskFixture(fx, false);
    expect(masked.homeScoreText).toBe('1');
    expect(masked.masked).toBe(false);
  });

  it('filters score-revealing events from the timeline', () => {
    const events = [
      event('m1', 'match_started', { sequence: 1 }),
      event('m1', 'goal', { sequence: 2, side: 'home' }),
      event('m1', 'yellow_card', { sequence: 3, side: 'away' }),
      event('m1', 'fulltime', { sequence: 4 }),
    ];
    const masked = maskEvents(events, true);
    expect(masked.map((e) => e.kind)).toEqual(['match_started', 'yellow_card']);
    expect(maskEvents(events, false)).toHaveLength(4);
  });
});
