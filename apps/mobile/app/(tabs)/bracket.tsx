/**
 * Bracket — knockout-stage view.
 *
 * LIMITATION: the web API does not expose a knockout-bracket endpoint (only
 * /api/groups and /api/standings). The shared resolveBracket() needs a
 * KnockoutBracket which isn't served over HTTP. For the MVP this screen shows
 * the knockout *fixtures* (status !== group stage) returned by /api/fixtures,
 * plus the group qualifiers derived from standings, so users still see the
 * path to the knockouts. When a /api/bracket endpoint is added, swap this for
 * a true bracket tree built with resolveBracket().
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { fetchFixtures, fetchStandings } from '@/src/api';
import { usePrefs } from '@/src/lib/prefs';
import { Screen } from '@/src/components/Screen';
import { MatchCard } from '@/src/components/MatchCard';
import { TeamBadge } from '@/src/components/TeamBadge';
import { Loading, ErrorState, EmptyState } from '@/src/components/Empty';
import { colors, fontSize, radius, space, weight } from '@/src/lib/theme';

export default function BracketScreen() {
  const router = useRouter();
  const { noSpoilers, locale, timeZone, isFavorite, toggleFavorite } = usePrefs();

  const fixturesQuery = useQuery({
    queryKey: ['fixtures', 'all'],
    queryFn: () => fetchFixtures({}),
    refetchInterval: 20_000,
  });
  const standingsQuery = useQuery({ queryKey: ['standings'], queryFn: () => fetchStandings() });

  const knockoutFixtures = useMemo(
    () => (fixturesQuery.data ?? []).filter((f) => f.stage !== 'group'),
    [fixturesQuery.data],
  );

  // Qualifiers: top-N of each group by rank (advancePerGroup defaults to 2).
  const qualifiers = useMemo(() => {
    const out: { groupId: string; teamId: string; rank: number }[] = [];
    for (const s of standingsQuery.data ?? []) {
      for (const r of s.rows) {
        if (r.rank <= 2) out.push({ groupId: s.groupId, teamId: r.teamId, rank: r.rank });
      }
    }
    return out.sort((a, b) => a.groupId.localeCompare(b.groupId) || a.rank - b.rank);
  }, [standingsQuery.data]);

  const isLoading = fixturesQuery.isLoading || standingsQuery.isLoading;
  const error = (fixturesQuery.error ?? standingsQuery.error) as Error | null;

  return (
    <Screen
      title="Bracket"
      subtitle="Knockout stage & qualifiers"
      refreshing={fixturesQuery.isFetching}
      onRefresh={() => {
        void fixturesQuery.refetch();
        void standingsQuery.refetch();
      }}
    >
      {isLoading ? <Loading /> : null}
      {error ? <ErrorState message={error.message} /> : null}

      {!isLoading && !error ? (
        <>
          <Text style={styles.sectionTitle}>Knockout fixtures</Text>
          {knockoutFixtures.length === 0 ? (
            <EmptyState message="Knockout fixtures not scheduled yet." />
          ) : (
            <View style={styles.list}>
              {knockoutFixtures.map((f) => (
                <MatchCard
                  key={f.id}
                  fixture={f}
                  noSpoilers={noSpoilers}
                  locale={locale}
                  timeZone={timeZone}
                  isFavorite={isFavorite(f.id)}
                  onPress={(id) => {
                    void Haptics.selectionAsync();
                    router.push(`/match/${id}`);
                  }}
                  onToggleFavorite={(id) => toggleFavorite(id)}
                />
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>Qualifiers (top 2 per group)</Text>
          {qualifiers.length === 0 ? (
            <EmptyState message="Qualification not determined yet." />
          ) : (
            <View style={styles.qualGrid}>
              {qualifiers.map((q) => (
                <View key={`${q.groupId}-${q.teamId}`} style={styles.qualChip}>
                  <Text style={styles.qualRank}>{q.rank}</Text>
                  <TeamBadge teamId={q.teamId} />
                </View>
              ))}
            </View>
          )}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    fontWeight: weight.title,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: space.md,
  },
  list: { gap: space.md },
  qualGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  qualChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
  },
  qualRank: { color: colors.brand, fontSize: fontSize.caption, fontWeight: weight.score },
});
