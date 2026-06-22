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

  const group = (fixtures: Fixture[]) => ({
    live: fixtures.filter((f) => LIVE_STATUSES.includes(f.snapshot.status)),
    upcoming: fixtures.filter((f) => f.snapshot.status === 'scheduled'),
    finished: fixtures.filter((f) => f.snapshot.status === 'finished'),
  });

  const sections = useMemo(() => {
    const today = query.data ?? [];
    const all = allQuery.data ?? [];
    const favorites = all.filter((f) => isFavorite(f.id));
    return { today: group(today), all: group(all), favorites, todayCount: today.length, allCount: all.length };
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

      {sections.todayCount > 0 ? (
        <>
          {sections.today.live.length > 0 ? (
            <Section title="Live now" accent>
              {sections.today.live.map(renderCard)}
            </Section>
          ) : null}

          {sections.today.upcoming.length > 0 ? (
            <Section title="Upcoming">{sections.today.upcoming.map(renderCard)}</Section>
          ) : null}

          {sections.today.finished.length > 0 ? (
            <Section title="Finished">{sections.today.finished.map(renderCard)}</Section>
          ) : null}
        </>
      ) : null}

      {/* No fixtures today: fall back to the full slate so the screen stays useful
          on historical / off-day seasons. */}
      {!query.isLoading && !query.isError && sections.todayCount === 0 && sections.allCount > 0 ? (
        <>
          <Text style={styles.note}>No matches today — showing all fixtures.</Text>

          {sections.all.live.length > 0 ? (
            <Section title="Live now" accent>
              {sections.all.live.map(renderCard)}
            </Section>
          ) : null}

          {sections.all.upcoming.length > 0 ? (
            <Section title="Upcoming">{sections.all.upcoming.map(renderCard)}</Section>
          ) : null}

          {sections.all.finished.length > 0 ? (
            <Section title="Finished">{sections.all.finished.map(renderCard)}</Section>
          ) : null}

          {sections.all.live.length === 0 &&
          sections.all.upcoming.length === 0 &&
          sections.all.finished.length === 0 ? (
            <Section title="All fixtures">{(allQuery.data ?? []).map(renderCard)}</Section>
          ) : null}
        </>
      ) : null}

      {!query.isLoading &&
      !query.isError &&
      !allQuery.isLoading &&
      sections.todayCount === 0 &&
      sections.allCount === 0 ? (
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
  note: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    marginTop: space.sm,
  },
});
