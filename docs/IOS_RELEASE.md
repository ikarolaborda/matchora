# MatchOra iOS — Release / Publish Checklist

This is the end-to-end checklist to ship the Expo iOS app (`apps/mobile`) to
TestFlight and the App Store via **EAS Build + EAS Submit**.

Steps marked **[APPLE]** require a real Apple Developer account and **cannot be
done from this repo alone** — they are interactive and account-gated.

---

## 0. What lives where

| Artifact | Path | Purpose |
| --- | --- | --- |
| Build config | `apps/mobile/eas.json` | EAS build + submit profiles |
| App config | `apps/mobile/app.json` | bundle id, version, Info.plist, privacy manifest |
| Privacy manifest (mirror) | `apps/mobile/PrivacyInfo.xcprivacy` | standalone reference; canonical source is `app.json` → `ios.privacyManifests` |
| Icon / splash | `apps/mobile/assets/icon.png`, `assets/splash.png` | **must be added** (see `apps/mobile/assets/README.md`) |
| Live transport | `apps/mobile/src/lib/useLiveMatch.ts` | SSE with polling fallback |

---

## 1. Prerequisites

1. **[APPLE]** Active **Apple Developer Program** membership ($99/yr).
2. **[APPLE]** An **App Store Connect** record for the app (create at
   <https://appstore connect.apple.com> → Apps → +). Note the numeric
   **App ID** (a.k.a. "Apple ID" of the app / `ascAppId`).
3. An **Expo account** and the EAS CLI available (installed centrally; this
   repo does not run installs).
   ```bash
   eas login                # authenticate the Expo account
   eas whoami               # verify
   ```
4. Add the binary assets the build references (build fails without them):
   - `apps/mobile/assets/icon.png` — 1024×1024, opaque, no alpha.
   - `apps/mobile/assets/splash.png` — see `apps/mobile/assets/README.md`.

---

## 2. One-time project + credentials setup

### 2.1 Link the EAS project (sets the real projectId)
```bash
cd apps/mobile
eas init
```
- This creates/links the EAS project and writes the real UUID into
  `app.json` → `expo.extra.eas.projectId`, replacing the placeholder
  `REPLACE-ME-eas-project-id-uuid`.
- Because `eas.json` sets `cli.appVersionSource: "remote"`, the **version and
  build number are managed by EAS servers** (`production` uses
  `autoIncrement: true`). The `version`/`ios.buildNumber` in `app.json` are only
  the initial seed values.

### 2.2 **[APPLE]** Register the bundle identifier & credentials
The bundle id is `com.matchora.app` (set in `app.json`).
```bash
eas credentials            # interactive: pick iOS → production
```
- Let EAS **manage** the Distribution Certificate and Provisioning Profile
  (recommended), or supply your own.
- Registers `com.matchora.app` as an App ID on the developer portal if needed.

### 2.3 **[APPLE]** Push notifications key (APNs)
The app uses `expo-notifications` (see `docs/PUSH_NOTIFICATIONS.md`). For real
push you need an **APNs key**:
```bash
eas credentials            # iOS → Push Notifications → set up a Push Key
```
- This is required only when shipping server-driven push. Local/foreground
  haptics and the SSE live feed work without it.

---

## 3. Fill in the submit placeholders

Edit `apps/mobile/eas.json` → `submit.production.ios` and replace:

| Placeholder | Replace with | Where to find it |
| --- | --- | --- |
| `appleId` | Your Apple **account email** | the Apple ID you log in with |
| `ascAppId` | App Store Connect **App ID** (digits only) | App Store Connect → App → App Information → "Apple ID" |
| `appleTeamId` | 10-char **Team ID** | developer.apple.com → Membership |

> Alternative to `appleId` interactive login: an **App Store Connect API key**
> (`ascApiKeyPath` / `ascApiKeyId` / `ascApiKeyIssuerId`) for non-interactive
> CI submits. Swap those into `submit.production.ios` if you automate releases.

Also confirm `build.*.env.EXPO_PUBLIC_API_BASE_URL` points at your real
production API host (currently a placeholder `https://api.matchora.example.com`).

---

## 4. Build

```bash
# Production build (App Store / TestFlight). autoIncrement bumps the build number.
eas build --platform ios --profile production
```
Other profiles:
```bash
# Internal QA build, installable via link/UDID (no App Store):
eas build --platform ios --profile preview

# Dev client for local development (expo-dev-client):
eas build --platform ios --profile development
```
- The first iOS build triggers the **[APPLE]** credentials flow from §2.2 if not
  already done.
- EAS runs `expo prebuild` on its servers, merging
  `app.json` → `ios.privacyManifests` into the generated
  `PrivacyInfo.xcprivacy`. Our standalone file is a human-readable mirror.

---

## 5. Submit to App Store Connect / TestFlight

```bash
eas submit --platform ios --profile production
```
- Uploads the latest `production` build (or pass `--id <build-id>`).
- Uses `submit.production.ios` from `eas.json` (the values you filled in §3).
- **[APPLE]** Apple processes the build; it then appears in **App Store Connect
  → TestFlight** (usually within minutes to ~1 hour).

### TestFlight flow **[APPLE]**
1. In App Store Connect → **TestFlight**, wait for the build to finish
   "Processing".
2. Complete **Export Compliance** if prompted — the app declares
   `ITSAppUsesNonExemptEncryption: false` in `app.json`
   (`ios.infoPlist`), so it should auto-clear (we only use standard HTTPS/TLS).
   If you later add non-exempt crypto, update this flag.
3. Add **Internal testers** (your team) → they get it immediately via the
   TestFlight app. **External testers** require a Beta App Review.

### App Store release **[APPLE]**
1. Create a new **App Store version** in App Store Connect.
2. Attach the processed build, fill metadata, screenshots, age rating.
3. Complete the **App Privacy** questionnaire. Our manifest declares:
   - `NSPrivacyTracking = false` (no tracking, empty tracking domains).
   - No collected data types (thin read-only client over the match API).
   - Required-reason API: **UserDefaults** with reason **`CA92.1`** (used by
     React Native / Expo internals — AsyncStorage / settings).
4. Submit for **App Review**.

---

## 6. Privacy manifest & required-reason APIs

- Canonical declaration: `app.json` → `expo.ios.privacyManifests`.
- Standalone mirror: `apps/mobile/PrivacyInfo.xcprivacy`.
- We declare exactly one accessed-API category:
  `NSPrivacyAccessedAPICategoryUserDefaults` → `["CA92.1"]`
  ("Access info from the same app, per documentation").
- If you add SDKs that touch other required-reason APIs (file timestamps, disk
  space, system boot time, etc.), add the matching `NSPrivacyAccessedAPIType`
  entries. Run `npx expo install --fix` to keep Expo libraries' own manifests
  current.

---

## 7. Live updates (SSE) — runtime notes

- The match screen consumes the SSE endpoint
  `${EXPO_PUBLIC_API_BASE_URL}/api/live/matches/{id}/events` via
  `react-native-sse`, parsing `snapshot` / `match_event` frames and resuming
  with `Last-Event-ID` (`src/lib/useLiveMatch.ts`).
- **Polling remains the fallback**: if `react-native-sse` is unavailable at
  runtime (Hermes/runtime quirk) or the stream errors repeatedly, the hook
  silently reverts to React-Query polling of `/api/fixtures/{id}`. There is a
  feature flag (`useLiveMatch(id, { sse: false })`) to force polling.
- Ensure the production API serves SSE with `Content-Type: text/event-stream`
  and keeps the connection open (no buffering proxy that breaks streaming).

---

## 8. Environment variables

| Var | Where | Notes |
| --- | --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | `eas.json` build `env`, and runtime | Base URL of the Next.js API. Public (baked into the JS bundle). Defaults to `http://localhost:3000` in `src/api.ts` if unset. |

No secrets are required in the mobile build (the app is a public-API client).

---

## 9. Quick command reference

```bash
eas login
cd apps/mobile
eas init                                            # sets real projectId         [APPLE creds prompted later]
eas credentials                                     # certs / profiles / push key [APPLE]
eas build  --platform ios --profile production      # build .ipa
eas submit --platform ios --profile production      # upload to App Store Connect [APPLE]
```

---

## 10. Things this repo task could NOT verify

- No `pnpm install` / `expo` / `eas` / simulator was run here — TypeScript,
  config validity, and imports were verified **by inspection** only.
- `react-native-sse` and `expo-splash-screen` were added to
  `apps/mobile/package.json` but **not installed** (central integrator installs).
- `assets/icon.png` and `assets/splash.png` do **not** exist yet — they must be
  added before a build (see `apps/mobile/assets/README.md`).
- All **[APPLE]** steps are interactive and account-gated; the placeholders in
  `eas.json` must be replaced with real account values.

---

## Running EAS without a global install

`eas-cli` is pinned in `apps/mobile` devDependencies (same version locally and in
CI). If `eas` is "command not found", you do NOT need a global install — run it
through the workspace binary or the provided scripts:

```bash
cd apps/mobile
pnpm exec eas login                 # or: pnpm run eas:login
pnpm exec eas init                  # links project / writes real projectId
pnpm run eas:build:ios              # eas build --platform ios --profile production
pnpm run eas:submit:ios             # eas submit --platform ios --profile production
```

Prefer a global CLI? `npm install -g eas-cli` (then `eas login` works directly).
The login/build/submit steps are interactive (Expo + Apple ID/2FA).
