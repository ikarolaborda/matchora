/**
 * Match detail — large score, status + minute, and an event timeline.
 *
 * LIVE UPDATES — SSE with polling fallback (see src/lib/useLiveMatch.ts):
 * we consume the web SSE endpoint (/api/live/matches/[id]/events) via
 * react-native-sse, parsing `snapshot`/`match_event` frames per the wire
 * contract (packages/SHARED_API.md), with Last-Event-ID resume handled by the
 * EventSource. When the SSE module is unavailable (Hermes/runtime quirk) or
 * errors repeatedly, the hook transparently falls back to the existing
 * React-Query polling. A small connection chip surfaces live/reconnecting/stale.
 *
 * No-spoilers: when enabled we mask the score (maskFixture) and drop revealing
 * events from the timeline (maskEvents), both from @matchora/shared.
 */
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  formatKickoff,
  isAlertableGoal,
  maskEvents,
  maskFixture,
  type ConnectionState,
  type MatchEvent,
} from '@matchora/shared';
import { usePrefs } from '@/src/lib/prefs';
import { useLiveMatch } from '@/src/lib/useLiveMatch';
import { Screen } from '@/src/components/Screen';
import { TeamBadge } from '@/src/components/TeamBadge';
import { ScoreDisplay } from '@/src/components/ScoreDisplay';
import { StatusChip } from '@/src/components/StatusChip';
import { Loading, ErrorState, EmptyState } from '@/src/components/Empty';
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

/** Visual style for the live-connection chip per transport state. */
const CONNECTION_META: Record<
  ConnectionState,
  { label: string; color: string; pulse: boolean }
> = {
  connecting: { label: 'Connecting…', color: colors.textMuted, pulse: true },
  live: { label: 'Live', color: colors.brand, pulse: true },
  reconnecting: { label: 'Reconnecting…', color: colors.textMuted, pulse: true },
  stale: { label: 'Offline — retrying', color: colors.textFaint, pulse: false },
};

function ConnectionChip({ state, usingSse }: { state: ConnectionState; usingSse: boolean }) {
  const meta = CONNECTION_META[state];
  return (
    <View style={styles.connChip} accessibilityRole="text">
      <View style={[styles.connDot, { backgroundColor: meta.color }]} />
      <Text style={[styles.connLabel, { color: meta.color }]}>
        {meta.label}
        {!usingSse && state === 'live' ? ' (polling)' : ''}
      </Text>
    </View>
  );
}

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { noSpoilers, locale, timeZone } = usePrefs();

  const live = useLiveMatch(id);

  // Haptic feedback when a new alertable goal appears (skip the first render so
  // we don't buzz for already-played events on screen open).
  const lastSeqRef = useRef<number>(-1);
  useEffect(() => {
    const events = live.events;
    if (events.length === 0) return;
    const newest = events[events.length - 1] as MatchEvent;
    if (newest.sequence > lastSeqRef.current) {
      if (lastSeqRef.current >= 0 && isAlertableGoal(newest.kind) && !noSpoilers) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      lastSeqRef.current = newest.sequence;
    }
  }, [live.events, noSpoilers]);

  const view = useMemo(() => {
    if (!live.fixture) return null;
    const fixture = live.fixture;
    const masked = maskFixture(fixture, noSpoilers);
    const timeline = maskEvents(live.events, noSpoilers)
      .slice()
      .sort((a, b) => b.sequence - a.sequence);
    return { fixture, masked, timeline };
  }, [live.fixture, live.events, noSpoilers]);

  const showError = live.error && !live.fixture;

  return (
    <>
      <Stack.Screen options={{ title: 'Match' }} />
      <Screen refreshing={live.isLoading} onRefresh={live.refetch}>
        {live.isLoading && !view ? <Loading /> : null}
        {showError ? <ErrorState message={live.error?.message ?? 'Could not load match.'} /> : null}

        {view ? (
          <>
            <View style={styles.connRow}>
              <ConnectionChip state={live.connection} usingSse={live.usingSse} />
            </View>

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
              <EmptyState
                message={
                  noSpoilers ? 'Events hidden in no-spoilers mode.' : 'No events yet.'
                }
              />
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
  connRow: { alignItems: 'flex-end' },
  connChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: 4,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  connDot: { width: 8, height: 8, borderRadius: 4 },
  connLabel: { fontSize: fontSize.caption, fontWeight: weight.title },
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
