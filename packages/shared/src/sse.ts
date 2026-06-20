/**
 * SSE wire format for live match updates.
 *
 * The stream carries two message types: `snapshot` (full current state, sent on
 * connect and on stale-cursor reconnect) and `event` (a single normalized
 * match event delta). Resume is driven by the event `sequence` via the
 * standard `Last-Event-ID` header — NOT wall-clock time.
 */

import type { FixtureSnapshot, MatchEvent } from './types.js';

export type LiveMessage =
  | { type: 'snapshot'; fixtureId: string; sequence: number; snapshot: FixtureSnapshot }
  | { type: 'event'; event: MatchEvent }
  | { type: 'heartbeat'; at: string };

/** Serialize a message into an SSE frame. `id:` enables Last-Event-ID resume. */
export function serializeSse(message: LiveMessage): string {
  if (message.type === 'event') {
    return [
      `id: ${message.event.sequence}`,
      'event: match_event',
      `data: ${JSON.stringify(message)}`,
      '',
      '',
    ].join('\n');
  }

  if (message.type === 'snapshot') {
    return [
      `id: ${message.sequence}`,
      'event: snapshot',
      `data: ${JSON.stringify(message)}`,
      '',
      '',
    ].join('\n');
  }

  return ['event: heartbeat', `data: ${JSON.stringify(message)}`, '', ''].join('\n');
}

/** Parse a single SSE `data:` line payload back into a LiveMessage. */
export function parseSseData(data: string): LiveMessage {
  return JSON.parse(data) as LiveMessage;
}

/** Read the resume cursor from a Last-Event-ID header value. */
export function parseResumeCursor(lastEventId: string | null | undefined): number | null {
  if (!lastEventId) {
    return null;
  }
  const n = Number(lastEventId);
  return Number.isFinite(n) ? n : null;
}

export type ConnectionState = 'connecting' | 'live' | 'reconnecting' | 'stale';
