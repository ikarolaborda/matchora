'use client';

import Link from 'next/link';
import { useT } from '@/lib/i18n';
import type { MessageKey } from '@matchora/shared';

const LINKS: { href: string; key: MessageKey; icon: string }[] = [
  { href: '/groups', key: 'nav.groups', icon: '🗂' },
  { href: '/bracket', key: 'nav.bracket', icon: '🏆' },
  { href: '/alerts', key: 'nav.alerts', icon: '🔔' },
  { href: '/settings', key: 'nav.settings', icon: '⚙' },
];

export function QuickLinks() {
  const t = useT();
  return (
    <nav aria-label="Quick links" className="grid grid-cols-2 gap-md sm:grid-cols-4">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="flex flex-col items-center gap-xs rounded-lg border border-border bg-surface p-md text-body hover:border-brand-dim"
        >
          <span aria-hidden="true" className="text-title">
            {l.icon}
          </span>
          <span>{t(l.key)}</span>
        </Link>
      ))}
    </nav>
  );
}
