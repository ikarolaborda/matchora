/**
 * Push-notification registration for the MVP (Expo Notifications).
 *
 * Flow (per Expo docs):
 *   1. Guard: push only works on a physical device.
 *   2. Request permissions (ask if not already granted).
 *   3. On Android, ensure a notification channel exists.
 *   4. Read the EAS projectId from app config and call
 *      getExpoPushTokenAsync({ projectId }) → ExpoPushToken.
 *
 * The returned Expo push token is what the SERVER stores as a DeviceToken
 * (platform 'ios'|'android'). See docs/PUSH_NOTIFICATIONS.md for the full
 * abstraction (APNs/FCM under Expo for MVP, direct APNs/FCM later).
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Foreground presentation: show alerts/banners while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    // SDK 52 fields (banner/list) — kept for forward-compat.
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface RegisterResult {
  token: string | null;
  /** Why a token could not be obtained, when token is null. */
  reason?: 'not-physical-device' | 'permission-denied' | 'missing-project-id' | 'error';
}

function getProjectId(): string | undefined {
  // expo-constants exposes the EAS project id at extra.eas.projectId.
  // easConfig is present on dev/standalone builds; types vary across SDKs.
  const easConfig = (Constants as { easConfig?: { projectId?: string } }).easConfig;
  return Constants.expoConfig?.extra?.eas?.projectId ?? easConfig?.projectId;
}

export async function registerForPushNotificationsAsync(): Promise<RegisterResult> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Match alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22e3a3',
    });
  }

  if (!Device.isDevice) {
    return { token: null, reason: 'not-physical-device' };
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') {
    return { token: null, reason: 'permission-denied' };
  }

  const projectId = getProjectId();
  if (!projectId || projectId === '00000000-0000-0000-0000-000000000000') {
    // Placeholder projectId — cannot obtain a real Expo push token yet.
    return { token: null, reason: 'missing-project-id' };
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token: data };
  } catch {
    return { token: null, reason: 'error' };
  }
}
