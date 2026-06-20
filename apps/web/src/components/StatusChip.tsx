'use client';

import { useT } from '@/lib/i18n';
import { statusIntent } from '@matchora/ui';
import { LIVE_STATUSES, type FixtureStatus, type MessageKey } from '@matchora/shared';

const STATUS_ICON: Record<FixtureStatus, string> = {
  scheduled: '🕒',
  live: '🔴',
  halftime: '⏸',
  extra_time: '⏱',
  penalties: '🥅',
  finished: '✓',
  postponed: '⏳',
  cancelled: '✕',
};

function statusKey(status: FixtureStatus): MessageKey {
  return `status.${status}` as MessageKey;
}

/**
 * Status chip — never color-only. Always pairs a token color with an icon AND
 * a translated text label. Shows the minute for live matches.
 */
export function StatusChip({
  status,
  minute,
}: {
  status: FixtureStatus;
  minute?: number | null;
}) {
  const t = useT();
  const intent = statusIntent[status] ?? statusIntent.scheduled!;
  const isLive = LIVE_STATUSES.includes(status);
  const showMinute = isLive && status !== 'halftime' && minute != null;

  return (
    <span
      className="inline-flex items-center gap-xs rounded-pill border px-sm py-[2px] text-caption font-bold"
      style={{ color: intent.color, borderColor: `${intent.color}55` }}
    >
      <span
        aria-hidden="true"
        className={intent.pulse ? 'live-pulse' : ''}
        style={{ lineHeight: 1 }}
      >
        {STATUS_ICON[status]}
      </span>
      <span>{t(statusKey(status))}</span>
      {showMinute ? <span aria-label="minute">{t('match.minute', { minute: minute! })}</span> : null}
    </span>
  );
}
