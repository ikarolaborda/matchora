/**
 * Provider factory + process-wide singletons.
 *
 * The web server imports getProvider()/getHub()/ensureSimulationRunning() to
 * share ONE provider, LiveHub, and live driver across all route handlers.
 *
 * Provider selection is fail-closed: @matchora/config already downgrades to
 * 'mock' when a non-mock provider is selected without its API key, so a local
 * run never fails for lack of credentials. When API-Football IS configured we
 * use the real adapter; the mock provider remains available for the
 * dev:simulate ingest path regardless of mode.
 */

import { getServerConfig, type ProviderName } from '@matchora/config';
import type { FootballDataProvider } from './provider.js';
import { LiveHub } from './live/hub.js';
import { KafkaLiveTransport } from './live/kafkaTransport.js';
import { SimulationEngine } from './live/simulation.js';
import { MockFootballDataProvider } from './mock/provider.js';
import { ApiFootballAdapter } from './adapters/apiFootball.js';

let _hub: LiveHub | null = null;
let _provider: FootballDataProvider | null = null;
let _mock: MockFootballDataProvider | null = null;
let _sim: SimulationEngine | null = null;
let _livePoller: ReturnType<typeof setInterval> | null = null;
let _warnedMockDefault = false;

/**
 * Server-only, once-per-process warning when the data layer resolves to the
 * mock provider WITHOUT being explicitly asked for it. A silent default should
 * never look like a data bug, so we distinguish the two surprising cases:
 *   - FOOTBALL_DATA_PROVIDER unset/empty -> nobody chose a provider.
 *   - FOOTBALL_DATA_PROVIDER set to a real provider but downgraded (no key).
 * We stay quiet when it is explicitly 'mock' (that's an intentional choice).
 */
function warnMockDefaultOnce(): void {
  if (_warnedMockDefault) {
    return;
  }
  const raw = process.env.FOOTBALL_DATA_PROVIDER;
  if (raw && raw.trim().toLowerCase() === 'mock') {
    return;
  }
  _warnedMockDefault = true;
  if (!raw || raw.trim() === '') {
    console.warn(
      '[matchora] FOOTBALL_DATA_PROVIDER not set — using MOCK data. Set it (and API_FOOTBALL_KEY) for real data.',
    );
  } else {
    console.warn(
      `[matchora] FOOTBALL_DATA_PROVIDER=${raw} but its API key is missing — falling back to MOCK data.`,
    );
  }
}

/**
 * Shared LiveHub. Default = in-memory transport (zero infra, always works).
 * When KAFKA_BROKERS is configured (opt-in, multi-process deployments) the hub
 * is backed by Kafka; the transport connects in the background and fails open
 * (a Kafka outage degrades cross-process live fanout, never app startup).
 */
export function getHub(): LiveHub {
  if (_hub) {
    return _hub;
  }
  const { kafka } = getServerConfig();
  if (kafka.brokers.length > 0) {
    const transport = new KafkaLiveTransport({
      brokers: kafka.brokers,
      clientId: kafka.clientId,
      topic: kafka.topic,
      groupSuffix: `${process.pid}`,
    });
    void transport.start().catch((err) => {
      console.warn('[matchora] Kafka transport failed to start; live fanout degraded:', err);
    });
    _hub = new LiveHub(transport);
  } else {
    _hub = new LiveHub();
  }
  return _hub;
}

export function getProvider(): FootballDataProvider {
  if (_provider) {
    return _provider;
  }
  const config = getServerConfig();
  if (config.provider === 'api-football' && config.providerKeys.apiFootball) {
    _provider = new ApiFootballAdapter(
      {
        apiKey: config.providerKeys.apiFootball,
        baseUrl: config.apiFootball.baseUrl,
        leagueId: config.apiFootball.leagueId,
        season: config.apiFootball.season,
      },
      getHub(),
    );
  } else {
    warnMockDefaultOnce();
    _provider = getMockProvider();
  }
  return _provider;
}

/**
 * The concrete mock provider. In mock mode this IS the active provider; in
 * real mode it still backs the dev:simulate ingest endpoint (a dev tool).
 */
export function getMockProvider(): MockFootballDataProvider {
  if (!_mock) {
    _mock = new MockFootballDataProvider(getHub());
  }
  return _mock;
}

/**
 * Start (once) the live driver for the active provider:
 * - mock: the in-process SimulationEngine ticking the seeded live fixtures.
 * - api-football: a poller that diffs live fixtures and emits unseen events
 *   into the shared hub (idempotent via the adapter's stable event ids).
 */
export function ensureSimulationRunning(): void {
  const config = getServerConfig();
  if (config.provider === 'api-football' && config.providerKeys.apiFootball) {
    if (_livePoller) {
      return;
    }
    const adapter = getProvider() as ApiFootballAdapter;
    _livePoller = setInterval(() => {
      void (async () => {
        const fixtures = await adapter.getFixtures().catch(() => []);
        const live = fixtures.filter((f) =>
          ['live', 'halftime', 'extra_time', 'penalties'].includes(f.snapshot.status),
        );
        for (const f of live) {
          await adapter.pollLiveOnce(f.id).catch(() => []);
        }
      })();
    }, 30_000); // free-tier-friendly cadence
    if (typeof _livePoller === 'object' && 'unref' in _livePoller) {
      (_livePoller as { unref: () => void }).unref();
    }
    return;
  }

  if (!_sim) {
    _sim = new SimulationEngine(getMockProvider(), { intervalMs: 4000 });
    _sim.start();
  }
}

export function resolveProviderName(): ProviderName {
  return getServerConfig().provider;
}
