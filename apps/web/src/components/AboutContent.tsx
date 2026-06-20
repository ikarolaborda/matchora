'use client';

import { useT } from '@/lib/i18n';

export function AboutContent({
  appName,
  tournamentLabel,
  disclaimer,
  version,
}: {
  appName: string;
  tournamentLabel: string;
  disclaimer: string;
  version: string;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-md">
      <p className="text-body">
        <strong className="text-brand">{appName}</strong> — {t('app.tagline')}
      </p>
      <p className="text-body text-text-muted">{tournamentLabel}</p>

      <div className="rounded-lg border border-border bg-surface p-md">
        <h2 className="mb-sm text-body font-bold">{t('settings.version')}</h2>
        <p className="text-body tabular-nums">v{version}</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-md">
        <h2 className="mb-sm text-body font-bold">⚖ Legal</h2>
        <p className="text-caption text-text-muted">{disclaimer}</p>
      </div>
    </div>
  );
}
