import { describe, expect, it } from 'vitest';
import {
  apiError,
  fixturesQuerySchema,
  matchEventSchema,
  simulateRequestSchema,
} from '../schemas.js';
import { event } from './factory.js';

describe('schema validation', () => {
  it('accepts a valid match event', () => {
    const e = { ...event('f1', 'goal', { sequence: 1, side: 'home' }) };
    const parsed = matchEventSchema.safeParse(e);
    expect(parsed.success).toBe(true);
  });

  it('rejects an event with a negative sequence', () => {
    const e = { ...event('f1', 'goal', { sequence: 1, side: 'home' }), sequence: -1 };
    expect(matchEventSchema.safeParse(e).success).toBe(false);
  });

  it('validates the fixtures query date format', () => {
    expect(fixturesQuerySchema.safeParse({ date: '2026-06-13' }).success).toBe(true);
    expect(fixturesQuerySchema.safeParse({ date: '13/06/2026' }).success).toBe(false);
  });

  it('validates a simulate request shape', () => {
    const ok = simulateRequestSchema.safeParse({
      competitionId: 'comp',
      groupId: 'A',
      overrides: [{ fixtureId: 'm1', score: { home: 1, away: 0 } }],
    });
    expect(ok.success).toBe(true);
  });

  it('builds a consistent error shape', () => {
    const err = apiError('not_found', 'Fixture not found');
    expect(err.error.code).toBe('not_found');
    expect(err.error.message).toBe('Fixture not found');
  });
});
