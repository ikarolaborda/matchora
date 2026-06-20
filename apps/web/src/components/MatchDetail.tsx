'use client';

import { useMemo } from 'react';
import { useT, useI18n } from '@/lib/i18n';
import { usePreferences } from '@/lib/preferences';
import { useLiveFixture } from '@/hooks/useLiveFixture';
import { TeamBadge } from './TeamBadge';
import { ScoreDisplay } from './ScoreDisplay';
import { StatusChip } from './StatusChip';
import { ConnectionIndicator } from './ConnectionIndicator';
import { EventTimeline } from './EventTimeline';
import { StandingsTable } from './StandingsTable';
import { NoSpoilersToggle } from './NoSpoilersToggle';
import { SectionHeading } from './SectionHeading';
import {
  LIVE_STATUSES,
  formatKickoff,
  maskFixture,
  type Fixture,
  type GroupStanding,
  type MatchEvent,
  type MessageKey,
  type Team,
} from '@matchora/shared';

export interface MatchDetailProps {
  fixture: Fixture;
  teams: Team[];
  initialEvents: MatchEvent[];
  groupStanding: GroupStanding | null;
  advancePerGroup: number;
}

export function MatchDetail({
  fixture,
  teams,
  initialEvents,
  groupStanding,
  advancePerGroup,
}: MatchDetailProps) {
  const t = useT();
  const { locale } = useI18n();
  const timeZone = usePreferences((s) => s.timeZone);
  const noSpoilers = usePreferences((s) => s.noSpoilers);
  const favFixture = usePreferences((s) => s.favoriteFixtureIds.includes(fixture.id));
  const toggleFav = usePreferences((s) => s.toggleFavoriteFixture);

  const teamMap = useMemo(() => new Map(teams.map((tm) => [tm.id, tm])), [teams]);
  const home = fixture.homeTeamId ? (teamMap.get(fixture.homeTeamId) ?? null) : null;
  const away = fixture.awayTeamId ? (teamMap.get(fixture.awayTeamId) ?? null) : null;

  const isLive = LIVE_STATUSES.includes(fixture.snapshot.status);
  const { snapshot, events: liveEvents, connection } = useLiveFixture(
    fixture.id,
    fixture.snapshot,
    isLive,
  );

  const current = snapshot ?? fixture.snapshot;
  const merged: Fixture = { ...fixture, snapshot: current };
  const masked = maskFixture(merged, noSpoilers);

  // Merge initial + live events, dedup by eventId.
  const allEvents = useMemo(() => {
    const map = new Map<string, MatchEvent>();
    for (const e of initialEvents) map.set(e.eventId, e);
    for (const e of liveEvents) map.set(e.eventId, e);
    return [...map.values()];
  }, [initialEvents, liveEvents]);

  return (
    <article>
      <div className="mb-md flex items-center justify-between gap-md">
        <div className="flex items-center gap-md">
          <StatusChip status={current.status} minute={current.minute} />
          {isLive ? <ConnectionIndicator state={connection} /> : null}
        </div>
        <div className="flex items-center gap-md">
          <NoSpoilersToggle />
          <button
            type="button"
            onClick={() => toggleFav(fixture.id)}
            aria-pressed={favFixture}
            aria-label={favFixture ? 'Remove favorite' : 'Add favorite'}
            className="rounded-md text-title text-text-muted hover:text-brand"
          >
            <span aria-hidden="true">{favFixture ? '★' : '☆'}</span>
          </button>
        </div>
      </div>

      <section
        className="rounded-lg border border-border bg-surface p-lg"
        aria-label="Score"
      >
        <div className="flex items-center justify-between gap-md">
          <div className="flex flex-col items-center gap-sm text-center">
            <TeamBadge team={home} size="lg" />
            <span className="text-body">{home?.name ?? '—'}</span>
          </div>

          <div
            className="flex flex-col items-center"
            aria-live={isLive ? 'polite' : 'off'}
            data-testid="score-region"
          >
            {current.status === 'scheduled' ? (
              <time dateTime={fixture.kickoffAt} className="text-title tabular-nums">
                {formatKickoff(fixture.kickoffAt, locale, timeZone)}
              </time>
            ) : (
              <ScoreDisplay
                homeText={masked.homeScoreText}
                awayText={masked.awayScoreText}
                penalties={masked.masked ? null : current.penalties}
                size="lg"
              />
            )}
            {masked.masked ? (
              <span className="mt-sm text-caption text-text-faint">
                {t(masked.statusLabelKey as MessageKey)}
              </span>
            ) : null}
          </div>

          <div className="flex flex-col items-center gap-sm text-center">
            <TeamBadge team={away} size="lg" />
            <span className="text-body">{away?.name ?? '—'}</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="timeline-heading">
        <SectionHeading>
          <span id="timeline-heading">{t('match.timeline')}</span>
        </SectionHeading>
        <EventTimeline events={allEvents} teams={teamMap} noSpoilers={noSpoilers} />
      </section>

      <div className="grid gap-md sm:grid-cols-2">
        <section aria-labelledby="lineups-heading">
          <SectionHeading>
            <span id="lineups-heading">{t('match.lineups')}</span>
          </SectionHeading>
          <Placeholder label={t('match.lineups')} />
        </section>
        <section aria-labelledby="stats-heading">
          <SectionHeading>
            <span id="stats-heading">{t('match.stats')}</span>
          </SectionHeading>
          <Placeholder label={t('match.stats')} />
        </section>
      </div>

      {groupStanding ? (
        <section aria-labelledby="impact-heading">
          <SectionHeading>
            <span id="impact-heading">{t('match.impact')}</span>
          </SectionHeading>
          <StandingsTable
            standing={groupStanding}
            teams={teamMap}
            advancePerGroup={advancePerGroup}
          />
        </section>
      ) : null}
    </article>
  );
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface p-lg text-center text-caption text-text-faint">
      {label} · —
    </div>
  );
}
