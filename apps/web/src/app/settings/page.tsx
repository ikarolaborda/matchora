import { getBranding, APP_VERSION } from '@matchora/config';
import { SettingsPanel } from '@/components/SettingsPanel';
import { TranslatedHeading } from '@/components/TranslatedHeading';

export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const branding = getBranding();
  return (
    <div>
      <TranslatedHeading messageKey="nav.settings" icon="⚙" />
      <SettingsPanel version={APP_VERSION} disclaimer={branding.disclaimer} />
    </div>
  );
}
