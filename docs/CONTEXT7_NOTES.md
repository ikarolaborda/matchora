# Context7 Notes

During development, current library documentation was consulted via **Context7** (the MCP docs server) to confirm up-to-date APIs rather than relying on training-data recall. This file records which libraries were checked and the load-bearing facts confirmed, so future contributors know what was verified and why the code looks the way it does.

## Next.js (App Router) — web app

- **SSE via `ReadableStream`.** A route handler returns a `Response` whose body is a `ReadableStream`, with `Content-Type: text/event-stream`. This is how `/api/live/matches/[fixtureId]/events` streams snapshot + event + heartbeat frames.
- **Dynamic route params are now a `Promise`.** In current App Router, route handler/page `params` are async and must be `await`ed (e.g. `const { fixtureId } = await params`). Older sync-access patterns are out of date.
- **Route segment config.** The live route pins `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'`. SSE needs a long-lived Node connection; the Edge runtime cannot hold it. Confirmed the segment-config keys and accepted values.

## Drizzle ORM — schema & migrations

- **Postgres schema builders.** `pgTable`, `pgEnum`, column builders (`text`, `integer`, `boolean`, `jsonb`, `timestamp`, `primaryKey`, `uniqueIndex`), and `relations()` from `drizzle-orm` — confirmed the current import paths (`drizzle-orm/pg-core`, `drizzle-orm`) and API shape used in `packages/data/src/db/schema.ts`.
- **Migration generation.** `drizzle-kit generate` with `--dialect postgresql` is the current invocation (replacing older `--dialect`-less / config-only forms). Backing `pnpm db:generate` / `db:migrate`.
- **Why Drizzle.** Lighter than the alternatives, no codegen daemon, excellent TypeScript inference, and edge-friendly — the rationale recorded for choosing it over a heavier ORM.

## Expo — mobile app

- **`expo-router` Tabs layout.** Confirmed the current file-based routing and `Tabs` layout API for the iOS-first tab navigation.
- **`expo-notifications` push registration.** `getExpoPushTokenAsync({ projectId })` is the current way to obtain a push token, with permission requests via the notifications API. The `projectId` argument is required in current Expo. (Native APNs/Live Activities limits noted below.)

## TanStack Query v5 — data fetching

- **v5 API surface.** `queryOptions(...)` for typed, reusable query definitions; `useQuery(...)`; `QueryClientProvider` at the app root; `queryClient.invalidateQueries(...)` for cache invalidation. Confirmed the v5 object-argument signatures (no positional overloads).

## Apple ActivityKit / Live Activities & APNs — scaffold limitation

Confirmed that **Live Activities (ActivityKit) and APNs require native code and an Apple Developer account** — they cannot be exercised purely from the JS/Expo-managed layer without a native build and signing. In this repo they are documented as a **scaffold limitation**: the data model and tokens exist (e.g. `liveActivitySubscriptions`, `deviceTokens` in the Drizzle schema; `APNS_*` env vars), but end-to-end Live Activity push is not wired in the MVP. See the push-notifications and iOS Live Activities docs for details.

---

**Note:** Context7 reflects upstream docs at the time of consultation. When upgrading any library above, re-verify these facts against the version you pin.
</content>
