/**
 * useLiveMatch — live match state over SSE with a polling fallback.
 *
 * Strategy (see packages/SHARED_API.md "SSE contract"):
 *   - Baseline: React Query polls GET /api/fixtures/{id} (the existing, robust
 *     path). This always runs and seeds the initial fixture + events.
 *   - Upgrade: when react-native-sse's EventSource is available AND the feature
 *     flag is on, open GET ${API_BASE}/api/live/matches/{id}/events and consume
 *     `snapshot` + `match_event` frames live. While SSE is healthy we SLOW the
 *     poll down (it becomes a safety net), and we resume with Last-Event-ID
 *     (react-native-sse tracks the `id:` and resends it on reconnect).
 *   - Fallback: if EventSource is missing (Hermes/runtime quirk) or errors
 *     repeatedly, we disable SSE for this screen and let polling drive at full
 *     speed. The UI never gets stuck.
 *
 * The wire `event:` names are `snapshot` and `match_event` (the shared
 * LiveMessage `type` for an event is `'event'`); we key off the wire name.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  applyEvent,
  buildSnapshot,
  parseSseData,
  type ConnectionState,
  type Fixture,
  type FixtureSnapshot,
  type MatchEvent,
} from '@matchora/shared';
import { fetchFixture, getBackendUrl } from '@/src/api';

/* ── react-native-sse capability check ──────────────────────────────────────
 * Loaded lazily and defensively: a require() failure (module missing, Hermes
 * issue) must NOT crash the screen — we just fall back to polling. */
type RnEventSourceEvent = {
  type: string;
  data?: string | null;
  lastEventId?: string | null;
  message?: string;
};
type RnEventSourceListener = (event: RnEventSourceEvent) => void;
interface RnEventSource {
  addEventListener(type: string, listener: RnEventSourceListener): void;
  removeAllEventListeners(): void;
  close(): void;
}
type RnEventSourceCtor = new (
  url: string,
  options?: {
    headers?: Record<string, string>;
    pollingInterval?: number;
    timeout?: number;
    debug?: boolean;
  },
) => RnEventSource;

let cachedCtor: RnEventSourceCtor | null | undefined;
function getEventSourceCtor(): RnEventSourceCtor | null {
  if (cachedCtor !== undefined) return cachedCtor;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-sse') as { default?: RnEventSourceCtor } | RnEventSourceCtor;
    const ctor = (mod as { default?: RnEventSourceCtor }).default ?? (mod as RnEventSourceCtor);
    cachedCtor = typeof ctor === 'function' ? ctor : null;
  } catch {
    cachedCtor = null;
  }
  return cachedCtor;
}

/** True when the SSE EventSource implementation is present at runtime. */
export function isSseSupported(): boolean {
  return getEventSourceCtor() !== null;
}

/** Default feature flag: on iOS/Android when the module is available. Override
 * via the hook option for kill-switch / experimentation. */
const SSE_DEFAULT_ENABLED = true;
const MAX_SSE_ERRORS = 4; // consecutive errors before we give up on SSE
const POLL_FAST = 5_000; // baseline poll (also the fallback rate)
const POLL_SLOW = 30_000; // safety-net poll while SSE is healthy
const STALE_AFTER = 25_000; // no frame/heartbeat for this long → "stale"

export interface LiveMatch {
  fixture: Fixture | null;
  events: MatchEvent[];
  connection: ConnectionState;
  /** True while the initial fixture load is in flight. */
  isLoading: boolean;
  /** Set when the baseline load failed and we have nothing to show. */
  error: Error | null;
  /** True when SSE is the active transport (vs. polling fallback). */
  usingSse: boolean;
  /** Force a fresh baseline fetch (pull-to-refresh / retry). */
  refetch: () => void;
}

export interface UseLiveMatchOptions {
  /** Kill switch / experiment flag. Default true. */
  enabled?: boolean;
  /** Override SSE on/off independently of capability. Default: capability. */
  sse?: boolean;
}

export function useLiveMatch(
  id: string | undefined,
  options: UseLiveMatchOptions = {},
): LiveMatch {
  const enabled = options.enabled ?? true;
  const sseRequested = options.sse ?? SSE_DEFAULT_ENABLED;

  // SSE is "live" once we've decided to keep using it (no fatal error streak).
  const [sseActive, setSseActive] = useState<boolean>(
    () => sseRequested && isSseSupported(),
  );
  const [connection, setConnection] = useState<ConnectionState>('connecting');

  // Live overlay state, layered on top of the polled baseline.
  const [liveSnapshot, setLiveSnapshot] = useState<FixtureSnapshot | null>(null);
  const [liveEvents, setLiveEvents] = useState<Map<number, MatchEvent>>(new Map());

  // Baseline: poll the REST fixture. Slows down while SSE is healthy.
  const query = useQuery({
    queryKey: ['fixture', id],
    queryFn: () => fetchFixture(id as string),
    enabled: enabled && !!id,
    refetchInterval: sseActive && connection === 'live' ? POLL_SLOW : POLL_FAST,
  });

  const esRef = useRef<RnEventSource | null>(null);
  const errorCountRef = useRef(0);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markActivity = useCallback(() => {
    if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
    staleTimerRef.current = setTimeout(() => setConnection('stale'), STALE_AFTER);
  }, []);

  // Open / tear down the SSE stream.
  useEffect(() => {
    if (!enabled || !id || !sseActive) return;
    const Ctor = getEventSourceCtor();
    if (!Ctor) {
      setSseActive(false);
      return;
    }

    // No backend configured yet: skip SSE; polling (which also no-ops/errors
    // gracefully) will resume once a URL is set.
    const base = getBackendUrl();
    if (base === '') {
      setSseActive(false);
      return;
    }

    setConnection('connecting');
    const url = `${base}/api/live/matches/${encodeURIComponent(id)}/events`;
    let es: RnEventSource;
    try {
      es = new Ctor(url, { pollingInterval: POLL_FAST });
    } catch {
      setSseActive(false);
      return;
    }
    esRef.current = es;

    const onOpen = () => {
      errorCountRef.current = 0;
      setConnection('live');
      markActivity();
    };

    const onSnapshot = (e: RnEventSourceEvent) => {
      markActivity();
      setConnection('live');
      if (!e.data) return;
      try {
        const msg = parseSseData(e.data);
        if (msg.type === 'snapshot') {
          setLiveSnapshot(msg.snapshot);
          // A fresh snapshot supersedes prior live events (stale-cursor reset).
          setLiveEvents(new Map());
        }
      } catch {
        // ignore malformed frame; baseline poll covers us
      }
    };

    const onMatchEvent = (e: RnEventSourceEvent) => {
      markActivity();
      setConnection('live');
      if (!e.data) return;
      try {
        const msg = parseSseData(e.data);
        if (msg.type === 'event') {
          const ev = msg.event;
          setLiveEvents((prev) => {
            if (prev.has(ev.sequence)) return prev; // idempotent by sequence
            const next = new Map(prev);
            next.set(ev.sequence, ev);
            return next;
          });
        }
      } catch {
        // ignore malformed frame
      }
    };

    const onHeartbeat = () => markActivity();

    const onError = () => {
      errorCountRef.current += 1;
      if (errorCountRef.current >= MAX_SSE_ERRORS) {
        // Give up on SSE for this screen; polling takes over at full speed.
        setSseActive(false);
        setConnection('stale');
      } else {
        setConnection('reconnecting');
      }
    };

    es.addEventListener('open', onOpen);
    es.addEventListener('snapshot', onSnapshot);
    es.addEventListener('match_event', onMatchEvent);
    es.addEventListener('heartbeat', onHeartbeat);
    es.addEventListener('error', onError);

    return () => {
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current);
      es.removeAllEventListeners();
      es.close();
      esRef.current = null;
    };
  }, [enabled, id, sseActive, markActivity]);

  // Reset live overlay when the fixture id changes.
  useEffect(() => {
    setLiveSnapshot(null);
    setLiveEvents(new Map());
    errorCountRef.current = 0;
    setSseActive(sseRequested && isSseSupported());
    setConnection('connecting');
  }, [id, sseRequested]);

  // Merge: baseline (polled) events + live events, deduped by sequence.
  const merged = useMemo(() => {
    const base = query.data;
    if (!base) {
      return { fixture: null as Fixture | null, events: [] as MatchEvent[] };
    }

    const bySeq = new Map<number, MatchEvent>();
    for (const ev of base.events) bySeq.set(ev.sequence, ev);
    for (const [seq, ev] of liveEvents) bySeq.set(seq, ev);
    const events = Array.from(bySeq.values()).sort((a, b) => a.sequence - b.sequence);

    // Choose the freshest snapshot: prefer the SSE snapshot when its lastSequence
    // is at least as advanced as the polled one; otherwise rebuild from events so
    // late-arriving live events are reflected even before the next poll.
    let snapshot: FixtureSnapshot = base.fixture.snapshot;
    if (liveSnapshot && liveSnapshot.lastSequence >= snapshot.lastSequence) {
      snapshot = liveSnapshot;
    }
    if (events.length > 0 && events[events.length - 1].sequence > snapshot.lastSequence) {
      // Fold any events newer than the snapshot on top of it.
      let folded = snapshot;
      try {
        // Rebuild deterministically from the full ordered event list when the
        // base snapshot is behind (cheap; event counts are small per match).
        folded = buildSnapshot(base.fixture.id, events);
      } catch {
        // Fallback: apply only the newer-than-snapshot tail.
        for (const ev of events) {
          if (ev.sequence > snapshot.lastSequence) folded = applyEvent(folded, ev);
        }
      }
      snapshot = folded;
    }

    const fixture: Fixture = { ...base.fixture, snapshot };
    return { fixture, events };
  }, [query.data, liveEvents, liveSnapshot]);

  // When SSE is off, connection state simply reflects the poll lifecycle.
  const effectiveConnection: ConnectionState = sseActive
    ? connection
    : query.isError
      ? 'stale'
      : query.isFetching && !query.data
        ? 'connecting'
        : 'live';

  return {
    fixture: merged.fixture,
    events: merged.events,
    connection: effectiveConnection,
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
    usingSse: sseActive,
    refetch: () => void query.refetch(),
  };
}
