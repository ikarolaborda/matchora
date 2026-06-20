# Docker & infrastructure

MatchOra ships a full containerized stack: the **web** app (Next.js standalone) +
**Postgres 17** + **Apache Kafka** (KRaft) + **Valkey**. Everything is additive —
the app still runs with zero infra (mock provider) outside Docker.

## Quickstart
```bash
cp .env.example .env        # set values; mock provider works with none
docker compose up -d --build
# web      → http://localhost:3000
# postgres → localhost:5433  (in-network: postgres:5432)
# kafka    → localhost:29092 (in-network: kafka:9092)
# valkey   → localhost:6380  (in-network: valkey:6379)
docker compose ps           # all services should report (healthy)
docker compose logs -f web
docker compose down         # stop;  add -v to wipe volumes
```
Root scripts: `pnpm docker:build | docker:up | docker:down | docker:logs`.

## Services (pinned versions)
| Service  | Image                   | Host port | In-network | Notes |
|----------|-------------------------|-----------|------------|-------|
| web      | built from `Dockerfile` | 3000      | web:3000   | Next.js standalone, non-root, healthchecked on `/api/health` |
| postgres | `postgres:17.2-alpine`  | 5433      | postgres:5432 | `pg_isready` healthcheck, named volume |
| kafka    | `apache/kafka:3.9.0`    | 29092     | kafka:9092 | KRaft single-node (no Zookeeper) |
| valkey   | `valkey/valkey:8.1-alpine` | 6380   | valkey:6379 | open-source Redis fork |

Host ports 5433/6380 avoid colliding with a Postgres/Redis you may already run.

## The web image (multi-stage, standalone)
`Dockerfile` (build context = repo root) has two stages:
1. **builder** — `corepack` pnpm, `pnpm install --frozen-lockfile` (BuildKit cache
   mount keeps the store warm), `pnpm --filter @matchora/web build`. `next.config`
   sets `output: 'standalone'` + `outputFileTracingRoot` = repo root so workspace
   packages are traced.
2. **runner** — `node:22-alpine`, non-root `nextjs` user, copies
   `apps/web/.next/standalone` (monorepo layout → entrypoint `apps/web/server.js`)
   + `.next/static` + `public`. A `HEALTHCHECK` polls `/api/health`. Secrets are
   passed at runtime via `env_file`/`environment`, never baked into the image.

## Kafka (KRaft)
Single combined broker+controller node. Dual listeners: `PLAINTEXT://kafka:9092`
for in-network clients and `PLAINTEXT_HOST://localhost:29092` for host/debug.
> Gotcha: `KAFKA_LISTENERS` uses the host-less `://:port` form. A literal
> `0.0.0.0` there makes the apache/kafka image advertise `0.0.0.0`, which the
> broker rejects.

The web app's `LiveHub` is backed by `KafkaLiveTransport` when `KAFKA_BROKERS`
is set: match events are produced to the `match-events` topic keyed by
`fixtureId` (per-fixture ordering) and consumed back to drive SSE. The transport
ensures the topic exists on startup and **fails open** — if Kafka is
unreachable, the app logs a warning and keeps running on the in-memory hub.
Each web process uses a unique consumer group so every instance broadcasts
(does not load-balance) to its own SSE clients.

## Postgres (persistence path)
`DATABASE_URL` enables the Drizzle (node-postgres) client (`getDb()`), lazily —
nothing connects at import time, and the app runs fine with it unset.
```bash
pnpm db:generate   # generate SQL migrations from packages/data/src/db/schema.ts
pnpm db:migrate    # apply (needs DATABASE_URL)
pnpm db:seed       # load the mock dataset
```

## Modes verified
- zero-infra (no Docker, mock) · web+postgres · web+kafka · full stack.
- Kafka-down / Postgres-down startup → web stays healthy (fail-open).
