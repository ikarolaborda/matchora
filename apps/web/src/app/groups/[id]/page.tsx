import { notFound } from 'next/navigation';
import {
  loadGroups,
  loadStandings,
  loadTeams,
  loadFixtures,
  loadCompetition,
} from '@/lib/data';
import { GroupStandings } from '@/components/GroupStandings';
import { MatchList } from '@/components/MatchList';
import { SectionHeading } from '@/components/SectionHeading';

export const dynamic = 'force-dynamic';

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [groups, standings, teams, fixtures, competition] = await Promise.all([
    loadGroups(),
    loadStandings(),
    loadTeams(),
    loadFixtures(),
    loadCompetition(),
  ]);

  const group = groups.find((g) => g.id === id);
  const standing = standings.find((s) => s.groupId === id);
  if (!group || !standing) {
    notFound();
  }

  const advancePerGroup = competition?.rules.advancePerGroup ?? 2;
  const groupFixtures = fixtures
    .filter((f) => f.groupId === id)
    .sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt));

  return (
    <div>
      <h1 className="mb-md text-title font-bold">{group.name}</h1>
      <GroupStandings standing={standing} teams={teams} advancePerGroup={advancePerGroup} />

      <section aria-label="Group matches">
        <SectionHeading>{group.name}</SectionHeading>
        <MatchList fixtures={groupFixtures} teams={teams} />
      </section>
    </div>
  );
}
