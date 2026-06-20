'use client';

import { useT } from '@/lib/i18n';
import type { ConnectionState } from '@matchora/shared';

const META: Record<
  ConnectionState,
  { key: 'conn.live' | 'conn.connecting' | 'conn.reconnecting' | 'conn.stale'; dot: string; icon: string }
> = {
  live: { key: 'conn.live', dot: 'bg-live', icon: '●' },
  connecting: { key: 'conn.connecting', dot: 'bg-warn', icon: '◐' },
  reconnecting: { key: 'conn.reconnecting', dot: 'bg-warn', icon: '◌' },
  stale: { key: 'conn.stale', dot: 'bg-text-faint', icon: '⚠' },
};

export function ConnectionIndicator({ state }: { state: ConnectionState }) {
  const t = useT();
  const meta = META[state];
  return (
    <span
      className="inline-flex items-center gap-xs text-caption text-text-muted"
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        className={`inline-block h-2 w-2 rounded-pill ${meta.dot} ${
          state === 'live' ? 'live-pulse' : ''
        }`}
      />
      <span aria-hidden="true">{meta.icon}</span>
      <span>{t(meta.key)}</span>
    </span>
  );
}
