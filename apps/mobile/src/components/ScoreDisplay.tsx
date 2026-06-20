/**
 * ScoreDisplay — large, high-contrast score. Honors no-spoilers masking via the
 * shared maskFixture() text. Optionally shows a penalty shootout tally.
 */
import { StyleSheet, Text, View } from 'react-native';
import type { ScorePair } from '@matchora/shared';
import { colors, fontSize, space, weight } from '@/src/lib/theme';

interface Props {
  homeText: string;
  awayText: string;
  penalties?: ScorePair | null;
  /** 'lg' for the match detail header, 'md' for cards. */
  size?: 'md' | 'lg';
}

export function ScoreDisplay({ homeText, awayText, penalties, size = 'md' }: Props) {
  const scoreSize = size === 'lg' ? fontSize.display : fontSize.score;
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={[styles.score, { fontSize: scoreSize }]} accessibilityLabel={`Home ${homeText}`}>
          {homeText}
        </Text>
        <Text style={[styles.dash, { fontSize: scoreSize }]}>:</Text>
        <Text style={[styles.score, { fontSize: scoreSize }]} accessibilityLabel={`Away ${awayText}`}>
          {awayText}
        </Text>
      </View>
      {penalties ? (
        <Text style={styles.pens} accessibilityLabel={`Penalties ${penalties.home} to ${penalties.away}`}>
          ({penalties.home} - {penalties.away} pens)
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  score: { color: colors.text, fontWeight: weight.score, fontVariant: ['tabular-nums'] },
  dash: { color: colors.textFaint, fontWeight: weight.score },
  pens: { color: colors.textMuted, fontSize: fontSize.caption, marginTop: space.xs },
});
