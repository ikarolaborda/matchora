'use client';

import { useMemo } from 'react';
import { LiveMatchCard } from './LiveMatchCard';
import { EmptyState } from './StateMessages';
import { useT } from '@/lib/i18n';
import type { Fixture, Team } from '@matchora/shared';

/**
 * Render a list of fixtures as live-capable cards. `teams` is passed as a plain
 * array (serializable from server components) and indexed client-side.
 */
export function MatchList({
  fixtures,
  teams,
  emptyMessage,
}: {
  fixtures: Fixture[];
  teams: Team[];
  emptyMessage?: string;
}) {
  const t = useT();
  const teamMap = useMemo(() => new Map(teams.map((tm) => [tm.id, tm])), [teams]);

  if (fixtures.length === 0) {
    return <EmptyState message={emptyMessage ?? t('home.empty')} />;
  }

  return (
    <div className="flex flex-col gap-md">
      {fixtures.map((fx) => (
        <LiveMatchCard
          key={fx.id}
          fixture={fx}
          home={fx.homeTeamId ? (teamMap.get(fx.homeTeamId) ?? null) : null}
          away={fx.awayTeamId ? (teamMap.get(fx.awayTeamId) ?? null) : null}
        />
      ))}
    </div>
  );
}
