import { notFound } from 'next/navigation';
import {
  loadFixture,
  loadFixtureEvents,
  loadTeams,
  loadGroups,
  loadStandings,
  loadCompetition,
} from '@/lib/data';
import { MatchDetail } from '@/components/MatchDetail';
import type { GroupStanding } from '@matchora/shared';

export const dynamic = 'force-dynamic';

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const fixture = await loadFixture(id);
  if (!fixture) {
    notFound();
  }

  const [events, teams, groups, standings, competition] = await Promise.all([
    loadFixtureEvents(id),
    loadTeams(),
    loadGroups(),
    loadStandings(),
    loadCompetition(),
  ]);

  let groupStanding: GroupStanding | null = null;
  if (fixture.groupId) {
    groupStanding = standings.find((s) => s.groupId === fixture.groupId) ?? null;
  }
  void groups;

  return (
    <MatchDetail
      fixture={fixture}
      teams={teams}
      initialEvents={events}
      groupStanding={groupStanding}
      advancePerGroup={competition?.rules.advancePerGroup ?? 2}
    />
  );
}
