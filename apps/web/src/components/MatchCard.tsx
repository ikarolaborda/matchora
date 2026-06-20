'use client';

import Link from 'next/link';
import { useT, useI18n } from '@/lib/i18n';
import { usePreferences } from '@/lib/preferences';
import { TeamBadge } from './TeamBadge';
import { ScoreDisplay } from './ScoreDisplay';
import { StatusChip } from './StatusChip';
import {
  LIVE_STATUSES,
  formatKickoff,
  maskFixture,
  type Fixture,
  type Team,
  type MessageKey,
} from '@matchora/shared';

export interface MatchCardProps {
  fixture: Fixture;
  home: Team | null;
  away: Team | null;
}

export function MatchCard({ fixture, home, away }: MatchCardProps) {
  const t = useT();
  const { locale } = useI18n();
  const noSpoilers = usePreferences((s) => s.noSpoilers);
  const timeZone = usePreferences((s) => s.timeZone);
  const isFav = usePreferences((s) => s.favoriteFixtureIds.includes(fixture.id));
  const toggleFav = usePreferences((s) => s.toggleFavoriteFixture);

  const { status, minute, penalties } = fixture.snapshot;
  const isLive = LIVE_STATUSES.includes(status);
  const isScheduled = status === 'scheduled';
  const masked = maskFixture(fixture, noSpoilers);

  const homeLabel = home?.name ?? '—';
  const awayLabel = away?.name ?? '—';

  return (
    <article
      className="rounded-lg border border-border bg-surface p-md transition-colors hover:border-brand-dim"
      aria-label={`${homeLabel} vs ${awayLabel}`}
    >
      <div className="mb-sm flex items-center justify-between">
        <StatusChip status={status} minute={minute} />
        <button
          type="button"
          onClick={() => toggleFav(fixture.id)}
          aria-pressed={isFav}
          aria-label={isFav ? 'Remove favorite' : 'Add favorite'}
          className="rounded-md px-sm py-[2px] text-caption text-text-muted hover:text-brand"
        >
          <span aria-hidden="true">{isFav ? '★' : '☆'}</span>
        </button>
      </div>

      <Link
        href={`/matches/${fixture.id}`}
        data-testid="match-card-link"
        className="block focus:outline-none"
      >
        <div className="flex items-center justify-between gap-md">
          <div className="flex min-w-0 flex-1 flex-col gap-xs">
            <TeamRow team={home} label={homeLabel} />
            <TeamRow team={away} label={awayLabel} />
          </div>

          <div className="flex shrink-0 flex-col items-end gap-xs">
            {isScheduled ? (
              <time
                dateTime={fixture.kickoffAt}
                className="text-caption text-text-muted tabular-nums"
              >
                {formatKickoff(fixture.kickoffAt, locale, timeZone)}
              </time>
            ) : (
              <div aria-live={isLive ? 'polite' : 'off'} data-testid="score-region">
                <ScoreDisplay
                  homeText={masked.homeScoreText}
                  awayText={masked.awayScoreText}
                  penalties={masked.masked ? null : penalties}
                  size="md"
                />
              </div>
            )}
            {masked.masked ? (
              <span className="text-caption text-text-faint">
                {t(masked.statusLabelKey as MessageKey)}
              </span>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}

function TeamRow({ team, label }: { team: Team | null; label: string }) {
  return (
    <div className="flex items-center gap-sm">
      <TeamBadge team={team} size="sm" />
      <span className="truncate text-body">{label}</span>
    </div>
  );
}
