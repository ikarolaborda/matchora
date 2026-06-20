import Link from 'next/link';
import { getBranding } from '@matchora/config';

/** App header: name + tournament label. Server component (branding is static). */
export function Header() {
  const branding = getBranding();
  return (
    <header className="border-b border-border bg-surface" role="banner">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-md py-md">
        <Link href="/" className="flex items-center gap-sm">
          <span aria-hidden="true" className="text-title">
            ⚽
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-title font-bold text-brand">{branding.appName}</span>
            <span className="text-caption text-text-muted">{branding.tournamentLabel}</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
