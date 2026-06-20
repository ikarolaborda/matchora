/**
 * StatusChip — fixture status with color + LABEL (never color alone, per a11y).
 * Pulsing dot for live-ish statuses. Optional minute suffix.
 */
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { statusIntent } from '@matchora/ui';
import type { FixtureStatus } from '@matchora/shared';
import { colors, fontSize, radius, space, weight } from '@/src/lib/theme';

const STATUS_LABEL: Record<FixtureStatus, string> = {
  scheduled: 'Scheduled',
  live: 'LIVE',
  halftime: 'Half-time',
  extra_time: 'Extra time',
  penalties: 'Penalties',
  finished: 'Full-time',
  postponed: 'Postponed',
  cancelled: 'Cancelled',
};

interface Props {
  status: FixtureStatus;
  minute?: number | null;
  /** Override the label (e.g. masked no-spoilers label). */
  label?: string;
}

export function StatusChip({ status, minute, label }: Props) {
  const intent = statusIntent[status] ?? { color: colors.scheduled, pulse: false };
  const text = label ?? STATUS_LABEL[status];
  const showMinute =
    minute != null && (status === 'live' || status === 'extra_time');

  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!intent.pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [intent.pulse, pulse]);

  return (
    <View
      style={[styles.chip, { borderColor: intent.color }]}
      accessibilityRole="text"
      accessibilityLabel={showMinute ? `${text}, minute ${minute}` : text}
    >
      <Animated.View
        style={[styles.dot, { backgroundColor: intent.color, opacity: intent.pulse ? pulse : 1 }]}
      />
      <Text style={[styles.label, { color: intent.color }]} numberOfLines={1}>
        {text}
        {showMinute ? ` ${minute}'` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
  },
  label: {
    fontSize: fontSize.caption,
    fontWeight: weight.title,
    letterSpacing: 0.4,
  },
});
