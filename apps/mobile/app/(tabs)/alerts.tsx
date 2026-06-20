/**
 * Alerts — notification preferences (client-side mirror of NotificationPreference).
 *
 * MVP: toggles are held in component state. A real build PUTs these to the API
 * (NotificationPreference per user) and the server enforces quiet hours +
 * no-spoilers at fanout time. See docs/PUSH_NOTIFICATIONS.md.
 */
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { AlertType } from '@matchora/shared';
import { usePrefs } from '@/src/lib/prefs';
import { Screen } from '@/src/components/Screen';
import { colors, fontSize, radius, space, weight } from '@/src/lib/theme';

const ALERT_LABELS: Record<AlertType, string> = {
  match_start: 'Match start',
  goal: 'Goals',
  penalty: 'Penalties',
  red_card: 'Red cards',
  halftime: 'Half-time',
  fulltime: 'Full-time',
  group_table_changed: 'Group table changes',
  lineup_available: 'Line-ups available',
};

const ALERT_ORDER: AlertType[] = [
  'match_start',
  'goal',
  'penalty',
  'red_card',
  'halftime',
  'fulltime',
  'group_table_changed',
  'lineup_available',
];

export default function AlertsScreen() {
  const { noSpoilers, setNoSpoilers } = usePrefs();
  const [alerts, setAlerts] = useState<Record<AlertType, boolean>>({
    match_start: true,
    goal: true,
    penalty: true,
    red_card: true,
    halftime: false,
    fulltime: true,
    group_table_changed: false,
    lineup_available: false,
  });
  const [quietHours, setQuietHours] = useState(false);

  const toggle = (key: AlertType) => {
    void Haptics.selectionAsync();
    setAlerts((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Screen title="Alerts" subtitle="Choose what you get notified about">
      <View style={styles.group}>
        {ALERT_ORDER.map((key) => (
          <Row
            key={key}
            label={ALERT_LABELS[key]}
            value={alerts[key]}
            onValueChange={() => toggle(key)}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Delivery</Text>
      <View style={styles.group}>
        <Row
          label="Quiet hours"
          hint="Pause non-critical alerts overnight (enforced server-side)."
          value={quietHours}
          onValueChange={() => {
            void Haptics.selectionAsync();
            setQuietHours((v) => !v);
          }}
        />
        <Row
          label="No-spoilers mode"
          hint="Hide scores in alerts and the app until you open a match."
          value={noSpoilers}
          onValueChange={() => {
            void Haptics.selectionAsync();
            setNoSpoilers(!noSpoilers);
          }}
        />
      </View>

      <Text style={styles.note}>
        Preferences are stored on-device in this preview build. Connect an account to sync them and
        receive push notifications.
      </Text>
    </Screen>
  );
}

function Row({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.brandDim, false: colors.border }}
        thumbColor={value ? colors.brand : colors.textFaint}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: space.md,
  },
  rowText: { flex: 1, gap: 2 },
  label: { color: colors.text, fontSize: fontSize.body, fontWeight: weight.title },
  hint: { color: colors.textFaint, fontSize: fontSize.caption },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.caption,
    fontWeight: weight.title,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: space.md,
  },
  note: { color: colors.textFaint, fontSize: fontSize.caption, marginTop: space.sm },
});
