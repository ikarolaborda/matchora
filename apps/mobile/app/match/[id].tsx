/**
 * Match detail — large score, status + minute, and an event timeline.
 *
 * LIVE UPDATES — design choice: React Native has no built-in EventSource, and
 * the web SSE endpoint (/api/live/matches/[id]/events) needs a streaming
 * client. For the MVP we POLL /api/fixtures/[id] every 5s via React Query
 * (refetchInterval). This is simple, robust on flaky mobile networks, and
 * reuses the exact same shared types. A future enhancement is an RN EventSource
 * shim (e.g. react-native-sse) wired to serializeSse/parseSseData with
 * Last-Event-ID resume — documented in docs/PUSH_NOTIFICATIONS.md / SHARED_API.
 *
 * No-spoilers: when enabled we mask the score (maskFixture) and drop revealing
 * events from the timeline (maskEvents), both from @matchora/shared.
 */
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import {
  formatKickoff,
  isAlertableGoal,
  maskEvents,
  maskFixture,
  type MatchEvent,
} from '@matchora/shared';
import { fetchFixture } from '@/src/api';
import { usePrefs } from '@/src/lib/prefs';
import { Screen } from '@/src/components/Screen';
import { TeamBadge } from '@/src/components/TeamBadge';
import { ScoreDisplay } from '@/src/components/ScoreDisplay';
import { StatusChip } from '@/src/components/StatusChip';
import { Loading, ErrorState } from '@/src/components/Empty';
import { colors, fontSize, radius, space, weight } from '@/src/lib/theme';

const EVENT_LABEL: Record<string, string> = {
  match_started: 'Kick-off',
  period_started: 'Period started',
  period_ended: 'Period ended',
  goal: 'Goal',
  own_goal: 'Own goal',
  penalty_goal: 'Penalty goal',
  penalty_missed: 'Penalty missed',
  yellow_card: 'Yellow card',
  red_card: 'Red card',
  second_yellow: 'Second yellow',
  substitution: 'Substitution',
  var_review_started: 'VAR review',
  var_decision: 'VAR decision',
  halftime: 'Half-time',
  fulltime: 'Full-time',
  match_ended: 'Match ended',
  goal_cancelled: 'Goal cancelled',
  card_corrected: 'Card corrected',
  score_corrected: 'Score corrected',
};

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { noSpoilers, locale, timeZone } = usePrefs();

  const query = useQuery({
    queryKey: ['fixture', id],
    queryFn: () => fetchFixture(id),
    enabled: !!id,
    // Poll while the screen is open (MVP live updates — see file header).
    refetchInterval: 5_000,
  });

  // Haptic feedback when a new alertable goal appears.
  const lastSeqRef = useRef<number>(-1);
  useEffect(() => {
    const events = query.data?.events ?? [];
    if (events.length === 0) return;
    const newest = events[events.length - 1] as MatchEvent;
    if (newest.sequence > lastSeqRef.current) {
      if (lastSeqRef.current >= 0 && isAlertableGoal(newest.kind) && !noSpoilers) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      lastSeqRef.current = newest.sequence;
    }
  }, [query.data?.events, noSpoilers]);

  const view = useMemo(() => {
    if (!query.data) return null;
    const { fixture, events } = query.data;
    const masked = maskFixture(fixture, noSpoilers);
    const timeline = maskEvents(events, noSpoilers)
      .slice()
      .sort((a, b) => b.sequence - a.sequence);
    return { fixture, masked, timeline };
  }, [query.data, noSpoilers]);

  return (
    <>
      <Stack.Screen options={{ title: 'Match' }} />
      <Screen refreshing={query.isFetching} onRefresh={() => void query.refetch()}>
        {query.isLoading ? <Loading /> : null}
        {query.isError ? <ErrorState message={(query.error as Error).message} /> : null}

        {view ? (
          <>
            <View style={styles.scoreCard}>
              <View style={styles.teams}>
                <TeamBadge teamId={view.fixture.homeTeamId} layout="stacked" />
                <View style={styles.scoreMid}>
                  {view.fixture.snapshot.status === 'scheduled' ? (
                    <Text style={styles.kickoff}>
                      {formatKickoff(view.fixture.kickoffAt, locale, timeZone)}
                    </Text>
                  ) : (
                    <ScoreDisplay
                      homeText={view.masked.homeScoreText}
                      awayText={view.masked.awayScoreText}
                      penalties={view.masked.masked ? null : view.fixture.snapshot.penalties}
                      size="lg"
                    />
                  )}
                </View>
                <TeamBadge teamId={view.fixture.awayTeamId} layout="stacked" />
              </View>
              <View style={styles.statusRow}>
                <StatusChip
                  status={view.fixture.snapshot.status}
                  minute={view.fixture.snapshot.minute}
                  label={view.masked.masked ? 'In progress (hidden)' : undefined}
                />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Timeline</Text>
            {view.timeline.length === 0 ? (
              <Text style={styles.empty}>
                {noSpoilers ? 'Events hidden in no-spoilers mode.' : 'No events yet.'}
              </Text>
            ) : (
              <View style={styles.timeline}>
                {view.timeline.map((e) => (
                  <View key={e.eventId} style={styles.eventRow}>
                    <Text style={styles.minute}>
                      {e.matchClock != null ? `${e.matchClock}'` : '—'}
                    </Text>
                    <View style={styles.eventBody}>
                      <Text style={styles.eventKind}>{EVENT_LABEL[e.kind] ?? e.kind}</Text>
                      {e.payload?.note ? <Text style={styles.eventNote}>{e.payload.note}</Text> : null}
                    </View>
                    {e.side ? <Text style={styles.eventSide}>{e.side === 'home' ? 'H' : 'A'}</Text> : null}
                  </View>
                ))}
              </View>
            )}
          </>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  scoreCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.xl,
    gap: space.lg,
  },
  teams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreMid: { flex: 1, alignItems: 'center' },
  kickoff: { color: colors.textMuted, fontSize: fontSize.title, fontWeight: weight.title },
  statusRow: { alignItems: 'center' },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    fontWeight: weight.title,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: space.md,
  },
  empty: { color: colors.textFaint, fontSize: fontSize.body, paddingVertical: space.md },
  timeline: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  minute: {
    width: 36,
    color: colors.brand,
    fontSize: fontSize.body,
    fontWeight: weight.score,
    fontVariant: ['tabular-nums'],
  },
  eventBody: { flex: 1 },
  eventKind: { color: colors.text, fontSize: fontSize.body, fontWeight: weight.title },
  eventNote: { color: colors.textMuted, fontSize: fontSize.caption, marginTop: 2 },
  eventSide: { color: colors.textFaint, fontSize: fontSize.caption, fontWeight: weight.title },
});
