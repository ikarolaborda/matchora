/**
 * `pnpm dev:simulate` — drives live events for one or more fixtures.
 *
 * Default: POSTs generated events to the running web app's ingestion endpoint
 * so the browser receives them over SSE. With --standalone it prints events to
 * stdout without a server (useful for debugging the engine).
 *
 * Usage:
 *   pnpm dev:simulate                 # all live fixtures → http://localhost:3000
 *   pnpm dev:simulate --standalone    # print events, no HTTP
 *   API_BASE=http://localhost:3000 pnpm dev:simulate
 */

import { MockFootballDataProvider } from './mock/provider.js';
import { SimulationEngine } from './live/simulation.js';

const STANDALONE = process.argv.includes('--standalone');
const API_BASE = process.env.API_BASE ?? 'http://localhost:3000';
const INTERVAL = Number(process.env.SIMULATE_INTERVAL_MS ?? 3000);

async function main(): Promise<void> {
  const provider = new MockFootballDataProvider();
  const engine = new SimulationEngine(provider, { intervalMs: INTERVAL });
  const live = provider.liveFixtureIds;

  if (live.length === 0) {
    console.log('[simulate] no live fixtures in the current dataset window.');
    return;
  }

  console.log(`[simulate] driving ${live.length} live fixture(s): ${live.join(', ')}`);
  console.log(STANDALONE ? '[simulate] standalone mode (stdout only)' : `[simulate] posting to ${API_BASE}/api/live/ingest`);

  const loop = setInterval(async () => {
    for (const fixtureId of live) {
      const event = await engine.tickFixture(fixtureId);
      if (!event) {
        continue;
      }
      if (STANDALONE) {
        console.log(`${fixtureId} #${event.sequence} ${event.kind} ${event.side ?? ''} ${event.matchClock ?? ''}'`);
        continue;
      }
      try {
        const res = await fetch(`${API_BASE}/api/live/ingest`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(event),
        });
        if (!res.ok) {
          console.warn(`[simulate] ingest ${res.status} for ${fixtureId} (is the web app running?)`);
        }
      } catch {
        console.warn('[simulate] could not reach the web app. Start it with `pnpm dev:web`.');
      }
    }
  }, INTERVAL);

  process.on('SIGINT', () => {
    clearInterval(loop);
    process.exit(0);
  });
}

void main();
