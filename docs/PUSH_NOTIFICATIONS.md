# Push notifications

How MatchOra delivers match alerts (goals, red cards, full-time, …) to devices,
and how the abstraction lets us start simple (Expo) and grow into direct
APNs/FCM with a dedicated fanout worker — without changing the domain model.

> Reminder: MatchOra is an **independent** live-score app. Notification copy must
> never imply affiliation with FIFA or any tournament organizer.

## TL;DR

- **MVP transport:** [Expo Push](https://docs.expo.dev/push-notifications/overview/)
  — one API for both APNs (iOS) and FCM (Android). The mobile app registers an
  **Expo push token** and the server stores it as a `DeviceToken`.
- **Future transport:** direct **APNs** (iOS) + **FCM** (Android/web) from a
  fanout worker, keyed off the same `DeviceToken` / `NotificationPreference`
  model. The web app's API just needs to enqueue; the worker delivers.
- **Server owns policy:** quiet hours and no-spoilers masking are enforced
  **server-side at fanout time**, never trusted to the client.

## Data model (already in `packages/data/src/db/schema.ts`)

```
device_tokens
  id            text  PK
  user_id       text  FK users.id
  platform      text  -- 'ios' | 'android' | 'web'
  token         text  -- Expo push token (MVP) OR raw APNs/FCM token (later)
  created_at    timestamptz

notification_preferences
  user_id       text  PK FK users.id
  alerts        jsonb -- Record<AlertType, boolean>
  quiet_hours   jsonb -- QuietHours { enabled, start "HH:mm", end "HH:mm" }
  no_spoilers   boolean
```

These map 1:1 to `@matchora/shared` types: `NotificationPreference`,
`QuietHours`, `AlertType`. The `alerts` JSON is `Record<AlertType, boolean>`.

> The `platform` + `token` pair is deliberately transport-agnostic: for the MVP
> `token` holds an **Expo push token**; when we move to direct APNs/FCM the same
> row holds the native device token. A `provider` column can be added additively
> if we need to run both transports during migration.

## Alert types (`AlertType` in `@matchora/shared`)

| AlertType | Trigger (from the match event log) | No-spoilers behavior |
| --- | --- | --- |
| `match_start` | `match_started` | Safe — no score. Always allowed. |
| `goal` | `goal` / `own_goal` / `penalty_goal` (`isAlertableGoal`) | **Suppressed or masked** (reveals score). |
| `penalty` | `penalty_goal` / `penalty_missed` | Masked. |
| `red_card` | `red_card` / `second_yellow` | Safe-ish; send without score. |
| `halftime` | `halftime` | Masked (implies score). |
| `fulltime` | `fulltime` / `match_ended` | **Suppressed** in no-spoilers. |
| `group_table_changed` | standings recomputed (rank change) | Masked (implies results). |
| `lineup_available` | line-ups published | Safe — no score. |

`isAlertableGoal(kind)` from `@matchora/shared` decides whether a goal-family
event should fire a `goal` alert.

## Registration flow (mobile MVP)

Implemented in `apps/mobile/src/lib/notifications.ts`
(`registerForPushNotificationsAsync`), called once from
`apps/mobile/app/_layout.tsx`:

1. **Physical-device guard** — `expo-device` `Device.isDevice`. Simulators
   cannot receive push tokens.
2. **Android channel** — `Notifications.setNotificationChannelAsync('default', …)`
   with HIGH importance.
3. **Permissions** — `getPermissionsAsync()` then `requestPermissionsAsync()` if
   not already granted.
4. **Project id** — read the EAS project id from
   `Constants.expoConfig?.extra?.eas?.projectId` (set in `app.json`).
   `getExpoPushTokenAsync({ projectId })` **requires** it; the call fails without
   a real project id (the repo ships a placeholder zero-UUID).
5. **Token** — `getExpoPushTokenAsync({ projectId })` → `ExpoPushToken`.
6. **Upsert server-side** — POST the token + platform to the API, which inserts
   / updates a `device_tokens` row for the authenticated user. (The POST
   endpoint is a TODO on the web side; the mobile client currently logs the
   token — see the `console.log` in `_layout.tsx`.)

```
Device ─ register ─▶ Expo push token
        ─ POST ────▶ /api/devices  (upsert device_tokens row)   [TODO server]
```

## Fanout flow (server)

```
match event (mock/provider)
   └─▶ ingest (/api/live/ingest) ─▶ LiveHub.publish  (SSE to web, today)
   └─▶ alert evaluator ─▶ for each subscribed user:
          ├─ is this AlertType enabled?            (notification_preferences.alerts)
          ├─ within quiet hours?                   (isWithinQuietHours → defer/drop)
          ├─ no-spoilers? mask or suppress payload (maskFixture / table above)
          └─ enqueue delivery per device_token
   └─▶ delivery
          MVP:    POST https://exp.host/--/api/v2/push/send   (Expo)
          Future: APNs (HTTP/2, token auth) + FCM (HTTP v1)
```

- **Quiet hours:** `isWithinQuietHours(nowHm, start, end)` from `@matchora/shared`
  (handles windows that cross midnight). Within the window, suppress
  non-critical alerts (keep `match_start` / `red_card` optional via policy).
  `nowHm` is computed in the user's `timeZone` (`localHourMinute`).
- **No-spoilers:** reuse `maskFixture` / `maskEvents`. The *presentation* is
  masked; the underlying event log is never mutated.

## Architecture seam → move fanout to a worker

The alert evaluator + delivery is intentionally separable:

```
┌────────────┐  event   ┌──────────────┐  enqueue  ┌────────────────┐  deliver
│ ingest API │ ───────▶ │ outbox/queue │ ────────▶ │ fanout WORKER  │ ──────▶ APNs / FCM / Expo
└────────────┘          │ (Redis/PG)   │           │ (separate proc)│
                        └──────────────┘           └────────────────┘
```

Today the live hub is in-process (`getHub()`); `REDIS_URL` is the seam — when
set, fanout/replay move to Redis and a standalone worker process consumes the
queue and talks to APNs/FCM directly. The web API only needs to **enqueue**;
nothing in the domain types changes.

## Environment variables

From `.env.example` (all optional for the mock MVP):

```
# iOS — APNs (token-based auth; preferred over .p12 certs)
APNS_KEY_ID=
APNS_TEAM_ID=
APNS_BUNDLE_ID=com.matchora.app
APNS_PRIVATE_KEY=          # contents of the .p8 key

# Android / web — FCM (HTTP v1, service-account auth)
FCM_PROJECT_ID=
FCM_SERVICE_ACCOUNT_JSON=  # service-account JSON (or a path to it)
```

- **Expo (MVP)** needs no server secrets for sending (it uses the Expo push
  service), but the **iOS push key (APNs .p8) must be uploaded to Expo/EAS** so
  Expo can deliver to APNs on our behalf. The `EXPO_PUBLIC_*` client vars carry
  no secrets.
- **Direct APNs/FCM (future)** uses the vars above from the worker only —
  never sent to the client.

## Mobile client notes (Expo)

- Foreground presentation is set via `Notifications.setNotificationHandler`
  (banner + sound) in `notifications.ts`.
- `getExpoPushTokenAsync({ projectId })` **requires** `projectId`
  (`Constants.expoConfig.extra.eas.projectId`). Replace the placeholder UUID in
  `app.json` with the real EAS project id before a build.
- Expo Go can show local notifications but **remote push requires a development
  build** for full APNs entitlement behavior on iOS.
```
