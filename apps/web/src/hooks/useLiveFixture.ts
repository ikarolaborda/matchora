'use client';

import { useEffect, useRef, useState } from 'react';
import {
  applyEvent,
  parseSseData,
  type ConnectionState,
  type FixtureSnapshot,
  type MatchEvent,
} from '@matchora/shared';

interface LiveFixtureResult {
  snapshot: FixtureSnapshot | null;
  events: MatchEvent[];
  connection: ConnectionState;
}

/**
 * Subscribe to a fixture's live SSE stream with automatic reconnect and an
 * exposed connection state. The browser EventSource handles Last-Event-ID
 * resume natively; we fold incoming events into a running snapshot.
 */
export function useLiveFixture(
  fixtureId: string,
  initialSnapshot: FixtureSnapshot | null,
  enabled = true,
): LiveFixtureResult {
  const [snapshot, setSnapshot] = useState<FixtureSnapshot | null>(initialSnapshot);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const snapshotRef = useRef<FixtureSnapshot | null>(initialSnapshot);
  const staleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    snapshotRef.current = initialSnapshot;
    setSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    let closed = false;
    setConnection('connecting');

    const url = `/api/live/matches/${encodeURIComponent(fixtureId)}/events`;
    const source = new EventSource(url);

    const armStaleTimer = () => {
      if (staleTimer.current) {
        clearTimeout(staleTimer.current);
      }
      // No traffic (incl. heartbeat) within 30s → mark stale.
      staleTimer.current = setTimeout(() => {
        if (!closed) {
          setConnection('stale');
        }
      }, 30_000);
    };

    const onSnapshot = (e: MessageEvent) => {
      armStaleTimer();
      setConnection('live');
      const msg = parseSseData(e.data);
      if (msg.type === 'snapshot') {
        snapshotRef.current = msg.snapshot;
        setSnapshot(msg.snapshot);
      }
    };

    const onMatchEvent = (e: MessageEvent) => {
      armStaleTimer();
      setConnection('live');
      const msg = parseSseData(e.data);
      if (msg.type === 'event') {
        const ev = msg.event;
        setEvents((prev) =>
          prev.some((p) => p.eventId === ev.eventId) ? prev : [...prev, ev],
        );
        const base = snapshotRef.current;
        if (base) {
          const next = applyEvent(base, ev);
          snapshotRef.current = next;
          setSnapshot(next);
        }
      }
    };

    const onHeartbeat = () => {
      armStaleTimer();
      setConnection('live');
    };

    const onError = () => {
      if (closed) {
        return;
      }
      // EventSource auto-reconnects; reflect the transient state.
      setConnection(source.readyState === EventSource.CLOSED ? 'reconnecting' : 'reconnecting');
    };

    source.addEventListener('snapshot', onSnapshot as EventListener);
    source.addEventListener('match_event', onMatchEvent as EventListener);
    source.addEventListener('heartbeat', onHeartbeat as EventListener);
    source.addEventListener('open', () => setConnection('live'));
    source.addEventListener('error', onError);

    armStaleTimer();

    return () => {
      closed = true;
      if (staleTimer.current) {
        clearTimeout(staleTimer.current);
      }
      source.close();
    };
  }, [fixtureId, enabled]);

  return { snapshot, events, connection };
}
