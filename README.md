# MatchOra

[![CI](https://github.com/ikarolaborda/matchora/actions/workflows/ci.yml/badge.svg)](https://github.com/ikarolaborda/matchora/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-22e3a3.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](https://www.typescriptlang.org/)

**Placar ao vivo, grupos e alertas de futebol.**

MatchOra is an independent live football scores app for the web and iOS: live scores, group standings with qualification certainty, knockout brackets, and goal/match alerts. It is built as a pnpm + Turborepo monorepo (Next.js 15 web app, Expo React Native iOS-first app, shared TypeScript packages).

> **Disclaimer:** Independent live score application. Not affiliated with, endorsed by, or sponsored by FIFA or any tournament organizer. MatchOra uses no FIFA names, marks, emblems, mascots, or trophies, and makes no claim to be official. See [docs/LEGAL_BRANDING.md](docs/LEGAL_BRANDING.md).

## Highlights

- **Runs fully offline, no setup.** The app ships with an in-memory **mock data provider** — no external football API keys, no Postgres, no Redis required to run locally.
- **Event-sourced live pipeline.** An append-only normalized event log drives derived snapshots, streamed to clients over Server-Sent Events (SSE) with resume support.
- **Tested tournament logic.** Group standings, configurable tiebreakers, qualification certainty, hypothetical simulation, and bracket resolution all live in `@matchora/shared` and are unit-tested with Vitest.
- **i18n built in.** pt-BR (default), pt-PT, en, es.
- **Real data, optional.** A first-class **API-Football** adapter pulls live fixtures, events, and standings — opt in with one env var + a free key. Mock stays the default so the repo always runs with zero credentials.

## Real data mode (optional — API-Football)

The default runtime uses the mock provider and needs **no credentials**. To use
real live data from [API-Football](https://www.api-football.com/) (api-sports.io):

1. Get a free API key at <https://dashboard.api-football.com> (free tier ~100 requests/day).
2. In your local, untracked `.env`:
   ```bash
   FOOTBALL_DATA_PROVIDER=api-football
   API_FOOTBALL_KEY=your_key_here
   API_FOOTBALL_LEAGUE_ID=1      # World Cup = 1
   API_FOOTBALL_SEASON=2026
   ```
3. `pnpm dev:web` — the app now serves real fixtures/standings and polls live
   matches into the same SSE pipeline.

`.env` is gitignored and **never committed**. If the key is missing the app
**fails closed back to mock**, so contributor workflows and CI never need a key.
See [docs/DATA_PROVIDERS.md](docs/DATA_PROVIDERS.md) for the adapter design and
how to add other providers.

## Quickstart

```bash
pnpm install        # install workspace deps (Node >= 20)
pnpm dev            # run web + mobile in parallel (Turborepo)
# open http://localhost:3000
```

Web only:

```bash
pnpm dev:web        # → http://localhost:3000
```

Mobile (Expo, iOS-first):

```bash
pnpm dev:mobile     # starts the Expo dev server; open in Expo Go / iOS simulator
```

No `.env` is needed to start — everything defaults to the mock provider. See [Environment](#environment).

## Monorepo layout

```
matchora/
├── apps/
│   ├── web/        # Next.js 15 (App Router) — SSE route handlers, web UI
│   └── mobile/     # Expo React Native (iOS-first)
├── packages/
│   ├── shared/     # domain types + Zod schemas + tournament logic (events, standings,
│   │               #   simulator, bracket, spoilers, time, sse, i18n) — pure, tested
│   ├── config/     # env parsing, branding/labels, feature flags (server + client split)
│   ├── data/       # provider abstraction, MockFootballDataProvider, LiveHub,
│   │               #   SimulationEngine, adapter skeletons, Drizzle schema (future DB)
│   └── ui/         # design tokens (colors, spacing, typography, status intents)
├── docs/           # architecture, data providers, legal/branding, etc.
└── scripts/
```

**Import rule:** packages are consumed only through their barrel (`@matchora/shared`, `@matchora/config`, `@matchora/data`, `@matchora/ui`). Do not deep-import internal files. See [packages/SHARED_API.md](packages/SHARED_API.md) for the exact exported surface.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm install` | Install all workspace dependencies. |
| `pnpm dev` | Run web + mobile dev servers in parallel via Turborepo. |
| `pnpm dev:web` | Run only the Next.js web app (`http://localhost:3000`). |
| `pnpm dev:mobile` | Start the Expo dev server for the mobile app. |
| `pnpm dev:simulate` | Drive live match events into the running app (see [Simulating live events](#simulating-live-events)). |
| `pnpm test` | Run all unit tests (Vitest) across `shared` and `data`. |
| `pnpm test:e2e` | Run the web Playwright end-to-end tests. |
| `pnpm lint` | Lint all packages (ESLint). |
| `pnpm typecheck` | Type-check all packages (`tsc --noEmit`). |
| `pnpm build` | Build all packages and apps via Turborepo. |
| `pnpm db:generate` | Generate Drizzle SQL migrations from the schema (requires Postgres tooling; future path). |
| `pnpm db:migrate` | Apply Drizzle migrations to `DATABASE_URL`. |
| `pnpm db:seed` | Seed the database (future persistence path; not needed for local mock runs). |
| `pnpm format` | Prettier-format the repo. |

The `db:*` commands target the documented **future** persistence path — the running MVP does not use a database.

## Environment

Copy [.env.example](.env.example) to `.env` and adjust. **Every variable is optional for local development** — with no `.env`, the app runs entirely on the mock provider.

Key variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `FOOTBALL_DATA_PROVIDER` | `mock` | Data source: `mock` \| `sportmonks` \| `api-football` \| `sportradar`. Real adapters are unimplemented skeletons in the MVP. |
| `SPORTMONKS_API_KEY` / `API_FOOTBALL_KEY` / `SPORTRADAR_API_KEY` | empty | Only needed when switching off the mock provider. |
| `DATABASE_URL` | empty | Optional. Only for `db:generate/migrate/seed` and the future persistence path. |
| `REDIS_URL` | empty | Optional. Live-event fanout/cache for multi-process deployments. Falls back to the in-memory hub. |
| `NEXT_PUBLIC_APP_NAME` | `MatchOra` | App brand name. |
| `NEXT_PUBLIC_TOURNAMENT_LABEL` | `World Football Tournament 2026` | Neutral, configurable tournament label (no protected marks). |
| `NEXT_PUBLIC_DISCLAIMER` | (see file) | Independence disclaimer shown in the UI. |
| `NEXT_PUBLIC_API_BASE_URL` / `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:3000` | Where the mobile app reaches the web API. |

Push-notification variables (`APNS_*`, `FCM_*`) are scaffolding only — see the push-notifications doc.

## Simulating live events

Live fixtures tick automatically: the web server starts an in-process `SimulationEngine` that emits events on a timer. To drive richer live activity manually:

```bash
pnpm dev:simulate              # POSTs normalized events to /api/live/ingest on the running web app
pnpm dev:simulate --standalone # prints generated events to stdout instead of POSTing
```

Each generated `MatchEvent` is validated against `matchEventSchema`, ingested via the mock provider, published through the `LiveHub`, and streamed to subscribed clients over SSE at `/api/live/matches/[fixtureId]/events`.

## Tests

```bash
pnpm test        # Vitest unit tests (shared + data) — 33 tests currently green
pnpm test:e2e    # Playwright E2E against the web app
```

Tournament logic (standings, tiebreakers, event application, qualification certainty, simulation, bracket resolution, no-spoilers masking) is unit-tested in `@matchora/shared`.

## Build

```bash
pnpm build       # Turborepo builds every package and app
```

## Deployment notes

- **Web** deploys to Vercel or any Node host.
- **SSE requires a Node runtime and long-lived connections** — it does **not** work on the Edge runtime. The live route handler pins `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'`. Keep it that way and ensure your platform allows long-lived streaming responses.
- The in-memory `LiveHub` is single-process. For multi-instance deployments, provide `REDIS_URL` and a Redis/Valkey `LiveTransport` so events fan out across processes (see architecture doc).

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — layered design, event-sourced live pipeline, scaling seam map.
- [docs/DATA_PROVIDERS.md](docs/DATA_PROVIDERS.md) — the provider interface, mock provider, adapter skeletons, and how to add a real source.
- [docs/LEGAL_BRANDING.md](docs/LEGAL_BRANDING.md) — branding constraints, disclaimer, neutral-language and flag guidance, compliance checklist.
- [docs/CONTEXT7_NOTES.md](docs/CONTEXT7_NOTES.md) — libraries whose current docs were verified via Context7 and the facts confirmed.
- [packages/SHARED_API.md](packages/SHARED_API.md) — exact exported API surface of each package.
</content>
</invoke>
