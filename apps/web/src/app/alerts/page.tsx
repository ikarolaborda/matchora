import { loadTeams } from '@/lib/data';
import { AlertsManager } from '@/components/AlertsManager';
import { TranslatedHeading } from '@/components/TranslatedHeading';

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
  const teams = await loadTeams();
  return (
    <div>
      <TranslatedHeading messageKey="nav.alerts" icon="🔔" />
      <AlertsManager teams={teams} />
    </div>
  );
}
