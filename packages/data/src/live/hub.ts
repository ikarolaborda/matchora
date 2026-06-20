/**
 * LiveHub — in-process fanout for live match events with a bounded per-fixture
 * ring buffer for SSE resume. This is the in-memory analog of the reference
 * design's Score Service + Redis Pub/Sub. A LiveTransport abstraction lets a
 * Redis/Valkey implementation drop in for multi-process deployments; the
 * default in-memory transport requires no external services.
 */

import type { MatchEvent } from '@matchora/shared';

export interface LiveTransport {
  publish(channel: string, event: MatchEvent): void;
  subscribe(channel: string, listener: (event: MatchEvent) => void): () => void;
}

/** Default transport: single-process EventEmitter-style map. */
export class InMemoryTransport implements LiveTransport {
  private readonly channels = new Map<string, Set<(event: MatchEvent) => void>>();

  publish(channel: string, event: MatchEvent): void {
    const set = this.channels.get(channel);
    if (!set) {
      return;
    }
    for (const listener of set) {
      listener(event);
    }
  }

  subscribe(channel: string, listener: (event: MatchEvent) => void): () => void {
    let set = this.channels.get(channel);
    if (!set) {
      set = new Set();
      this.channels.set(channel, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
    };
  }
}

const DEFAULT_BUFFER = 256;

export class LiveHub {
  private readonly buffers = new Map<string, MatchEvent[]>();

  constructor(
    private readonly transport: LiveTransport = new InMemoryTransport(),
    private readonly bufferSize = DEFAULT_BUFFER,
  ) {}

  private channel(fixtureId: string): string {
    return `fixture:${fixtureId}`;
  }

  /** Publish an event, append it to the fixture's bounded ring buffer. */
  publish(event: MatchEvent): void {
    const buf = this.buffers.get(event.fixtureId) ?? [];
    buf.push(event);
    if (buf.length > this.bufferSize) {
      buf.splice(0, buf.length - this.bufferSize);
    }
    this.buffers.set(event.fixtureId, buf);
    this.transport.publish(this.channel(event.fixtureId), event);
  }

  subscribe(fixtureId: string, listener: (event: MatchEvent) => void): () => void {
    return this.transport.subscribe(this.channel(fixtureId), listener);
  }

  /**
   * Replay buffered events after a sequence cursor. Returns null when the
   * cursor is older than the buffer's earliest event (caller must fall back to
   * a full snapshot) — this is the "stale cursor" branch from the design review.
   */
  replay(fixtureId: string, afterSequence: number | null): MatchEvent[] | null {
    const buf = this.buffers.get(fixtureId) ?? [];
    if (afterSequence === null) {
      return [];
    }
    const earliest = buf[0]?.sequence ?? Infinity;
    if (buf.length > 0 && afterSequence + 1 < earliest) {
      return null; // cursor fell out of the buffer → snapshot fallback
    }
    return buf.filter((e) => e.sequence > afterSequence);
  }

  bufferedCount(fixtureId: string): number {
    return this.buffers.get(fixtureId)?.length ?? 0;
  }
}
