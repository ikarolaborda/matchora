import { describe, expect, it } from 'vitest';
import { applyEvent, buildSnapshot, emptySnapshot, generateEventId } from '../events.js';
import { event } from './factory.js';

describe('applyEvent', () => {
  it('applies goals to the correct side', () => {
    let s = emptySnapshot('f1');
    s = applyEvent(s, event('f1', 'match_started', { sequence: 1, matchClock: 0 }));
    s = applyEvent(s, event('f1', 'goal', { sequence: 2, side: 'home', matchClock: 23 }));
    s = applyEvent(s, event('f1', 'goal', { sequence: 3, side: 'away', matchClock: 40 }));
    s = applyEvent(s, event('f1', 'goal', { sequence: 4, side: 'home', matchClock: 77 }));
    expect(s.score).toEqual({ home: 2, away: 1 });
    expect(s.status).toBe('live');
    expect(s.minute).toBe(77);
  });

  it('credits own goals to the opposing side', () => {
    let s = emptySnapshot('f1');
    s = applyEvent(s, event('f1', 'own_goal', { sequence: 1, side: 'home' }));
    expect(s.score).toEqual({ home: 0, away: 1 });
  });

  it('is idempotent: stale or duplicate sequence is ignored', () => {
    let s = emptySnapshot('f1');
    const goal = event('f1', 'goal', { sequence: 5, side: 'home' });
    s = applyEvent(s, goal);
    const after = applyEvent(s, goal); // same sequence again
    expect(after.score).toEqual({ home: 1, away: 0 });
    const older = applyEvent(after, event('f1', 'goal', { sequence: 3, side: 'home' }));
    expect(older.score).toEqual({ home: 1, away: 0 });
  });

  it('handles VAR-cancelled goal via authoritative score payload', () => {
    let s = emptySnapshot('f1');
    s = applyEvent(s, event('f1', 'goal', { sequence: 1, side: 'home' }));
    s = applyEvent(s, event('f1', 'goal', { sequence: 2, side: 'home' }));
    s = applyEvent(s, event('f1', 'goal_cancelled', { sequence: 3, side: 'home', score: { home: 1, away: 0 } }));
    expect(s.score).toEqual({ home: 1, away: 0 });
  });

  it('tracks red cards and substitutions without affecting score', () => {
    let s = emptySnapshot('f1');
    s = applyEvent(s, event('f1', 'red_card', { sequence: 1, side: 'away' }));
    s = applyEvent(s, event('f1', 'substitution', { sequence: 2, side: 'home' }));
    expect(s.redCards).toEqual({ home: 0, away: 1 });
    expect(s.score).toEqual({ home: 0, away: 0 });
  });

  it('finishes the match and records penalties', () => {
    let s = emptySnapshot('f1');
    s = applyEvent(s, event('f1', 'match_started', { sequence: 1 }));
    s = applyEvent(s, event('f1', 'match_ended', { sequence: 2, penalties: { home: 4, away: 3 } }));
    expect(s.status).toBe('finished');
    expect(s.penalties).toEqual({ home: 4, away: 3 });
  });
});

describe('buildSnapshot', () => {
  it('deduplicates by eventId and folds in sequence order regardless of input order', () => {
    const events = [
      event('f1', 'goal', { sequence: 3, side: 'home', eventId: 'a' }),
      event('f1', 'match_started', { sequence: 1, eventId: 'b' }),
      event('f1', 'goal', { sequence: 2, side: 'away', eventId: 'c' }),
      event('f1', 'goal', { sequence: 3, side: 'home', eventId: 'a' }), // duplicate
    ];
    const s = buildSnapshot('f1', events);
    expect(s.score).toEqual({ home: 1, away: 1 });
    expect(s.lastSequence).toBe(3);
  });

  it('ignores events from other fixtures', () => {
    const s = buildSnapshot('f1', [event('f2', 'goal', { sequence: 1, side: 'home' })]);
    expect(s.score).toEqual({ home: 0, away: 0 });
  });
});

describe('generateEventId', () => {
  it('produces sortable, unique-ish ids', () => {
    const a = generateEventId(1_000);
    const b = generateEventId(2_000);
    expect(a).not.toEqual(b);
    expect(a < b).toBe(true);
  });
});
