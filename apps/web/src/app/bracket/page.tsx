import { loadBracket, loadTeams, loadFixtures } from '@/lib/data';
import { BracketView } from '@/components/BracketView';
import { TranslatedHeading } from '@/components/TranslatedHeading';
import { EmptyState } from '@/components/StateMessages';

export const dynamic = 'force-dynamic';

export default async function BracketPage() {
  const [bracket, teams, fixtures] = await Promise.all([
    loadBracket(),
    loadTeams(),
    loadFixtures(),
  ]);

  if (!bracket) {
    return (
      <div>
        <TranslatedHeading messageKey="nav.bracket" icon="🏆" />
        <EmptyState message="No bracket yet" />
      </div>
    );
  }

  return (
    <div>
      <TranslatedHeading messageKey="nav.bracket" icon="🏆" />
      <BracketView bracket={bracket} teams={teams} fixtures={fixtures} />
    </div>
  );
}
