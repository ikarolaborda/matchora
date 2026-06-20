# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-20
### Added
- Initial public release of MatchOra — independent live football scores (web + iOS).
- pnpm + Turborepo monorepo: `packages/shared`, `config`, `data`, `ui`; `apps/web`, `apps/mobile`.
- Tournament engine: group standings, configurable tiebreakers, idempotent event
  application, penalties/extra time, qualification certainty, what-if simulator,
  knockout bracket resolution, no-spoilers masking (unit-tested, 36 tests).
- Realtime: Server-Sent Events live pipeline with `Last-Event-ID` resume and an
  in-memory LiveHub (Redis-abstraction ready); local live simulation (`dev:simulate`).
- Next.js 15 web app (all screens + API routes) and Expo iOS app (shared types).
- Data provider abstraction with a default in-memory mock provider (no credentials
  required) and a real **API-Football v3** adapter (opt-in via `FOOTBALL_DATA_PROVIDER`).
- Push-notification architecture and an Apple Live Activities native scaffold.
- i18n (pt-BR, pt-PT, en, es) and a dark-first design system.

[0.1.0]: https://github.com/ikarolaborda/matchora/releases/tag/v0.1.0
