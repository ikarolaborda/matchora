'use client';

import { usePreferences } from '@/lib/preferences';
import { useT } from '@/lib/i18n';
import { MatchList } from './MatchList';
import { SectionHeading } from './SectionHeading';
import type { Fixture, Team } from '@matchora/shared';

/**
 * Favorites are stored client-side (Zustand + localStorage), so this section is
 * a client component that filters the full fixture list to the user's picks.
 */
export function FavoritesSection({
  fixtures,
  teams,
}: {
  fixtures: Fixture[];
  teams: Team[];
}) {
  const t = useT();
  const favoriteFixtureIds = usePreferences((s) => s.favoriteFixtureIds);
  const favoriteTeamIds = usePreferences((s) => s.favoriteTeamIds);
  const hydrated = usePreferences((s) => s.hydrated);

  if (!hydrated) {
    return null;
  }

  const favTeams = new Set(favoriteTeamIds);
  const favFixtures = new Set(favoriteFixtureIds);
  const matched = fixtures.filter(
    (f) =>
      favFixtures.has(f.id) ||
      (f.homeTeamId && favTeams.has(f.homeTeamId)) ||
      (f.awayTeamId && favTeams.has(f.awayTeamId)),
  );

  if (matched.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="favorites-heading">
      <SectionHeading>
        <span id="favorites-heading">★ {t('home.favorites')}</span>
      </SectionHeading>
      <MatchList fixtures={matched} teams={teams} />
    </section>
  );
}
