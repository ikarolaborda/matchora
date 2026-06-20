/**
 * Home — today's fixtures grouped into Live / Upcoming / Finished, plus a
 * Favorites section. Pull-to-refresh; live section auto-refetches every 15s.
 */
import { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { LIVE_STATUSES, type Fixture } from '@matchora/shared';
import { fetchFixtures } from '@/src/api';
import { usePrefs } from '@/src/lib/prefs';
import { Screen } from '@/src/components/Screen';
import { MatchCard } from '@/src/components/MatchCard';
import { Loading, ErrorState, EmptyState } from '@/src/components/Empty';
import { colors, fontSize, space, weight } from '@/src/lib/theme';

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function HomeScreen() {
  const router = useRouter();
  const { noSpoilers, locale, timeZone, isFavorite, toggleFavorite } = usePrefs();

  const query = useQuery({
    queryKey: ['fixtures', 'today', todayUtc()],
    queryFn: () => fetchFixtures({ date: todayUtc() }),
    refetchInterval: 15_000,
  });

  // Favorites are not date-scoped, so fetch the full slate for them.
  const allQuery = useQuery({
    queryKey: ['fixtures', 'all'],
    queryFn: () => fetchFixtures({}),
    refetchInterval: 15_000,
  });

  const onPress = useCallback(
    (id: string) => {
      void Haptics.selectionAsync();
      router.push(`/match/${id}`);
    },
    [router],
  );

  const onToggleFav = useCallback(
    (id: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      toggleFavorite(id);
    },
    [toggleFavorite],
  );

  const sections = useMemo(() => {
    const fixtures = query.data ?? [];
    const live = fixtures.filter((f) => LIVE_STATUSES.includes(f.snapshot.status));
    const upcoming = fixtures.filter((f) => f.snapshot.status === 'scheduled');
    const finished = fixtures.filter((f) => f.snapshot.status === 'finished');
    const favorites = (allQuery.data ?? []).filter((f) => isFavorite(f.id));
    return { live, upcoming, finished, favorites };
  }, [query.data, allQuery.data, isFavorite]);

  const renderCard = (f: Fixture) => (
    <MatchCard
      key={f.id}
      fixture={f}
      noSpoilers={noSpoilers}
      locale={locale}
      timeZone={timeZone}
      isFavorite={isFavorite(f.id)}
      onPress={onPress}
      onToggleFavorite={onToggleFav}
    />
  );

  return (
    <Screen
      title="Today"
      subtitle="Independent live football scores"
      refreshing={query.isFetching}
      onRefresh={() => {
        void query.refetch();
        void allQuery.refetch();
      }}
    >
      {query.isLoading ? <Loading /> : null}
      {query.isError ? <ErrorState message={(query.error as Error).message} /> : null}

      {sections.favorites.length > 0 ? (
        <Section title="Favorites">{sections.favorites.map(renderCard)}</Section>
      ) : null}

      {sections.live.length > 0 ? (
        <Section title="Live now" accent>
          {sections.live.map(renderCard)}
        </Section>
      ) : null}

      {sections.upcoming.length > 0 ? (
        <Section title="Upcoming">{sections.upcoming.map(renderCard)}</Section>
      ) : null}

      {sections.finished.length > 0 ? (
        <Section title="Finished">{sections.finished.map(renderCard)}</Section>
      ) : null}

      {!query.isLoading &&
      !query.isError &&
      sections.live.length === 0 &&
      sections.upcoming.length === 0 &&
      sections.finished.length === 0 ? (
        <EmptyState message="No matches scheduled today." />
      ) : null}
    </Screen>
  );
}

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, accent && styles.accent]}>{title}</Text>
      <View style={styles.list}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm, marginTop: space.sm },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    fontWeight: weight.title,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  accent: { color: colors.live },
  list: { gap: space.md },
});
