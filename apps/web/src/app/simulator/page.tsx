import {
  loadGroups,
  loadFixtures,
  loadTeams,
  loadCompetition,
} from '@/lib/data';
import { Simulator } from '@/components/Simulator';
import { TranslatedHeading } from '@/components/TranslatedHeading';
import { EmptyState } from '@/components/StateMessages';

export const dynamic = 'force-dynamic';

export default async function SimulatorPage() {
  const [groups, fixtures, teams, competition] = await Promise.all([
    loadGroups(),
    loadFixtures(),
    loadTeams(),
    loadCompetition(),
  ]);

  if (!competition || groups.length === 0) {
    return (
      <div>
        <TranslatedHeading messageKey="simulator.title" icon="🔮" />
        <EmptyState message="No data to simulate" />
      </div>
    );
  }

  return (
    <div>
      <TranslatedHeading messageKey="simulator.title" icon="🔮" />
      <Simulator
        groups={groups}
        fixtures={fixtures}
        teams={teams}
        competitionId={competition.id}
        rules={competition.rules}
      />
    </div>
  );
}
