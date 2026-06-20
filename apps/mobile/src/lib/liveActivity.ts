/**
 * JS bridge for iOS Live Activities (ActivityKit).
 *
 * This is a DOCUMENTED STUB. A working implementation requires a native module
 * (Swift, ActivityKit) that is NOT available in Expo Go — it needs an EAS
 * development build + a real Apple Developer account. The native scaffold lives
 * in apps/mobile/ios-live-activity/ and the wiring steps are in
 * docs/IOS_LIVE_ACTIVITIES.md.
 *
 * The intended native module interface (e.g. NativeModules.MatchLiveActivity):
 *   start(input: StartInput): Promise<{ activityId: string }>
 *   update(activityId: string, state: ActivityContentState): Promise<void>
 *   end(activityId: string, finalState?: ActivityContentState): Promise<void>
 *   areActivitiesEnabled(): Promise<boolean>
 *
 * Until that module exists, every call here is a safe no-op so the rest of the
 * app compiles and runs (Expo Go / Android / simulator without entitlements).
 */
import { NativeModules, Platform } from 'react-native';
import type { FixtureStatus } from '@matchora/shared';

/** Mirrors the ActivityKit ContentState in MatchActivityAttributes.swift. */
export interface ActivityContentState {
  homeScore: number;
  awayScore: number;
  minute: number | null;
  status: FixtureStatus;
  homePenalties?: number | null;
  awayPenalties?: number | null;
}

/** Mirrors the ActivityKit ActivityAttributes (static, set once at start). */
export interface StartInput {
  fixtureId: string;
  homeCode: string;
  awayCode: string;
  initialState: ActivityContentState;
}

interface MatchLiveActivityNativeModule {
  areActivitiesEnabled(): Promise<boolean>;
  start(input: StartInput): Promise<{ activityId: string }>;
  update(activityId: string, state: ActivityContentState): Promise<void>;
  end(activityId: string, finalState?: ActivityContentState): Promise<void>;
}

const native: MatchLiveActivityNativeModule | undefined =
  Platform.OS === 'ios'
    ? (NativeModules.MatchLiveActivity as MatchLiveActivityNativeModule | undefined)
    : undefined;

/** True only when the native ActivityKit module is linked and enabled. */
export async function areLiveActivitiesEnabled(): Promise<boolean> {
  if (!native) return false;
  try {
    return await native.areActivitiesEnabled();
  } catch {
    return false;
  }
}

export async function startLiveActivity(input: StartInput): Promise<string | null> {
  if (!native) return null;
  try {
    const { activityId } = await native.start(input);
    return activityId;
  } catch {
    return null;
  }
}

export async function updateLiveActivity(
  activityId: string,
  state: ActivityContentState,
): Promise<void> {
  if (!native) return;
  try {
    await native.update(activityId, state);
  } catch {
    // no-op
  }
}

export async function endLiveActivity(
  activityId: string,
  finalState?: ActivityContentState,
): Promise<void> {
  if (!native) return;
  try {
    await native.end(activityId, finalState);
  } catch {
    // no-op
  }
}
