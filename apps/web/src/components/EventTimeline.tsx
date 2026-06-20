'use client';

import { useT } from '@/lib/i18n';
import { maskEvents, type MatchEvent, type Team } from '@matchora/shared';

const KIND_ICON: Record<string, string> = {
  goal: '⚽',
  penalty_goal: '⚽',
  own_goal: '⚽',
  penalty_missed: '✗',
  yellow_card: '🟨',
  second_yellow: '🟨🟥',
  red_card: '🟥',
  substitution: '🔄',
  var_review_started: '📺',
  var_decision: '📺',
  goal_cancelled: '🚫',
  score_corrected: '✎',
  card_corrected: '✎',
  match_started: '▶',
  period_started: '▶',
  period_ended: '⏸',
  halftime: '⏸',
  fulltime: '⏹',
  match_ended: '⏹',
};

export function EventTimeline({
  events,
  teams,
  noSpoilers,
}: {
  events: MatchEvent[];
  teams: Map<string, Team>;
  noSpoilers: boolean;
}) {
  const t = useT();
  const visible = maskEvents(events, noSpoilers).sort((a, b) => a.sequence - b.sequence);

  if (visible.length === 0) {
    return <p className="text-body text-text-muted">{t('home.empty')}</p>;
  }

  return (
    <ol className="flex flex-col gap-sm" aria-live="polite">
      {visible.map((ev) => {
        const team = ev.teamId ? teams.get(ev.teamId) : undefined;
        return (
          <li
            key={ev.eventId}
            className="flex items-center gap-sm rounded-md border border-border bg-surface px-md py-sm"
          >
            <span className="w-10 shrink-0 text-caption tabular-nums text-text-muted">
              {ev.matchClock != null ? `${ev.matchClock}'` : '—'}
            </span>
            <span aria-hidden="true">{KIND_ICON[ev.kind] ?? '•'}</span>
            <span className="text-body">
              <span className="capitalize">{ev.kind.replace(/_/g, ' ')}</span>
              {team ? <span className="text-text-muted"> — {team.name}</span> : null}
              {ev.payload.note ? (
                <span className="text-text-faint"> ({ev.payload.note})</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
