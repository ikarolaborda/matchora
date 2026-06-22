/**
 * Settings — backend URL (runtime-configurable), legal disclaimer (REQUIRED),
 * app version, data source, time zone, and a language placeholder. No
 * FIFA/official marks anywhere.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LOCALES, type Locale } from '@matchora/shared';
import { usePrefs } from '@/src/lib/prefs';
import { getBackendUrl, useBackendUrl } from '@/src/lib/backend';
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
      <Text style={styles.sectionTitle}>Backend</Text>
      <BackendCard />

      <View style={styles.card}>
        <InfoRow label="App version" value={APP_VERSION} />
        <InfoRow label="Data source" value="MatchOra API (mock provider)" />
        <InfoRow label="Time zone" value={timeZone} />
        <InfoRow label="API endpoint" value={getBackendUrl() || 'Not set'} mono />
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

function BackendCard() {
  const { url, configured, save } = useBackendUrl();
  const [draft, setDraft] = useState(url);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = draft.trim();
  const dirty = trimmed.replace(/\/$/, '') !== url;
  const canSave = trimmed.length > 0 && dirty && !saving;

  const onSave = async () => {
    if (!canSave) return;
    // iOS App Transport Security blocks cleartext HTTP to non-localhost, so the
    // backend (ngrok/cloudflared tunnel or a deployed host) must be HTTPS.
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      setError('Enter a valid URL, e.g. https://your-tunnel.ngrok-free.app');
      return;
    }
    if (parsed.protocol !== 'https:') {
      setError('URL must start with https:// (iOS blocks plain http).');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await save(trimmed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.fieldLabel}>Server URL</Text>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="https://your-tunnel.ngrok-free.app"
        placeholderTextColor={colors.textFaint}
        style={styles.input}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      <Pressable
        onPress={onSave}
        disabled={!canSave}
        style={({ pressed }) => [
          styles.saveButton,
          !canSave && styles.saveButtonDisabled,
          pressed && canSave && styles.saveButtonPressed,
        ]}
      >
        <Text style={[styles.saveButtonText, !canSave && styles.saveButtonTextDisabled]}>
          {saving ? 'Saving…' : 'Save'}
        </Text>
      </Pressable>
      <View style={styles.row}>
        <Text style={styles.label}>Current</Text>
        <Text style={[styles.value, styles.mono]} numberOfLines={1}>
          {configured ? url : 'Not set'}
        </Text>
      </View>
    </View>
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
  fieldLabel: {
    color: colors.textMuted,
    fontSize: fontSize.body,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  input: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: fontSize.body,
    minHeight: 44,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  fieldError: {
    color: '#f87171',
    fontSize: fontSize.caption,
    paddingTop: space.sm,
  },
  saveButton: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginTop: space.md,
    marginBottom: space.xs,
  },
  saveButtonDisabled: { backgroundColor: colors.surfaceRaised },
  saveButtonPressed: { backgroundColor: colors.brandDim },
  saveButtonText: { color: colors.bg, fontSize: fontSize.body, fontWeight: weight.title },
  saveButtonTextDisabled: { color: colors.textFaint },
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
