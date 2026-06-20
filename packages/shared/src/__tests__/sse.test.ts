import { describe, expect, it } from 'vitest';
import { parseResumeCursor, parseSseData, serializeSse } from '../sse.js';
import type { LiveMessage } from '../sse.js';
import { emptySnapshot } from '../events.js';
import { event } from './factory.js';

describe('SSE serialization', () => {
  it('serializes an event frame with an id for Last-Event-ID resume', () => {
    const msg: LiveMessage = { type: 'event', event: event('f1', 'goal', { sequence: 12, side: 'home' }) };
    const frame = serializeSse(msg);
    expect(frame).toContain('id: 12');
    expect(frame).toContain('event: match_event');
    expect(frame.endsWith('\n\n')).toBe(true);
  });

  it('round-trips snapshot frames through parse', () => {
    const snapshot = emptySnapshot('f1');
    const msg: LiveMessage = { type: 'snapshot', fixtureId: 'f1', sequence: 0, snapshot };
    const frame = serializeSse(msg);
    const dataLine = frame.split('\n').find((l) => l.startsWith('data: '))!.slice(6);
    const parsed = parseSseData(dataLine);
    expect(parsed).toEqual(msg);
  });

  it('parses the resume cursor from Last-Event-ID', () => {
    expect(parseResumeCursor('42')).toBe(42);
    expect(parseResumeCursor(null)).toBeNull();
    expect(parseResumeCursor('not-a-number')).toBeNull();
  });
});
