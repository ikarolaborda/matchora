import { getBranding, APP_VERSION } from '@matchora/config';
import { AboutContent } from '@/components/AboutContent';
import { TranslatedHeading } from '@/components/TranslatedHeading';

export const dynamic = 'force-dynamic';

export default function AboutPage() {
  const branding = getBranding();
  return (
    <div>
      <TranslatedHeading messageKey="nav.about" icon="ℹ" />
      <AboutContent
        appName={branding.appName}
        tournamentLabel={branding.tournamentLabel}
        disclaimer={branding.disclaimer}
        version={APP_VERSION}
      />
    </div>
  );
}
