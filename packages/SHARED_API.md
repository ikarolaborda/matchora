# MatchOra shared API surface (import ONLY from package barrels)

The running app uses the **mock provider** — no Postgres, no Redis, no API keys required.
All instants are ISO-8601 UTC. Brand/labels come from `@matchora/config` (configurable, no FIFA marks).

## `@matchora/shared`
Types: `Iso8601, Id, StageKind, KNOCKOUT_STAGES, FixtureStatus, LIVE_STATUSES, MatchEventKind, TeamSide, Venue, Team, Player, Group, Competition, TournamentRules, Tiebreaker, ScorePair, FixtureSnapshot, Fixture, MatchEvent, MatchEventPayload, QualificationState, StandingRow, GroupStanding, KnockoutRound, BracketSlot, SlotSource, KnockoutBracket, AlertType, QuietHours, NotificationPreference, UserPreferences, Locale, LOCALES, DEFAULT_LOCALE`

Functions:
- events: `emptySnapshot(fixtureId)`, `applyEvent(snapshot, event)`, `buildSnapshot(fixtureId, events[])`, `isAlertableGoal(kind)`, `generateEventId()`
- standings: `computeGroupStanding(groupId, competitionId, teamIds[], fixtures[], rules)`, `sortTallies(...)`
- simulator: `applyOverrides(fixtures, overrides[])`, `simulateGroupStanding(groupId, competitionId, teamIds[], fixtures[], rules, overrides[])`, `qualifiedTeamIds(standing, advancePerGroup)`, type `ScoreOverride {fixtureId, score:{home,away}}`
- bracket: `knockoutWinner(home, away, score, penalties)`, `resolveBracket(bracket, standings[], fixtures[], advancePerGroup)`, `slotSides(slot)`
- spoilers: `maskFixture(fixture, mask):MaskedFixtureView`, `maskEvents(events[], mask)`, `MASKED_SCORE`
- time: `toUtcIso, isSameUtcDay, isOnLocalDay(instant, dayUtc, tz), formatKickoff(instant, locale, tz), formatTime, localHourMinute, isWithinQuietHours(nowHm, start, end)`
- sse: `serializeSse(LiveMessage):string`, `parseSseData(data):LiveMessage`, `parseResumeCursor(lastEventId):number|null`, types `LiveMessage` (`{type:'snapshot',fixtureId,sequence,snapshot}` | `{type:'event',event}` | `{type:'heartbeat',at}`), `ConnectionState` ('connecting'|'live'|'reconnecting'|'stale')
- i18n: `translate(locale, key, vars?)`, `makeTranslator(locale)`, `resolveLocale(str)`, `isLocale(str)`, type `MessageKey`, `messagesEn`
- schemas (zod): `fixturesQuerySchema, standingsQuerySchema, simulateRequestSchema, apiErrorSchema, apiError(code,message,details?), healthSchema, matchEventSchema, fixtureSchema, groupStandingSchema, ...` + inferred types `FixturesQuery, StandingsQuery, SimulateRequest, ApiError, Health`

## `@matchora/config`
`getServerConfig(): ServerConfig` (server-only, includes secrets — never send to client),
`getBranding(): Branding {appName, tournamentLabel, disclaimer, apiBaseUrl}` (client-safe),
`providerConfigured(env)`, `PROVIDERS`, types `ProviderName, Env, ServerConfig, Branding, FeatureFlags`, `APP_VERSION`.

## `@matchora/data`
- `getProvider(): FootballDataProvider` (singleton; mock by default)
- `getMockProvider(): MockFootballDataProvider` (has `.ingest(event)`, `.liveFixtureIds`, `.liveHub`)
- `getHub(): LiveHub` — `.publish(event)`, `.subscribe(fixtureId, listener)=>unsub`, `.replay(fixtureId, afterSeq):MatchEvent[]|null` (null = stale cursor → snapshot fallback)
- `ensureSimulationRunning()` — starts the in-process live ticker once
- `MockFootballDataProvider, FootballDataProvider, MatchEventSubscription, LiveHub, SimulationEngine, buildMockDataset`
- `FootballDataProvider` methods: `getCompetitions, getCompetition(id), getTeams(compId), getTeam(id), getPlayers(teamId), getVenues(compId), getGroups(compId), getFixtures(compId), getFixture(id), getFixtureEvents(id), getLiveFixtureState(id), getStandings(compId), getKnockoutBracket(compId), subscribeToMatchEvents(id)`
- Competition id is `'wft-2026'`. DB schema is at subpath `@matchora/data/db` (NOT needed at runtime).

## `@matchora/ui`
`colors, space, radius, fontSize, typography, statusIntent, qualificationColor, emojiFlag(countryCode)`

## SSE contract (route `/api/live/matches/[fixtureId]/events`)
- `Content-Type: text/event-stream`, `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`.
- On connect: send a `snapshot` message (current state) then stream `event` messages. Each event frame sets `id: <sequence>` for `Last-Event-ID` resume.
- On reconnect with `Last-Event-ID`: `getHub().replay(fixtureId, cursor)` → if array, replay those; if `null` (stale), send fresh snapshot then continue.
- Send a `heartbeat` every ~15s. Ingest route `/api/live/ingest` (POST) validates `matchEventSchema` and calls `getMockProvider().ingest(event)`.
