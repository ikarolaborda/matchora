'use client';

import { usePreferences } from '@/lib/preferences';
import { useT } from '@/lib/i18n';

export function NoSpoilersToggle() {
  const t = useT();
  const noSpoilers = usePreferences((s) => s.noSpoilers);
  const setNoSpoilers = usePreferences((s) => s.setNoSpoilers);

  return (
    <label className="inline-flex cursor-pointer items-center gap-sm text-caption text-text-muted">
      <input
        type="checkbox"
        checked={noSpoilers}
        onChange={(e) => setNoSpoilers(e.target.checked)}
        className="h-4 w-4 accent-brand"
      />
      <span aria-hidden="true">🙈</span>
      <span>{t('spoilers.toggle')}</span>
    </label>
  );
}
