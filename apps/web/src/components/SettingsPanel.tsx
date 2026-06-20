'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import { usePreferences } from '@/lib/preferences';
import { SectionHeading } from './SectionHeading';
import { LOCALES, type Health, type Locale, type MessageKey } from '@matchora/shared';

const LOCALE_LABEL: Record<Locale, string> = {
  'pt-BR': 'Português (Brasil)',
  'pt-PT': 'Português (Portugal)',
  en: 'English',
  es: 'Español',
};

export function SettingsPanel({
  version,
  disclaimer,
}: {
  version: string;
  disclaimer: string;
}) {
  const t = useT();
  const hydrated = usePreferences((s) => s.hydrated);
  const locale = usePreferences((s) => s.locale);
  const setLocale = usePreferences((s) => s.setLocale);
  const timeZone = usePreferences((s) => s.timeZone);

  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('health'))))
      .then((data: Health) => {
        if (active) setHealth(data);
      })
      .catch(() => {
        if (active) setHealthError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-lg">
      <section aria-labelledby="lang-heading">
        <SectionHeading>
          <span id="lang-heading">{t('settings.language')}</span>
        </SectionHeading>
        <div className="rounded-lg border border-border bg-surface p-md">
          <label htmlFor="locale" className="sr-only">
            {t('settings.language')}
          </label>
          <select
            id="locale"
            value={hydrated ? locale : 'pt-BR'}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="w-full rounded-md border border-border bg-surface-raised px-md py-sm text-body"
          >
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {LOCALE_LABEL[l]}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section aria-labelledby="tz-heading">
        <SectionHeading>
          <span id="tz-heading">{t('settings.timezone')}</span>
        </SectionHeading>
        <div className="rounded-lg border border-border bg-surface p-md text-body">
          {hydrated ? timeZone : '—'}
        </div>
      </section>

      <section aria-labelledby="data-heading">
        <SectionHeading>
          <span id="data-heading">{t('settings.data_source')}</span>
        </SectionHeading>
        <dl className="rounded-lg border border-border bg-surface p-md text-body">
          {healthError ? (
            <p role="alert" className="text-eliminated">
              ⚠ unavailable
            </p>
          ) : !health ? (
            <p className="text-text-muted">…</p>
          ) : (
            <div className="grid grid-cols-2 gap-y-sm">
              <dt className="text-text-muted">Status</dt>
              <dd>{statusBadge(health.status)}</dd>
              <dt className="text-text-muted">Provider</dt>
              <dd>
                {health.provider.name} · {health.provider.status}
              </dd>
              <dt className="text-text-muted">Database</dt>
              <dd>{health.database}</dd>
              <dt className="text-text-muted">Live</dt>
              <dd>{health.live}</dd>
            </div>
          )}
        </dl>
      </section>

      <section aria-labelledby="version-heading">
        <SectionHeading>
          <span id="version-heading">{t('settings.version')}</span>
        </SectionHeading>
        <div className="rounded-lg border border-border bg-surface p-md text-body tabular-nums">
          v{version}
        </div>
      </section>

      <section aria-labelledby="legal-heading">
        <SectionHeading>
          <span id="legal-heading">{labelDisclaimer(t)}</span>
        </SectionHeading>
        <p className="rounded-lg border border-border bg-surface p-md text-caption text-text-muted">
          {disclaimer}
        </p>
      </section>
    </div>
  );
}

function labelDisclaimer(t: (k: MessageKey) => string): string {
  // Reuse the about link label conceptually; show the disclaimer title.
  return t('nav.about');
}

function statusBadge(status: Health['status']): string {
  switch (status) {
    case 'ok':
      return '✓ ok';
    case 'degraded':
      return '◑ degraded';
    default:
      return '✕ down';
  }
}
