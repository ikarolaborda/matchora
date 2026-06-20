# iOS Live Activities & Dynamic Island

How MatchOra shows a running match on the **Lock Screen** and in the **Dynamic
Island** using Apple's **ActivityKit** + **WidgetKit**.

> **Honesty up front:** what ships in this repo is a **documented scaffold**, not
> a working build. The Swift files under
> [`apps/mobile/ios-live-activity/`](../apps/mobile/ios-live-activity/) and the
> JS bridge `apps/mobile/src/lib/liveActivity.ts` compile/run as **no-ops** until
> they are wired into a real native iOS build. That requires a real **Apple
> Developer account**, **Xcode**, and an **EAS development build** — none of
> which exist in this environment (Expo Go cannot run Live Activities).

## What they are

- **Live Activity** — a glanceable, real-time UI on the Lock Screen for an
  ongoing event (here: a live match score + minute). Introduced in iOS 16.1.
- **Dynamic Island** — on supported iPhones, the same activity renders in
  compact / minimal / expanded presentations around the front camera cutout.

For MatchOra a Live Activity shows: home/away codes, the score, the match
minute, and status (LIVE / HT / penalties / FT) — the `FixtureSnapshot` essence.

## Why a real native build is required

- ActivityKit + WidgetKit are **native Swift** frameworks; there is no
  JavaScript-only path. **Expo Go does not support Live Activities** — you need
  a custom dev/standalone build (`expo prebuild` + EAS Build).
- Starting/updating an activity needs the **Live Activities capability** and (for
  remote updates) the **Push Notifications** capability + an **APNs key**, all of
  which are gated behind an Apple Developer account and signing.
- `NSSupportsLiveActivities = true` must be in `Info.plist` — already declared in
  `apps/mobile/app.json` under `ios.infoPlist`.

## The model (ActivityKit attributes / content state)

ActivityKit splits state in two:

- **Attributes** (static, set once at start): `fixtureId`, `homeCode`, `awayCode`.
- **ContentState** (dynamic, updated over the activity's life): `homeScore`,
  `awayScore`, `minute`, `status`, `homePenalties`, `awayPenalties`.

These are defined in
[`MatchActivityAttributes.swift`](../apps/mobile/ios-live-activity/MatchActivityAttributes.swift)
and **mirror** the JS `ActivityContentState` / `StartInput` in
`apps/mobile/src/lib/liveActivity.ts`, which in turn track the shared
`FixtureSnapshot` / `FixtureStatus` from `@matchora/shared`. Keep the field names
in sync across all three — they are the contract between JS and Swift.

The Lock Screen + Dynamic Island layouts live in
[`MatchLiveActivityWidget.swift`](../apps/mobile/ios-live-activity/MatchLiveActivityWidget.swift).

## Update paths

1. **Local updates (simplest):** while the app is foreground/background-capable,
   call `Activity.update(...)` from the native module as new match data arrives
   (the app already polls `/api/fixtures/[id]`).
2. **Push-to-start (iOS 17.2+):** the server can *start* an activity remotely via
   an APNs push to a **push-to-start token** the device registers — useful for
   "match kicking off" without the app open.
3. **Remote updates via APNs:** each started activity yields a per-activity
   **update token**; the server/worker sends APNs pushes
   (`apns-push-type: liveactivity`) to that token to update the score even when
   the app is suspended. (The DB already has
   `live_activity_subscriptions { push_to_start_token, activity_token }`.)

These remote paths reuse the same APNs key described in
[`PUSH_NOTIFICATIONS.md`](./PUSH_NOTIFICATIONS.md).

## Where the scaffold lives

```
apps/mobile/
  app.json                          # ios.infoPlist.NSSupportsLiveActivities = true
  src/lib/liveActivity.ts           # JS bridge (no-op until native module exists)
  ios-live-activity/
    MatchActivityAttributes.swift   # ActivityAttributes + ContentState
    MatchLiveActivityWidget.swift   # Lock Screen + Dynamic Island UI
    README.md                       # target-by-target placement
```

## Step-by-step wiring (on a Mac with Xcode + Apple account)

1. **Prebuild** the native project:
   ```
   cd apps/mobile
   npx expo prebuild -p ios
   ```
2. **Add a Widget Extension target** in Xcode (`File ▸ New ▸ Target ▸ Widget
   Extension`, check "Include Live Activity").
3. **Add the Swift files:**
   - `MatchActivityAttributes.swift` → both the **app** and the **widget**
     targets (shared type).
   - `MatchLiveActivityWidget.swift` → the **widget** target only.
4. **Capabilities** (Signing & Capabilities):
   - App target: **Push Notifications**, **Background Modes** (remote
     notifications) and keep **Live Activities** enabled.
   - Confirm `NSSupportsLiveActivities = YES` is present (from `app.json`).
5. **Native module:** implement `MatchLiveActivity` (an Expo Module or classic
   RN bridge) exposing `areActivitiesEnabled / start / update / end`, wrapping
   `Activity.request`, `activity.update`, `activity.end`. Field names must match
   `liveActivity.ts`.
6. **Start the activity** from the match-detail screen (or via push-to-start)
   and call `update` as the score changes.
7. **APNs key:** create an APNs Auth Key (.p8) in the Apple Developer portal and
   configure it (`APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY`) for the
   server/worker that sends Live Activity update pushes. If delivering through
   Expo, upload the key to EAS instead.
8. **Build & run** on a **physical device** (Live Activities don't appear in
   most simulators) via `eas build --profile development` or `expo run:ios`.

## A config-plugin alternative

Rather than hand-editing the Xcode project each prebuild, encapsulate steps 2–4
in an Expo **config plugin** (or use a community plugin such as
`expo-apple-targets`) so the widget target, entitlements and Swift files are
regenerated automatically on every `expo prebuild`. This keeps the managed
workflow intact.
```
