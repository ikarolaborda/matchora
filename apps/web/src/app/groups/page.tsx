import Link from 'next/link';
import { loadGroups, loadStandings, loadTeams, loadCompetition } from '@/lib/data';
import { GroupStandings } from '@/components/GroupStandings';
import { TranslatedHeading } from '@/components/TranslatedHeading';
import { EmptyState } from '@/components/StateMessages';

export const dynamic = 'force-dynamic';

export default async function GroupsPage() {
  const [groups, standings, teams, competition] = await Promise.all([
    loadGroups(),
    loadStandings(),
    loadTeams(),
    loadCompetition(),
  ]);

  const advancePerGroup = competition?.rules.advancePerGroup ?? 2;

  if (groups.length === 0) {
    return <EmptyState message="No groups" />;
  }

  return (
    <div>
      <TranslatedHeading messageKey="nav.groups" icon="🗂" />
      <div className="flex flex-col gap-xl">
        {groups.map((group) => {
          const standing = standings.find((s) => s.groupId === group.id);
          if (!standing) return null;
          return (
            <section key={group.id} aria-label={group.name}>
              <h3 className="mb-sm text-title font-bold">
                <Link href={`/groups/${group.id}`} className="hover:text-brand">
                  {group.name}
                </Link>
              </h3>
              <GroupStandings
                standing={standing}
                teams={teams}
                advancePerGroup={advancePerGroup}
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}
