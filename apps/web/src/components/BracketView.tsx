'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { TeamBadge } from './TeamBadge';
import {
  formatKickoff,
  type BracketSlot,
  type Fixture,
  type KnockoutBracket,
  type SlotSource,
  type Team,
} from '@matchora/shared';
import { usePreferences } from '@/lib/preferences';

function sourceLabel(source: SlotSource, teams: Map<string, Team>): string {
  switch (source.kind) {
    case 'team':
      return teams.get(source.teamId)?.name ?? source.teamId;
    case 'group_position':
      return `#${source.position} · ${source.groupId}`;
    case 'winner_of':
      return `Winner of ${source.slotId}`;
    case 'loser_of':
      return `Loser of ${source.slotId}`;
    default:
      return '—';
  }
}

export function BracketView({
  bracket,
  teams,
  fixtures,
}: {
  bracket: KnockoutBracket;
  teams: Team[];
  fixtures: Fixture[];
}) {
  const { locale } = useI18n();
  const timeZone = usePreferences((s) => s.timeZone);
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const fixtureMap = useMemo(() => new Map(fixtures.map((f) => [f.id, f])), [fixtures]);

  const rounds = [...bracket.rounds].sort((a, b) => a.order - b.order);

  return (
    <div className="flex gap-lg overflow-x-auto pb-md">
      {rounds.map((round) => {
        const slots = bracket.slots.filter((s) => s.roundId === round.id);
        return (
          <section
            key={round.id}
            aria-label={round.name}
            className="flex min-w-[240px] flex-col gap-md"
          >
            <h3 className="text-title font-bold">{round.name}</h3>
            {slots.map((slot) => (
              <SlotCard
                key={slot.id}
                slot={slot}
                teams={teamMap}
                fixture={slot.fixtureId ? (fixtureMap.get(slot.fixtureId) ?? null) : null}
                locale={locale}
                timeZone={timeZone}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function SlotCard({
  slot,
  teams,
  fixture,
  locale,
  timeZone,
}: {
  slot: BracketSlot;
  teams: Map<string, Team>;
  fixture: Fixture | null;
  locale: ReturnType<typeof useI18n>['locale'];
  timeZone: string;
}) {
  const home = slot.homeTeamId ? (teams.get(slot.homeTeamId) ?? null) : null;
  const away = slot.awayTeamId ? (teams.get(slot.awayTeamId) ?? null) : null;

  const snapshot = fixture?.snapshot;
  const finished = snapshot?.status === 'finished';

  const Body = (
    <div className="rounded-lg border border-border bg-surface p-md">
      <SlotSide
        team={home}
        fallback={sourceLabel(slot.homeSource, teams)}
        score={finished ? snapshot?.score.home : undefined}
        pen={finished ? snapshot?.penalties?.home : undefined}
      />
      <div className="my-xs h-px bg-border" />
      <SlotSide
        team={away}
        fallback={sourceLabel(slot.awaySource, teams)}
        score={finished ? snapshot?.score.away : undefined}
        pen={finished ? snapshot?.penalties?.away : undefined}
      />
      {fixture && !finished ? (
        <p className="mt-xs text-caption text-text-faint">
          {formatKickoff(fixture.kickoffAt, locale, timeZone)}
        </p>
      ) : null}
      {!fixture ? (
        <p className="mt-xs text-caption text-text-faint">Potential matchup</p>
      ) : null}
    </div>
  );

  if (fixture) {
    return (
      <Link href={`/matches/${fixture.id}`} className="block hover:opacity-90">
        {Body}
      </Link>
    );
  }
  return Body;
}

function SlotSide({
  team,
  fallback,
  score,
  pen,
}: {
  team: Team | null;
  fallback: string;
  score?: number;
  pen?: number | null;
}) {
  return (
    <div className="flex items-center justify-between gap-sm">
      <span className="flex min-w-0 items-center gap-sm">
        <TeamBadge team={team} size="sm" />
        <span className={`truncate text-body ${team ? '' : 'italic text-text-faint'}`}>
          {team?.name ?? fallback}
        </span>
      </span>
      {score != null ? (
        <span className="shrink-0 font-bold tabular-nums">
          {score}
          {pen != null ? <span className="text-caption text-text-muted"> ({pen})</span> : null}
        </span>
      ) : null}
    </div>
  );
}
