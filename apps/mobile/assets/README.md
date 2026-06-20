# MatchOra mobile assets

These binary image assets are **required before an iOS production build**. They
are intentionally **not** committed (they are design artifacts the team drops
in). `app.json` references them by the exact paths below — a build will fail if
they are missing.

Drop the following PNG files into this directory (`apps/mobile/assets/`):

| File         | Path (in app.json)   | Exact size      | Notes                                                                 |
| ------------ | -------------------- | --------------- | --------------------------------------------------------------------- |
| `icon.png`   | `./assets/icon.png`  | **1024 × 1024** | App icon. Square, **no transparency / no alpha** (App Store requirement). Opaque background. |
| `splash.png` | `./assets/splash.png`| **~1284 × 2778**(or any large transparent-safe logo) | Splash logo. Rendered by `expo-splash-screen` `contain` at `imageWidth: 220` on a `#0a0e14` background. A centered transparent-background logo PNG (e.g. 512×512+) works well. |

## Design tokens to match

- Brand color: `#22e3a3` (used for the notification accent + splash plugin).
- Splash / background: `#0a0e14` (matches `userInterfaceStyle: "dark"`).

## After adding the files

No code change is needed — `app.json` already points at them via
`expo.icon` and the `expo-splash-screen` plugin. Verify locally with
`npx expo prebuild --platform ios` (the integrator runs this; it is **not** run
from this repo task).

## Adaptive / Android (optional, future)

If/when Android ships, add `adaptive-icon.png` (1024×1024, foreground with
safe-zone padding) and wire `android.adaptiveIcon` in `app.json`.
