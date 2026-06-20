import { getBranding } from '@matchora/config';
import { APP_VERSION } from '@matchora/config';

/** Footer with the configurable legal disclaimer (no FIFA marks). */
export function Footer() {
  const branding = getBranding();
  return (
    <footer className="mt-xxl border-t border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col gap-sm px-md py-lg text-caption text-text-faint">
        <p className="text-text-muted">{branding.disclaimer}</p>
        <p>
          {branding.appName} v{APP_VERSION}
        </p>
      </div>
    </footer>
  );
}
