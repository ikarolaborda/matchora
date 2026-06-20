/**
 * TeamBadge — neutral, brand-safe team chip: emoji flag (from country code) +
 * code/initials, on a token-colored surface. No protected federation marks.
 */
import { StyleSheet, Text, View } from 'react-native';
import { emojiFlag } from '@matchora/ui';
import { colors, fontSize, radius, space, weight } from '@/src/lib/theme';
import { teamDisplay } from '@/src/lib/teamDisplay';

interface Props {
  teamId: string | null | undefined;
  /** 'row' (flag + code inline) or 'stacked' (flag above code). */
  layout?: 'row' | 'stacked';
}

export function TeamBadge({ teamId, layout = 'row' }: Props) {
  const { code, countryCode, initials } = teamDisplay(teamId);
  const flag = countryCode ? emojiFlag(countryCode) : null;
  const label = teamId ? code : 'To be decided';

  return (
    <View
      style={[styles.base, layout === 'stacked' && styles.stacked]}
      accessibilityRole="image"
      accessibilityLabel={`Team ${label}`}
    >
      {flag ? (
        <Text style={styles.flag} accessibilityElementsHidden>
          {flag}
        </Text>
      ) : (
        <View style={styles.initialsWrap}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
      )}
      <Text style={styles.code} numberOfLines={1}>
        {code}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  stacked: {
    flexDirection: 'column',
    gap: space.xs,
  },
  flag: {
    fontSize: 24,
  },
  initialsWrap: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    fontWeight: weight.title,
  },
  code: {
    color: colors.text,
    fontSize: fontSize.body,
    fontWeight: weight.title,
  },
});
