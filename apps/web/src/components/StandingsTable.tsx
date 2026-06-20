'use client';

import { useT } from '@/lib/i18n';
import { TeamBadge } from './TeamBadge';
import { qualificationColor } from '@matchora/ui';
import type { GroupStanding, QualificationState, Team, MessageKey } from '@matchora/shared';

const QUAL_ICON: Record<QualificationState, string> = {
  qualified: '✓',
  provisionally_qualified: '◑',
  still_possible: '…',
  eliminated: '✕',
  unknown: '–',
};

function qualKey(state: QualificationState): MessageKey {
  return `qual.${state}` as MessageKey;
}

export function StandingsTable({
  standing,
  teams,
  advancePerGroup,
}: {
  standing: GroupStanding;
  teams: Map<string, Team>;
  advancePerGroup: number;
}) {
  const t = useT();

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full border-collapse text-body">
        <caption className="sr-only">Group standings</caption>
        <thead>
          <tr className="border-b border-border text-caption text-text-muted">
            <th scope="col" className="px-sm py-sm text-left">
              #
            </th>
            <th scope="col" className="px-sm py-sm text-left">
              {t('nav.groups')}
            </th>
            <th scope="col" className="px-sm py-sm text-right" title="Played">
              {t('groups.played')}
            </th>
            <th scope="col" className="px-sm py-sm text-right" title="Won">
              {t('groups.won')}
            </th>
            <th scope="col" className="px-sm py-sm text-right" title="Drawn">
              {t('groups.drawn')}
            </th>
            <th scope="col" className="px-sm py-sm text-right" title="Lost">
              {t('groups.lost')}
            </th>
            <th scope="col" className="px-sm py-sm text-right" title="Goals for">
              {t('groups.goals_for')}
            </th>
            <th scope="col" className="px-sm py-sm text-right" title="Goals against">
              {t('groups.goals_against')}
            </th>
            <th scope="col" className="px-sm py-sm text-right" title="Goal difference">
              {t('groups.goal_difference')}
            </th>
            <th scope="col" className="px-sm py-sm text-right font-bold" title="Points">
              {t('groups.points')}
            </th>
          </tr>
        </thead>
        <tbody>
          {standing.rows.map((row) => {
            const team = teams.get(row.teamId);
            const color = qualificationColor[row.qualification] ?? qualificationColor.unknown!;
            const inQualifyingSpot = row.rank <= advancePerGroup;
            return (
              <tr
                key={row.teamId}
                className="border-b border-border/60 last:border-0"
                style={{
                  borderLeft: `3px solid ${color}`,
                  backgroundColor: inQualifyingSpot ? `${color}10` : undefined,
                }}
              >
                <td className="px-sm py-sm text-text-muted tabular-nums">{row.rank}</td>
                <td className="px-sm py-sm">
                  <div className="flex items-center gap-sm">
                    <TeamBadge team={team ?? null} size="sm" />
                    <span className="truncate">{team?.name ?? row.teamId}</span>
                    <span
                      className="ml-xs inline-flex items-center gap-[2px] text-caption"
                      style={{ color }}
                      title={t(qualKey(row.qualification))}
                    >
                      <span aria-hidden="true">{QUAL_ICON[row.qualification]}</span>
                      <span className="sr-only">{t(qualKey(row.qualification))}</span>
                    </span>
                  </div>
                </td>
                <td className="px-sm py-sm text-right tabular-nums">{row.played}</td>
                <td className="px-sm py-sm text-right tabular-nums">{row.won}</td>
                <td className="px-sm py-sm text-right tabular-nums">{row.drawn}</td>
                <td className="px-sm py-sm text-right tabular-nums">{row.lost}</td>
                <td className="px-sm py-sm text-right tabular-nums">{row.goalsFor}</td>
                <td className="px-sm py-sm text-right tabular-nums">{row.goalsAgainst}</td>
                <td className="px-sm py-sm text-right tabular-nums">{row.goalDifference}</td>
                <td className="px-sm py-sm text-right font-bold tabular-nums">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <ul className="flex flex-wrap gap-md p-sm text-caption text-text-muted">
        {(['qualified', 'provisionally_qualified', 'still_possible', 'eliminated'] as const).map(
          (state) => (
            <li key={state} className="flex items-center gap-xs">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-pill"
                style={{ backgroundColor: qualificationColor[state] }}
              />
              <span>{QUAL_ICON[state]}</span>
              <span>{t(qualKey(state))}</span>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
