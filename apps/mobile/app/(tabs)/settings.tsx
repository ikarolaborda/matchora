/**
 * Settings — legal disclaimer (REQUIRED), app version, data source, time zone,
 * and a language placeholder. No FIFA/official marks anywhere.
 */
import { StyleSheet, Text, View } from 'react-native';
import { LOCALES, type Locale } from '@matchora/shared';
import { usePrefs } from '@/src/lib/prefs';
import { API_BASE_URL } from '@/src/api';
import { Screen } from '@/src/components/Screen';
import { colors, fontSize, radius, space, weight } from '@/src/lib/theme';

// App version. Mirrors @matchora/config APP_VERSION; inlined to keep the
// server-config (secrets/env) module out of the React Native bundle.
const APP_VERSION = '0.1.0';

// Required legal disclaimer (matches NEXT_PUBLIC_DISCLAIMER in .env.example).
const DISCLAIMER =
  'Independent live score application. Not affiliated with, endorsed by, or sponsored by FIFA or any tournament organizer.';

const LOCALE_LABEL: Record<Locale, string> = {
  'pt-BR': 'Português (Brasil)',
  'pt-PT': 'Português (Portugal)',
  en: 'English',
  es: 'Español',
};

export default function SettingsScreen() {
  const { locale, timeZone } = usePrefs();

  return (
    <Screen title="Settings">
      <View style={styles.card}>
        <InfoRow label="App version" value={APP_VERSION} />
        <InfoRow label="Data source" value="MatchOra API (mock provider)" />
        <InfoRow label="Time zone" value={timeZone} />
        <InfoRow label="API endpoint" value={API_BASE_URL} mono />
      </View>

      <Text style={styles.sectionTitle}>Language</Text>
      <View style={styles.card}>
        <InfoRow label="Current" value={LOCALE_LABEL[locale]} />
        <View style={styles.row}>
          <Text style={styles.label}>Available</Text>
          <Text style={styles.value}>{LOCALES.map((l) => LOCALE_LABEL[l]).join(' · ')}</Text>
        </View>
        <Text style={styles.placeholder}>Language switching arrives in a future release.</Text>
      </View>

      <Text style={styles.sectionTitle}>Legal</Text>
      <View style={styles.card}>
        <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
      </View>
    </Screen>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, mono && styles.mono]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingVertical: space.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.md,
    minHeight: 44,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  label: { color: colors.textMuted, fontSize: fontSize.body },
  value: { color: colors.text, fontSize: fontSize.body, fontWeight: weight.title, flexShrink: 1, textAlign: 'right' },
  mono: { fontSize: fontSize.caption, color: colors.textMuted },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    fontWeight: weight.title,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: space.md,
  },
  placeholder: {
    color: colors.textFaint,
    fontSize: fontSize.caption,
    paddingVertical: space.sm,
  },
  disclaimer: {
    color: colors.textMuted,
    fontSize: fontSize.body,
    lineHeight: 20,
    paddingVertical: space.md,
  },
});
