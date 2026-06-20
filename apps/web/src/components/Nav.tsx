'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/lib/i18n';
import type { MessageKey } from '@matchora/shared';

const ITEMS: { href: string; key: MessageKey; icon: string }[] = [
  { href: '/', key: 'nav.home', icon: '🏠' },
  { href: '/matches', key: 'nav.matches', icon: '⚽' },
  { href: '/groups', key: 'nav.groups', icon: '🗂' },
  { href: '/bracket', key: 'nav.bracket', icon: '🏆' },
  { href: '/simulator', key: 'nav.simulator', icon: '🔮' },
  { href: '/alerts', key: 'nav.alerts', icon: '🔔' },
  { href: '/settings', key: 'nav.settings', icon: '⚙' },
];

export function Nav() {
  const t = useT();
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav aria-label="Primary" className="border-b border-border bg-surface">
      <ul className="mx-auto flex max-w-5xl gap-xs overflow-x-auto px-md py-sm">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex items-center gap-xs rounded-md px-md py-sm text-body whitespace-nowrap ${
                  active
                    ? 'bg-surface-raised text-brand'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{t(item.key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
