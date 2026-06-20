'use client';

import { useT } from '@/lib/i18n';
import { SectionHeading } from './SectionHeading';
import type { MessageKey } from '@matchora/shared';

/** Section heading whose label comes from an i18n key (client translator). */
export function TranslatedHeading({
  messageKey,
  live = false,
  icon,
}: {
  messageKey: MessageKey;
  live?: boolean;
  icon?: string;
}) {
  const t = useT();
  return (
    <SectionHeading live={live}>
      {icon ? <span aria-hidden="true">{icon} </span> : null}
      {t(messageKey)}
    </SectionHeading>
  );
}
