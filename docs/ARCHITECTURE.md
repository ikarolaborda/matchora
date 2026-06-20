# Architecture

MatchOra is a pnpm + Turborepo monorepo with a strict layering: pure domain logic at the bottom, a source-agnostic data layer in the middle, and the apps (web, mobile) at the top. The MVP runs entirely in-process on a mock provider; the same seams map cleanly onto a scaled, multi-service architecture.

## Layered design

```
┌──────────────────────────────────────────────────────────────┐
│  apps/web (Next.js 15 App Router)      apps/mobile (Expo RN)   │  presentation
│  route handlers · SSE · React UI       expo-router · RN UI     │
└───────────────┬───────────────────────────────┬───────────────┘
                │                                │
        ┌───────▼────────────────────────────────▼───────┐
        │  @matchora/data                                 │  data layer (seam)
        │  FootballDataProvider (interface)               │
        │  ├─ MockFootballDataProvider (default runtime)  │
        │  ├─ adapter skeletons (sportmonks/api-football/ │
        │  │     sportradar) — throw until implemented    │
        │  ├─ LiveHub + LiveTransport (in-mem | Redis)    │
        │  ├─ SimulationEngine (in-process live ticker)   │
        │  └─ Drizzle schema (future persistence path)    │
        └───────────────────────┬─────────────────────────┘
                                 │ depends only on types/logic
        ┌────────────────────────▼────────────────────────┐
        │  @matchora/shared                                │  domain (pure, tested)
        │  types · Zod schemas · events · standings ·      │
        │  simulator · bracket · spoilers · time · sse ·   │
        │  i18n                                            │
        └──────────────────────────────────────────────────┘

  @matchora/config  → env parsing, branding/labels, feature flags (used across layers)
  @matchora/ui      → design tokens (colors, spacing, typography, status intents)
```

**Dependency direction is strict and downward.** `@matchora/shared` depends on nothing internal. `@matchora/data` depends on `shared` + `config`. Apps depend on all packages. The apps and the data layer depend only on the `FootballDataProvider` interface and the `LiveHub` abstraction — never on a concrete provider or the database. That single rule keeps the mock runtime fully functional offline and lets real adapters slot in unchanged.

### Package boundaries & barrel-import rule

Every package is consumed only through its barrel export:

- `@matchora/shared` — frozen domain contract; additive changes only.
- `@matchora/config` — `getServerConfig()` (server-only, holds secrets), `getBranding()` (client-safe), provider helpers.
- `@matchora/data` — `getProvider()`, `getMockProvider()`, `getHub()`, `ensureSimulationRunning()`. The Drizzle schema is at the `@matchora/data/db` subpath and is **not** imported at runtime.
- `@matchora/ui` — design tokens and small token helpers.

Do not deep-import internal files (e.g. `@matchora/shared/src/standings`). The exact surface is documented in [packages/SHARED_API.md](../packages/SHARED_API.md).

## The event-sourced live pipeline

Live state is **event-sourced**: an append-only, normalized event log is the source of truth, and the per-fixture snapshot is a pure derivation of that log.

Core invariants (all enforced in `@matchora/shared`):

- **Idempotent** — every `MatchEvent` carries a globally unique `eventId`; re-applying an event is a no-op.
- **Ordered** — events carry a monotonic per-fixture `sequence`; the snapshot tracks `lastSequence`.
- **Derivable** — `applyEvent(snapshot, event)` and `buildSnapshot(fixtureId, events[])` rebuild state from scratch; **standings are recomputed from snapshots, never mutated incrementally**, so corrections and out-of-order updates can't cause divergence.
- **Correctable** — correction kinds (`goal_cancelled`, `score_corrected`, `card_corrected`) are first-class events that reference a prior `eventId`.

### Flow

```
 Provider                LiveHub                      SSE route               Client
 (mock / real)           (pub/sub + ring buffer)      /api/live/.../events
 ───────────             ───────────────────────      ─────────────────       ──────
 emit/ingest  ─────────▶ publish(event)
 normalized              ├─ append to bounded
 MatchEvent              │   per-fixture ring buffer
                         └─ transport.publish ──────▶ subscribe(fixtureId)
                                                      ├─ on connect: send
                                                      │    snapshot message ───▶ render state
                                                      ├─ stream event frames,
                                                      │    id: <sequence>     ───▶ applyEvent → UI
                                                      └─ heartbeat ~15s        ───▶ keep-alive

 standings  ◀── derived from fixture snapshots (computeGroupStanding), recomputed on change
```

### SSE contract (`/api/live/matches/[fixtureId]/events`)

- `Content-Type: text/event-stream`; route pins `runtime = 'nodejs'` and `dynamic = 'force-dynamic'` (Edge cannot hold the long-lived stream).
- **On connect:** send a `snapshot` message (current derived state), then stream `event` messages. Each event frame sets `id: <sequence>` so the browser tracks `Last-Event-ID`.
- **On reconnect** with `Last-Event-ID`: call `getHub().replay(fixtureId, cursor)`.
  - Array returned → replay exactly those buffered events, then resume streaming.
  - `null` returned (cursor older than the buffer's earliest event) → **stale cursor**: send a fresh snapshot, then continue. This is the bounded-ring-buffer fallback.
- A `heartbeat` message is sent ~every 15s to keep the connection alive.
- Ingestion: `POST /api/live/ingest` validates the body against `matchEventSchema` and calls `getMockProvider().ingest(event)`.

The wire format is shared via `@matchora/shared` (`serializeSse` / `parseSseData`, `parseResumeCursor`, the `LiveMessage` union, and the `ConnectionState` type), so web and mobile clients speak the identical protocol.

### LiveHub & transport abstraction

`LiveHub` is the in-process analog of a Score Service + pub/sub bus:

- `publish(event)` appends to a **bounded per-fixture ring buffer** (default 256) and forwards to the transport.
- `subscribe(fixtureId, listener)` returns an unsubscribe fn.
- `replay(fixtureId, afterSeq)` serves the resume window or returns `null` for snapshot fallback.

The `LiveTransport` interface (`publish` / `subscribe` by channel) defaults to `InMemoryTransport` (single process, no external services). A Redis/Valkey transport is a drop-in replacement for multi-process fanout — selected when `REDIS_URL` is present.

The `SimulationEngine` is an in-process ticker (started once via `ensureSimulationRunning()`, default 4s interval) that generates events for live fixtures so the app shows live motion with zero infrastructure. `pnpm dev:simulate` is the external counterpart that POSTs events to the ingest route (or `--standalone` prints them).

## Scaling seam map

The MVP deliberately **collapses** a multi-service architecture into Next.js route handlers + an in-process hub. The seams are placed so growth is additive, not a rewrite:

```
  MVP (today)                            Scaled (documented growth path)
  ───────────                            ───────────────────────────────
  provider.ingest() / dev:simulate  ──▶  Ingestion API (HTTP) per provider
        │                                       │ validate + dedup on (source, externalId)
        ▼                                       ▼
  in-process normalization          ──▶  Message bus, partitioned by match_id
        │                                  (ordering preserved per fixture)
        ▼                                ┌──────────────┴───────────────┐
  LiveHub (ring buffer + pub/sub)   ──▶  Event Service          Score Service
        │                                (persist event log)    (derive snapshots,
        ▼                                       │                 compute standings)
  SSE route handler (Node)          ──▶  Redis/Valkey Pub/Sub  ──▶  SSE/WebSocket edge
        │                                       │
        ▼                                       ▼
  mock in-memory store              ──▶  Postgres (write) + read replicas
                                          (match_events log + derived tables)
```

Mapping of today's pieces to the scaled design:

| MVP piece | Scales into |
| --- | --- |
| `provider.ingest()` / `/api/live/ingest` | Per-provider **Ingestion API** with idempotent dedup on `(source, externalId)`. |
| In-process event normalization | **Message bus partitioned by `match_id`** to preserve per-fixture ordering. |
| `LiveHub` ring buffer + `applyEvent` | **Event Service** (append-only log) + **Score Service** (snapshot/standings derivation) split. |
| `LiveTransport` (in-memory) | **Redis/Valkey Pub/Sub** for cross-process fanout. |
| Mock in-memory store | **Postgres write DB + read replicas**; the Drizzle schema already models both the `match_events` log and derived `fixtures`/`standings` tables, with idempotency indexes on `(source, external_id)` and `(fixture_id, sequence)`. |
| Next.js SSE route | Dedicated streaming tier; clients still speak the same SSE contract. |

Because clients depend only on the SSE contract and apps depend only on `FootballDataProvider` + `LiveHub`, none of the above changes the app or domain code — it swaps implementations behind stable seams.
</content>
