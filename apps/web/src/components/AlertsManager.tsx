'use client';

import { useT } from '@/lib/i18n';
import { usePreferences, ALERT_TYPES } from '@/lib/preferences';
import { TeamBadge } from './TeamBadge';
import { NoSpoilersToggle } from './NoSpoilersToggle';
import { SectionHeading } from './SectionHeading';
import type { AlertType, MessageKey, Team } from '@matchora/shared';

function alertKey(type: AlertType): MessageKey {
  return `alerts.${type}` as MessageKey;
}

export function AlertsManager({ teams }: { teams: Team[] }) {
  const t = useT();
  const hydrated = usePreferences((s) => s.hydrated);
  const favoriteTeamIds = usePreferences((s) => s.favoriteTeamIds);
  const toggleTeam = usePreferences((s) => s.toggleFavoriteTeam);
  const alerts = usePreferences((s) => s.alerts);
  const setAlert = usePreferences((s) => s.setAlert);
  const quietHours = usePreferences((s) => s.quietHours);
  const setQuietHours = usePreferences((s) => s.setQuietHours);

  if (!hydrated) {
    return <p className="text-body text-text-muted">…</p>;
  }

  const favSet = new Set(favoriteTeamIds);

  return (
    <div className="flex flex-col gap-lg">
      <section aria-labelledby="fav-teams-heading">
        <SectionHeading>
          <span id="fav-teams-heading">★ {t('home.favorites')}</span>
        </SectionHeading>
        <ul className="grid grid-cols-2 gap-sm sm:grid-cols-3">
          {teams.map((team) => {
            const active = favSet.has(team.id);
            return (
              <li key={team.id}>
                <button
                  type="button"
                  onClick={() => toggleTeam(team.id)}
                  aria-pressed={active}
                  className={`flex w-full items-center gap-sm rounded-md border px-md py-sm text-body ${
                    active ? 'border-brand bg-surface-raised' : 'border-border bg-surface'
                  }`}
                >
                  <TeamBadge team={team} size="sm" />
                  <span className="truncate">{team.name}</span>
                  <span aria-hidden="true" className="ml-auto">
                    {active ? '★' : '☆'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="alert-types-heading">
        <SectionHeading>
          <span id="alert-types-heading">🔔 {t('nav.alerts')}</span>
        </SectionHeading>
        <fieldset className="flex flex-col gap-sm rounded-lg border border-border bg-surface p-md">
          <legend className="sr-only">Alert types</legend>
          {ALERT_TYPES.map((type) => (
            <label key={type} className="flex items-center justify-between gap-md text-body">
              <span>{t(alertKey(type))}</span>
              <input
                type="checkbox"
                checked={alerts[type]}
                onChange={(e) => setAlert(type, e.target.checked)}
                className="h-4 w-4 accent-brand"
              />
            </label>
          ))}
        </fieldset>
      </section>

      <section aria-labelledby="quiet-hours-heading">
        <SectionHeading>
          <span id="quiet-hours-heading">🌙 {t('alerts.quiet_hours')}</span>
        </SectionHeading>
        <div className="flex flex-col gap-sm rounded-lg border border-border bg-surface p-md">
          <label className="flex items-center justify-between gap-md text-body">
            <span>{t('alerts.quiet_hours')}</span>
            <input
              type="checkbox"
              checked={quietHours.enabled}
              onChange={(e) => setQuietHours({ enabled: e.target.checked })}
              className="h-4 w-4 accent-brand"
            />
          </label>
          <div className="flex items-center gap-md">
            <label className="flex items-center gap-sm text-body">
              <span className="text-text-muted">Start</span>
              <input
                type="time"
                value={quietHours.start}
                onChange={(e) => setQuietHours({ start: e.target.value })}
                className="rounded-md border border-border bg-surface-raised px-sm py-xs text-body"
              />
            </label>
            <label className="flex items-center gap-sm text-body">
              <span className="text-text-muted">End</span>
              <input
                type="time"
                value={quietHours.end}
                onChange={(e) => setQuietHours({ end: e.target.value })}
                className="rounded-md border border-border bg-surface-raised px-sm py-xs text-body"
              />
            </label>
          </div>
        </div>
      </section>

      <section aria-labelledby="spoilers-heading">
        <SectionHeading>
          <span id="spoilers-heading">🙈 {t('spoilers.toggle')}</span>
        </SectionHeading>
        <div className="rounded-lg border border-border bg-surface p-md">
          <NoSpoilersToggle />
        </div>
      </section>
    </div>
  );
}
