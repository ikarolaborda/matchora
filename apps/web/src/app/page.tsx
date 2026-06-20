import { LIVE_STATUSES, isOnLocalDay } from '@matchora/shared';
import { loadFixtures, loadTeams } from '@/lib/data';
import { MatchList } from '@/components/MatchList';
import { FavoritesSection } from '@/components/FavoritesSection';
import { QuickLinks } from '@/components/QuickLinks';
import { TranslatedHeading } from '@/components/TranslatedHeading';
import { NoSpoilersToggle } from '@/components/NoSpoilersToggle';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [fixtures, teams] = await Promise.all([loadFixtures(), loadTeams()]);

  const live = fixtures.filter((f) => LIVE_STATUSES.includes(f.snapshot.status));

  const todayUtc = new Date().toISOString();
  const today = fixtures.filter(
    (f) =>
      !LIVE_STATUSES.includes(f.snapshot.status) &&
      isOnLocalDay(f.kickoffAt, todayUtc, 'UTC'),
  );

  const upcoming = fixtures
    .filter((f) => f.snapshot.status === 'scheduled' && f.kickoffAt >= todayUtc)
    .sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt))
    .slice(0, 8);

  return (
    <div>
      <div className="flex items-center justify-end">
        <NoSpoilersToggle />
      </div>

      {live.length > 0 ? (
        <section aria-labelledby="live-heading">
          <TranslatedHeading messageKey="home.live_now" live />
          <span id="live-heading" className="sr-only">
            Live now
          </span>
          <MatchList fixtures={live} teams={teams} />
        </section>
      ) : null}

      <FavoritesSection fixtures={fixtures} teams={teams} />

      <section aria-labelledby="today-heading">
        <TranslatedHeading messageKey="home.today" icon="📅" />
        <span id="today-heading" className="sr-only">
          Today
        </span>
        <MatchList fixtures={today} teams={teams} />
      </section>

      <section aria-labelledby="upcoming-heading">
        <TranslatedHeading messageKey="home.upcoming" icon="⏭" />
        <span id="upcoming-heading" className="sr-only">
          Upcoming
        </span>
        <MatchList fixtures={upcoming} teams={teams} />
      </section>

      <section className="mt-xl" aria-label="Quick links">
        <QuickLinks />
      </section>
    </div>
  );
}
