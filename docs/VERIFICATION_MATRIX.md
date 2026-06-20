# Verification matrix — what is proven vs scaffolded

Honest status of each subsystem so nothing downstream is overclaimed. Verified
on 2026-06-19 against the mock-only runtime (no DB, Redis, or API keys).

| Subsystem | Status | Evidence / tier |
|---|---|---|
| `packages/shared` tournament logic (standings, tiebreakers, idempotent event application, simulator, bracket, no-spoilers, SSE codec) | **Runtime-verified + unit-tested** | Tier-1: `tsc` clean + 28 vitest tests |
| `packages/config` env/branding/flags | **Build-verified** | Tier-1: `tsc` clean |
| `packages/data` mock provider, LiveHub ring buffer, simulation engine | **Runtime-verified + unit-tested** | Tier-1: `tsc` clean + 5 vitest tests |
| `packages/ui` tokens | **Build-verified** | Tier-1: `tsc` clean |
| `apps/web` pages + API routes | **Build-verified** | Tier-1: `tsc` clean, `next build` ok (20 routes), `next lint` clean, 3 vitest tests |
| SSE live pipeline (`/api/live/matches/[id]/events`) | **Runtime-verified (transport)** | Tier-2: running server streamed a `snapshot` then a live `match_event` with `id:` resume cursors from the auto-simulation ticker; `/api/health` reports `provider mock ok, live ok`; `/api/fixtures` = 48 (4 live) |
| Live UI re-render on event receipt (`useLiveFixture` → DOM) | **Code-reviewed, NOT browser-executed** | Playwright E2E authored but not run; SSE transport + standings logic verified separately. Residual. |
| `apps/mobile` (Expo) screens + API consumption | **Build-verified (tsc clean)** | Tier-1: `tsc` clean. NOT run on an iOS simulator/device. Live updates use polling (RN has no native EventSource). |
| Push notifications (Expo/APNs/FCM) | **Scaffold** | Registration flow + model present; not wired to a real APNs/FCM project. See `PUSH_NOTIFICATIONS.md`. |
| iOS Live Activities / Dynamic Island | **Scaffold** | Swift ActivityKit/WidgetKit files + JS bridge stub; requires Apple account + Xcode + EAS dev build. See `IOS_LIVE_ACTIVITIES.md`. |
| Postgres persistence (Drizzle) | **Scaffold** | Full schema + `db:generate/migrate/seed` wiring; the MVP runtime does NOT use it (mock provider in-memory). |
| Sportmonks / API-Football / Sportradar adapters | **Scaffold (disabled)** | Throw `ProviderNotConfiguredError` unless implemented + keyed. See `DATA_PROVIDERS.md`. |

## Default supported runtime path
Mock provider, in-memory LiveHub, Next.js Node runtime. `pnpm install && pnpm dev:web`,
open http://localhost:3000. Optionally `pnpm dev:simulate` to drive extra live events.

## Recommended next checks before any production claim
1. Run the Playwright E2E (`pnpm test:e2e`) in a browser to confirm the live goal updates the DOM and the group table re-renders.
2. One iOS-simulator smoke run of `apps/mobile` (EAS/dev build).
3. Validate SSE behind the intended deployment proxy (buffering/idle-timeout/reconnect).
4. Exercise malformed/out-of-order/postponed real-feed payloads against the ingestion path.
