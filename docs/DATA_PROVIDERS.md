# Data Providers

All football data flows through one source-agnostic interface, `FootballDataProvider`. The app and the live pipeline depend only on this interface and the `LiveHub` abstraction — never on a concrete provider or the database. The default runtime is the in-memory **mock provider**; real adapters slot in behind the same surface.

## The `FootballDataProvider` interface

Defined in `packages/data/src/provider.ts`. Every method returns `@matchora/shared` domain types.

```ts
interface FootballDataProvider {
  readonly name: string;

  getCompetitions(): Promise<Competition[]>;
  getCompetition(id: Id): Promise<Competition | null>;
  getTeams(competitionId: Id): Promise<Team[]>;
  getTeam(teamId: Id): Promise<Team | null>;
  getPlayers(teamId: Id): Promise<Player[]>;
  getVenues(competitionId: Id): Promise<Venue[]>;
  getGroups(competitionId: Id): Promise<Group[]>;
  getFixtures(competitionId: Id): Promise<Fixture[]>;
  getFixture(fixtureId: Id): Promise<Fixture | null>;
  getFixtureEvents(fixtureId: Id): Promise<MatchEvent[]>;
  getLiveFixtureState(fixtureId: Id): Promise<FixtureSnapshot | null>;
  getStandings(competitionId: Id): Promise<GroupStanding[]>;
  getKnockoutBracket(competitionId: Id): Promise<KnockoutBracket | null>;

  // Subscribe to the normalized live event stream for a fixture.
  subscribeToMatchEvents(fixtureId: Id): MatchEventSubscription | null;
}
```

A `MatchEventSubscription` exposes `replay(afterSequence)`, `snapshot()`, and `subscribe(listener)` — the building blocks for SSE connect and resume.

Resolution happens through the factory in `packages/data/src/factory.ts`:

- `getProvider()` — process-wide singleton; returns the mock unless `FOOTBALL_DATA_PROVIDER !== 'mock'`.
- `getMockProvider()` — the concrete mock (exposes `.ingest(event)`, `.liveFixtureIds`, `.liveHub`) for the SSE/ingest routes.
- `getHub()` — the shared `LiveHub`.
- `ensureSimulationRunning()` — starts the in-process live ticker once.

## The mock provider

`MockFootballDataProvider` (`packages/data/src/mock/`) is the only fully wired runtime path. It serves a complete in-memory dataset (`buildMockDataset`) for competition id `wft-2026` — competitions, teams, players, venues, groups, fixtures, standings, and a knockout bracket — and drives live fixtures through the `LiveHub`. It requires **no API keys, no Postgres, and no Redis**, which is why a fresh clone runs with zero configuration.

## The disabled adapter skeletons

Three real-provider adapters exist as **skeletons only** (`packages/data/src/adapters/`):

| Provider | `FOOTBALL_DATA_PROVIDER` value | Key env var | Base URL |
| --- | --- | --- | --- |
| Sportmonks | `sportmonks` | `SPORTMONKS_API_KEY` | `https://api.sportmonks.com/v3/football` |
| API-Football (API-SPORTS) | `api-football` | `API_FOOTBALL_KEY` | API-SPORTS endpoint |
| Sportradar | `sportradar` | `SPORTRADAR_API_KEY` | Sportradar endpoint |

They share `BaseHttpAdapter` and a `ProviderNotConfiguredError`. **None are implemented in the MVP** — selecting one without an implementation throws:

```
<provider> adapter is not configured (missing API key) or not implemented in this MVP.
```

The factory deliberately surfaces this error rather than silently degrading data quality: if you ask for a real provider, you get a clear failure, not stale or partial data. The local default always stays on `mock`.

## How to enable a real provider

1. Set the provider and its key in `.env`:
   ```bash
   FOOTBALL_DATA_PROVIDER=sportmonks
   SPORTMONKS_API_KEY=your_key_here
   ```
2. Implement the adapter (see the mapping plan below). Until the methods are implemented, the adapter throws `ProviderNotConfiguredError`.
3. Restart the app. The factory resolves your provider via `getProvider()`; the rest of the app is unchanged because it depends only on the interface.

## Environment variables

| Variable | Required when | Purpose |
| --- | --- | --- |
| `FOOTBALL_DATA_PROVIDER` | always (defaults `mock`) | Selects the data source. |
| `SPORTMONKS_API_KEY` | provider = `sportmonks` | Sportmonks auth. |
| `API_FOOTBALL_KEY` | provider = `api-football` | API-Football / API-SPORTS auth. |
| `SPORTRADAR_API_KEY` | provider = `sportradar` | Sportradar auth. |
| `DATABASE_URL` | optional | Future persistence path; not used by mock runtime. |
| `REDIS_URL` | optional | Multi-process live fanout; falls back to in-memory hub. |

## Normalization mapping plan (template for a new provider)

A real adapter's job is to translate provider payloads into `@matchora/shared` types and to normalize raw event feeds into the `MatchEvent` envelope. Fill in this template per provider:

### Entity mapping

| `@matchora/shared` type | Provider source endpoint | Field mapping notes |
| --- | --- | --- |
| `Competition` (`{id, name, season, rules}`) | e.g. `/leagues` | Map to neutral, configurable label; encode `TournamentRules` (points, ordered `tiebreakers`, `advancePerGroup`, `knockoutExtraTime`) explicitly. |
| `Team` (`{id, name, code, countryCode, colorPrimary, colorSecondary}`) | `/teams` | Use neutral names/codes; `countryCode` only to derive an emoji-flag fallback. No federation logos (see legal doc). |
| `Player` | `/players` or squad | `shirtNumber`/`position` nullable. |
| `Venue` | `/venues` | `countryCode` neutral data only. |
| `Group` / `GroupStanding` | `/standings` | Prefer recomputing standings locally via `computeGroupStanding` for consistency. |
| `Fixture` (+ derived `FixtureSnapshot`) | `/fixtures` | Map status to `FixtureStatus`; rebuild `snapshot` from events, don't trust a separate score field blindly. |
| `KnockoutBracket` | `/rounds` / `/draws` | Map slot sources to `SlotSource` variants. |

### Event normalization

| Target `MatchEventKind` | Provider raw event(s) | Notes |
| --- | --- | --- |
| `match_started`, `period_started/ended`, `halftime`, `fulltime`, `match_ended` | lifecycle/period events | Drive `FixtureStatus` transitions. |
| `goal`, `own_goal`, `penalty_goal`, `penalty_missed` | scoring events | Set `side`/`teamId`/`playerId`; alertable goals via `isAlertableGoal`. |
| `yellow_card`, `red_card`, `second_yellow` | cards | Feed disciplinary/fair-play counts. |
| `substitution` | subs | Use `payload.playerOutId` / `payload.playerInId`. |
| `var_review_started`, `var_decision` | VAR | `payload.note` for the outcome. |
| `goal_cancelled`, `card_corrected`, `score_corrected` | corrections | Set `correctionOf` to the prior `eventId`; `payload.score` for authoritative replacement. |

### Required envelope guarantees

- **`eventId`** — globally unique, stable per provider event → idempotency key.
- **`sequence`** — monotonic per fixture; assign on ingest if the provider doesn't supply one (used as the SSE resume cursor).
- **`source`** — the provider name (`'sportmonks'`, etc.).
- **`externalId`** — the provider's own event id; the `(source, externalId)` pair is the dedup key (mirrored by the unique index in the Drizzle schema).
- **`emittedAt`** — ISO-8601 UTC.

Validate every normalized event against `matchEventSchema` before publishing it to the `LiveHub`, exactly as the ingest route does for the mock provider.
</content>

---

## Implemented real provider: API-Football v3 (api-sports.io)

Chosen as the default real datasource (free tier, World Cup coverage, live
events + standings + fixtures, single-header auth). Mock remains the default
runtime; API-Football is **opt-in** and **fails closed back to mock** if the key
is absent.

**Enable:**
```bash
FOOTBALL_DATA_PROVIDER=api-football
API_FOOTBALL_KEY=...            # free at https://dashboard.api-football.com
API_FOOTBALL_LEAGUE_ID=1        # World Cup = 1
API_FOOTBALL_SEASON=2026
```

**Endpoints consumed** (base `https://v3.football.api-sports.io`, header `x-apisports-key`):
- `GET /fixtures?league=&season=` → fixtures + derived snapshot
- `GET /fixtures?id=` → single fixture
- `GET /fixtures/events?fixture=` → normalized `MatchEvent[]`
- `GET /standings?league=&season=` → grouped `GroupStanding[]`

**Normalization** (`packages/data/src/adapters/apiFootballMap.ts`, pure + unit-tested):
- Status table maps `status.short` (`NS/1H/HT/2H/ET/BT/P/SUSP/INT/PST/CANC/ABD/AWD/WO/FT/AET/PEN`) → normalized `FixtureStatus` with an unknown fallback.
- Event table maps `(type, detail)` → `MatchEventKind` (Goal/Own Goal/Penalty/Card → yellow/red/second_yellow/subst/Var), raw detail preserved in `payload.note`.
- **Idempotency:** API-Football has no stable per-event id, so we derive `api-football:{fixtureId}:{hash(elapsed|extra|team|player|type|detail)}` and assign a monotonic per-fixture `sequence` after sorting by match clock. Repeated polls emit zero duplicates (verified by test).
- Live updates are diffed per poll (`pollLiveOnce`) and published to the shared `LiveHub`, so the SSE pipeline is identical to mock mode.

**Free-tier note:** ~100 req/day; the live poller runs at a 30s cadence and only
polls fixtures currently live. Knockout-bracket resolution from the live feed is
out of scope for the MVP adapter (the mock provider demonstrates the full bracket).
