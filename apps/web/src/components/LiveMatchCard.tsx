'use client';

import { useLiveFixture } from '@/hooks/useLiveFixture';
import { MatchCard } from './MatchCard';
import { LIVE_STATUSES, type Fixture, type Team } from '@matchora/shared';

/**
 * A MatchCard that subscribes to the live SSE stream when the fixture is live,
 * folding incoming events into the displayed snapshot.
 */
export function LiveMatchCard({
  fixture,
  home,
  away,
}: {
  fixture: Fixture;
  home: Team | null;
  away: Team | null;
}) {
  const isLive = LIVE_STATUSES.includes(fixture.snapshot.status);
  const { snapshot } = useLiveFixture(fixture.id, fixture.snapshot, isLive);

  const merged: Fixture = snapshot ? { ...fixture, snapshot } : fixture;
  return <MatchCard fixture={merged} home={home} away={away} />;
}
