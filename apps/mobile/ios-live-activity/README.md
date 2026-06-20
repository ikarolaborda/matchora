# iOS Live Activity scaffold (ActivityKit + WidgetKit)

> **This is a documented scaffold, not a working build.** These Swift files are
> NOT compiled by Expo Go and are NOT built in this repo's CI environment.
> Shipping Live Activities requires a real **Apple Developer account**, **Xcode**,
> and an **EAS development build** (not Expo Go). Full instructions live in
> [`/docs/IOS_LIVE_ACTIVITIES.md`](../../../docs/IOS_LIVE_ACTIVITIES.md).

## Files here

| File | Target | Purpose |
| --- | --- | --- |
| `MatchActivityAttributes.swift` | Shared (app + widget) | `ActivityAttributes` + `ContentState` (home/away score, minute, status, penalties). Mirrors `src/lib/liveActivity.ts` and `FixtureSnapshot` in `@matchora/shared`. |
| `MatchLiveActivityWidget.swift` | Widget Extension | Lock Screen layout + Dynamic Island (compact / minimal / expanded). |

## How these connect to the JS app

- `apps/mobile/src/lib/liveActivity.ts` is the JS bridge. It calls a native
  module `NativeModules.MatchLiveActivity` with `start / update / end /
  areActivitiesEnabled`. Until that native module exists it is a safe no-op.
- You must implement the native module (Swift) that wraps `Activity.request(...)`,
  `activity.update(...)`, and `activity.end(...)` and expose it to React Native
  (an Expo Module or a classic bridge module). The `ContentState` field names
  must match `ActivityContentState` in `liveActivity.ts`.

## Wiring summary (see the doc for the full walkthrough)

1. `npx expo prebuild -p ios` to generate the native iOS project.
2. In Xcode add a **Widget Extension** target and add both Swift files
   (`MatchActivityAttributes.swift` to both app + widget targets; the widget
   file to the extension only).
3. Enable **Push Notifications** + **Live Activities** capabilities; keep
   `NSSupportsLiveActivities = true` (already set in `app.json` `infoPlist`).
4. Implement the `MatchLiveActivity` native module and start an activity from
   the match-detail screen (or via push-to-start).
5. For remote updates, send APNs Live Activity pushes to the per-activity
   update token from your server/worker (see `docs/PUSH_NOTIFICATIONS.md`).
