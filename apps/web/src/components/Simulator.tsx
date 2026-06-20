'use client';

import { useMemo, useState } from 'react';
import { useT } from '@/lib/i18n';
import { StandingsTable } from './StandingsTable';
import { TeamBadge } from './TeamBadge';
import {
  simulateGroupStanding,
  qualifiedTeamIds,
  type Fixture,
  type Group,
  type ScoreOverride,
  type Team,
  type TournamentRules,
} from '@matchora/shared';

/**
 * Client-only what-if simulator. Local override state ONLY — never touches the
 * authoritative data. Recomputes standings via simulateGroupStanding.
 */
export function Simulator({
  groups,
  fixtures,
  teams,
  competitionId,
  rules,
}: {
  groups: Group[];
  fixtures: Fixture[];
  teams: Team[];
  competitionId: string;
  rules: TournamentRules;
}) {
  const t = useT();
  const teamMap = useMemo(() => new Map(teams.map((tm) => [tm.id, tm])), [teams]);

  const [groupId, setGroupId] = useState(groups[0]?.id ?? '');
  const [overrides, setOverrides] = useState<Record<string, { home: number; away: number }>>({});

  const group = groups.find((g) => g.id === groupId);
  const groupFixtures = useMemo(
    () => fixtures.filter((f) => f.groupId === groupId),
    [fixtures, groupId],
  );

  // Editable = not yet finished (scheduled or live).
  const editable = groupFixtures.filter((f) => f.snapshot.status !== 'finished');

  const overrideList: ScoreOverride[] = Object.entries(overrides).map(([fixtureId, score]) => ({
    fixtureId,
    score,
  }));

  const standing = group
    ? simulateGroupStanding(
        groupId,
        competitionId,
        group.teamIds,
        groupFixtures,
        rules,
        overrideList,
      )
    : null;

  const qualifiers = standing ? qualifiedTeamIds(standing, rules.advancePerGroup) : [];

  const setScore = (fixtureId: string, side: 'home' | 'away', value: number) => {
    const v = Math.max(0, Number.isFinite(value) ? value : 0);
    setOverrides((prev) => {
      const base = prev[fixtureId] ?? defaultScore(groupFixtures, fixtureId);
      return { ...prev, [fixtureId]: { ...base, [side]: v } };
    });
  };

  const reset = () => setOverrides({});

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center gap-md">
        <label htmlFor="sim-group" className="text-body text-text-muted">
          {t('nav.groups')}
        </label>
        <select
          id="sim-group"
          value={groupId}
          onChange={(e) => {
            setGroupId(e.target.value);
            setOverrides({});
          }}
          className="rounded-md border border-border bg-surface px-md py-sm text-body"
        >
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={reset}
          className="ml-auto rounded-md border border-border px-md py-sm text-body hover:border-brand-dim"
        >
          {t('simulator.reset')}
        </button>
      </div>

      <section aria-label="Editable matches" className="flex flex-col gap-sm">
        {editable.length === 0 ? (
          <p className="text-body text-text-muted">{t('home.empty')}</p>
        ) : (
          editable.map((fx) => {
            const home = fx.homeTeamId ? teamMap.get(fx.homeTeamId) : undefined;
            const away = fx.awayTeamId ? teamMap.get(fx.awayTeamId) : undefined;
            const cur = overrides[fx.id] ?? {
              home: fx.snapshot.score.home,
              away: fx.snapshot.score.away,
            };
            return (
              <div
                key={fx.id}
                className="flex items-center justify-between gap-md rounded-md border border-border bg-surface p-md"
              >
                <span className="flex flex-1 items-center gap-sm">
                  <TeamBadge team={home ?? null} size="sm" />
                  <span className="truncate text-body">{home?.name ?? '—'}</span>
                </span>
                <ScoreInput
                  label={`${home?.name ?? 'home'} score`}
                  value={cur.home}
                  onChange={(v) => setScore(fx.id, 'home', v)}
                />
                <span aria-hidden="true" className="text-text-faint">
                  :
                </span>
                <ScoreInput
                  label={`${away?.name ?? 'away'} score`}
                  value={cur.away}
                  onChange={(v) => setScore(fx.id, 'away', v)}
                />
                <span className="flex flex-1 items-center justify-end gap-sm">
                  <span className="truncate text-body">{away?.name ?? '—'}</span>
                  <TeamBadge team={away ?? null} size="sm" />
                </span>
              </div>
            );
          })
        )}
      </section>

      {standing ? (
        <section aria-label="Simulated standings">
          <h3 className="mb-sm text-title font-bold">{group?.name}</h3>
          <StandingsTable
            standing={standing}
            teams={teamMap}
            advancePerGroup={rules.advancePerGroup}
          />
          <div className="mt-md rounded-lg border border-brand-dim/40 bg-surface p-md">
            <h4 className="mb-sm text-body font-bold text-brand">{t('simulator.qualifiers')}</h4>
            <ul className="flex flex-wrap gap-md">
              {qualifiers.map((tid) => (
                <li key={tid} className="flex items-center gap-sm text-body">
                  <TeamBadge team={teamMap.get(tid) ?? null} size="sm" />
                  <span>{teamMap.get(tid)?.name ?? tid}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function defaultScore(
  fixtures: Fixture[],
  fixtureId: string,
): { home: number; away: number } {
  const fx = fixtures.find((f) => f.id === fixtureId);
  return { home: fx?.snapshot.score.home ?? 0, away: fx?.snapshot.score.away ?? 0 };
}

function ScoreInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={20}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value, 10))}
      className="w-14 rounded-md border border-border bg-surface-raised px-sm py-xs text-center text-body tabular-nums"
    />
  );
}
