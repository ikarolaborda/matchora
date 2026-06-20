/**
 * Groups — group-stage standings, one StandingsTable per group.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchGroups, fetchStandings } from '@/src/api';
import { Screen } from '@/src/components/Screen';
import { StandingsTable } from '@/src/components/StandingsTable';
import { Loading, ErrorState, EmptyState } from '@/src/components/Empty';

export default function GroupsScreen() {
  const groupsQuery = useQuery({ queryKey: ['groups'], queryFn: () => fetchGroups() });
  const standingsQuery = useQuery({
    queryKey: ['standings'],
    queryFn: () => fetchStandings(),
    refetchInterval: 20_000,
  });

  const groupNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groupsQuery.data ?? []) map.set(g.id, g.name);
    return map;
  }, [groupsQuery.data]);

  const standings = standingsQuery.data ?? [];
  const isLoading = groupsQuery.isLoading || standingsQuery.isLoading;
  const error = (groupsQuery.error ?? standingsQuery.error) as Error | null;

  return (
    <Screen
      title="Groups"
      subtitle="Group-stage standings"
      refreshing={standingsQuery.isFetching}
      onRefresh={() => {
        void groupsQuery.refetch();
        void standingsQuery.refetch();
      }}
    >
      {isLoading ? <Loading /> : null}
      {error ? <ErrorState message={error.message} /> : null}
      {!isLoading && !error && standings.length === 0 ? (
        <EmptyState message="No standings available yet." />
      ) : null}
      {standings.map((s) => (
        <StandingsTable key={s.groupId} standing={s} title={groupNameById.get(s.groupId) ?? s.groupId} />
      ))}
    </Screen>
  );
}
