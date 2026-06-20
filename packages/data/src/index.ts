/**
 * @matchora/data — public barrel.
 * Provider abstraction, mock provider, live hub + simulation, factory.
 * The DB schema is exported via the "./db" subpath, not here.
 */

export type { FootballDataProvider, MatchEventSubscription } from './provider.js';
export { MockFootballDataProvider } from './mock/provider.js';
export { buildMockDataset, type MockDataset } from './mock/dataset.js';
export { LiveHub, InMemoryTransport, type LiveTransport } from './live/hub.js';
export { KafkaLiveTransport, type KafkaTransportConfig } from './live/kafkaTransport.js';
export { SimulationEngine, type SimulationOptions } from './live/simulation.js';
export { getDb, isDbConfigured, closeDb, type Db } from './db/client.js';
export {
  getProvider,
  getMockProvider,
  getHub,
  ensureSimulationRunning,
  resolveProviderName,
} from './factory.js';
export { ProviderNotConfiguredError } from './adapters/base.js';
export { SportmonksAdapter } from './adapters/sportmonks.js';
export { ApiFootballAdapter } from './adapters/apiFootball.js';
export { SportradarAdapter } from './adapters/sportradar.js';
