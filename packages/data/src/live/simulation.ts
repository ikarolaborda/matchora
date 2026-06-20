/**
 * Live simulation engine — emits plausible normalized events for live fixtures
 * and feeds them through the provider's ingest path (log + snapshot + hub).
 * Used by both the web server's auto-ticker and the `dev:simulate` CLI.
 */

import { generateEventId, type MatchEvent, type MatchEventKind, type TeamSide } from '@matchora/shared';
import type { MockFootballDataProvider } from '../mock/provider.js';

export interface SimulationOptions {
  /** ms between ticks */
  intervalMs?: number;
  /** deterministic seed for reproducible runs */
  seed?: number;
}

function rngFrom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class SimulationEngine {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly seqByFixture = new Map<string, number>();
  private readonly minuteByFixture = new Map<string, number>();
  private readonly rng: () => number;

  constructor(
    private readonly provider: MockFootballDataProvider,
    private readonly options: SimulationOptions = {},
  ) {
    this.rng = rngFrom(options.seed ?? 1337);
  }

  /** Generate and ingest the next event for one live fixture. Returns it. */
  async tickFixture(fixtureId: string): Promise<MatchEvent | null> {
    const snapshot = await this.provider.getLiveFixtureState(fixtureId);
    if (!snapshot || snapshot.status === 'finished') {
      return null;
    }
    const seq = (this.seqByFixture.get(fixtureId) ?? snapshot.lastSequence) + 1;
    this.seqByFixture.set(fixtureId, seq);

    let minute = this.minuteByFixture.get(fixtureId) ?? snapshot.minute ?? 0;
    minute = Math.min(95, minute + 1 + Math.floor(this.rng() * 3));
    this.minuteByFixture.set(fixtureId, minute);

    const { kind, side } = this.pickEvent(minute);
    const event: MatchEvent = {
      eventId: generateEventId(),
      fixtureId,
      sequence: seq,
      kind,
      matchClock: minute,
      side,
      teamId: null,
      playerId: null,
      payload: kind === 'match_ended' ? { status: 'finished' } : {},
      emittedAt: new Date().toISOString(),
      source: 'mock-sim',
      externalId: null,
      correctionOf: null,
    };
    this.provider.ingest(event);
    return event;
  }

  private pickEvent(minute: number): { kind: MatchEventKind; side: TeamSide | null } {
    if (minute >= 95) {
      return { kind: 'match_ended', side: null };
    }
    const roll = this.rng();
    const side: TeamSide = this.rng() < 0.5 ? 'home' : 'away';
    if (roll < 0.12) {
      return { kind: 'goal', side };
    }
    if (roll < 0.18) {
      return { kind: 'yellow_card', side };
    }
    if (roll < 0.2) {
      return { kind: 'red_card', side };
    }
    if (Math.abs(minute - 45) < 1) {
      return { kind: 'halftime', side: null };
    }
    return { kind: 'period_started', side: null };
  }

  /** Start ticking all currently-live fixtures on an interval. */
  start(): void {
    if (this.timer) {
      return;
    }
    const interval = this.options.intervalMs ?? 4000;
    this.timer = setInterval(() => {
      for (const id of this.provider.liveFixtureIds) {
        void this.tickFixture(id);
      }
    }, interval);
    // do not keep the Node process alive solely for the simulator
    if (typeof this.timer === 'object' && 'unref' in this.timer) {
      (this.timer as { unref: () => void }).unref();
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
