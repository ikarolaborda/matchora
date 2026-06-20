import { LIVE_STATUSES } from '@matchora/shared';
import { loadFixtures, loadTeams } from '@/lib/data';
import { MatchList } from '@/components/MatchList';
import { TranslatedHeading } from '@/components/TranslatedHeading';
import { NoSpoilersToggle } from '@/components/NoSpoilersToggle';

export const dynamic = 'force-dynamic';

export default async function MatchesPage() {
  const [fixtures, teams] = await Promise.all([loadFixtures(), loadTeams()]);

  const ordered = [...fixtures].sort((a, b) => {
    const aLive = LIVE_STATUSES.includes(a.snapshot.status) ? 0 : 1;
    const bLive = LIVE_STATUSES.includes(b.snapshot.status) ? 0 : 1;
    if (aLive !== bLive) return aLive - bLive;
    return a.kickoffAt.localeCompare(b.kickoffAt);
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <TranslatedHeading messageKey="nav.matches" icon="⚽" />
        <NoSpoilersToggle />
      </div>
      <MatchList fixtures={ordered} teams={teams} />
    </div>
  );
}
