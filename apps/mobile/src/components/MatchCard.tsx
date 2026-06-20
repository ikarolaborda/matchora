/**
 * MatchCard — tappable fixture row: two team badges, score (no-spoilers aware),
 * status chip and kickoff time. Whole card is one 44pt+ touch target.
 */
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Fixture, Locale } from '@matchora/shared';
import { maskFixture } from '@matchora/shared';
import { formatKickoff } from '@matchora/shared';
import { colors, fontSize, radius, space, MIN_TOUCH, weight } from '@/src/lib/theme';
import { TeamBadge } from './TeamBadge';
import { ScoreDisplay } from './ScoreDisplay';
import { StatusChip } from './StatusChip';

interface Props {
  fixture: Fixture;
  noSpoilers: boolean;
  locale: Locale;
  timeZone: string;
  isFavorite?: boolean;
  onPress: (fixtureId: string) => void;
  onToggleFavorite?: (fixtureId: string) => void;
}

function MatchCardImpl({
  fixture,
  noSpoilers,
  locale,
  timeZone,
  isFavorite,
  onPress,
  onToggleFavorite,
}: Props) {
  const { snapshot } = fixture;
  const masked = maskFixture(fixture, noSpoilers);
  const isScheduled = snapshot.status === 'scheduled';

  return (
    <Pressable
      onPress={() => onPress(fixture.id)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Match details, ${fixture.id}`}
    >
      <View style={styles.headerRow}>
        <StatusChip
          status={snapshot.status}
          minute={snapshot.minute}
          label={masked.masked ? 'Hidden' : undefined}
        />
        {onToggleFavorite ? (
          <Pressable
            onPress={() => onToggleFavorite(fixture.id)}
            hitSlop={12}
            style={styles.star}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Remove favorite' : 'Add favorite'}
          >
            <Text style={[styles.starText, isFavorite && styles.starOn]}>
              {isFavorite ? '★' : '☆'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.side}>
          <TeamBadge teamId={fixture.homeTeamId} />
        </View>

        <View style={styles.center}>
          {isScheduled ? (
            <Text style={styles.kickoff}>{formatKickoff(fixture.kickoffAt, locale, timeZone)}</Text>
          ) : (
            <ScoreDisplay
              homeText={masked.homeScoreText}
              awayText={masked.awayScoreText}
              penalties={masked.masked ? null : snapshot.penalties}
              size="md"
            />
          )}
        </View>

        <View style={[styles.side, styles.sideRight]}>
          <TeamBadge teamId={fixture.awayTeamId} />
        </View>
      </View>
    </Pressable>
  );
}

export const MatchCard = memo(MatchCardImpl);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    gap: space.md,
    minHeight: MIN_TOUCH,
  },
  pressed: { backgroundColor: colors.surfaceRaised },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  star: { padding: space.xs },
  starText: { fontSize: fontSize.title, color: colors.textFaint },
  starOn: { color: colors.brand },
  body: { flexDirection: 'row', alignItems: 'center' },
  side: { flex: 1 },
  sideRight: { alignItems: 'flex-end' },
  center: { flex: 1, alignItems: 'center' },
  kickoff: {
    color: colors.textMuted,
    fontSize: fontSize.body,
    fontWeight: weight.title,
    fontVariant: ['tabular-nums'],
  },
});
