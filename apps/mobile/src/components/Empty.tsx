/** Empty / loading / error inline states. */
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, space, weight } from '@/src/lib/theme';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.box}>
      <ActivityIndicator color={colors.brand} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.muted}>{message}</Text>
      <Text style={styles.hint}>Pull down to retry.</Text>
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.box}>
      <Text style={styles.muted}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    paddingVertical: space.xxl,
    alignItems: 'center',
    gap: space.sm,
  },
  title: { color: colors.text, fontSize: fontSize.title, fontWeight: weight.title },
  muted: { color: colors.textMuted, fontSize: fontSize.body, textAlign: 'center' },
  hint: { color: colors.textFaint, fontSize: fontSize.caption },
});
