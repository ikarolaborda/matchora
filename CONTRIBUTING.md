# Contributing to MatchOra

Thanks for your interest! MatchOra is an independent, open-source live football
scores app (web + iOS). Contributions of all kinds are welcome.

## Prerequisites
- Node.js >= 20
- pnpm 9 (`corepack enable pnpm`)

## Setup
```bash
git clone https://github.com/ikarolaborda/matchora.git
cd matchora
pnpm install
cp .env.example .env      # optional — defaults to the mock provider, no keys needed
pnpm dev:web              # http://localhost:3000
```
The app runs fully on the **mock provider** with no database and no API keys.

## Quality gates (run before opening a PR)
```bash
pnpm typecheck            # all packages must pass (strict TS)
pnpm test                 # vitest unit tests
pnpm lint
pnpm build                # web production build
```

## Project layout
- `packages/shared` — types, Zod schemas, tournament logic (the frozen contract)
- `packages/config` — env parsing, branding, feature flags
- `packages/data` — provider abstraction, mock provider, LiveHub, simulation, adapters, DB schema
- `packages/ui` — design tokens
- `apps/web` — Next.js App Router
- `apps/mobile` — Expo React Native

## Adding a data provider
Implement the `FootballDataProvider` interface in `packages/data/src/adapters/`,
mapping the provider's payloads to the `@matchora/shared` normalized model
(`Fixture`, `FixtureSnapshot`, `MatchEvent`, `GroupStanding`). Gate it behind
`FOOTBALL_DATA_PROVIDER` + its API key env var. See `docs/DATA_PROVIDERS.md`.
The `ApiFootballAdapter` is a complete reference implementation.

## Conventions
- Conventional, focused commits (e.g. `feat(data): add api-football adapter`).
- Branch names: `<topic>/<short-description>`.
- Add or update tests when behavior changes.
- Keep imports to package barrels (`@matchora/shared`), never deep paths.
- No protected tournament branding (see `docs/LEGAL_BRANDING.md`).

## Code of Conduct
By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).
