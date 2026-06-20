import { healthSchema, type Health } from '@matchora/shared';
import { getServerConfig, APP_VERSION } from '@matchora/config';
import { getProvider, getMockProvider, getDb } from '@matchora/data';
import { sql } from 'drizzle-orm';
import { jsonResponse, errorResponse } from '@/lib/api-helpers';
import { captureError } from '@/lib/observability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Best-effort database probe.
 * - No DATABASE_URL  -> 'unconfigured' (mock default; this is NOT a failure).
 * - Configured + reachable -> 'ok'.
 * - Configured + unreachable -> 'down'.
 * Never throws; never blocks the mock path.
 */
async function probeDatabase(databaseUrl: string | null): Promise<Health['database']> {
  if (!databaseUrl) {
    return 'unconfigured';
  }
  try {
    const db = getDb();
    if (!db) {
      return 'unconfigured';
    }
    await db.execute(sql`select 1`);
    return 'ok';
  } catch (err) {
    captureError(err, { check: 'health.database' });
    return 'down';
  }
}

/**
 * Best-effort live/kafka reachability.
 * In mock mode (no Kafka brokers) the in-process LiveHub is the transport, so
 * as long as the mock provider resolves we report 'ok'. The schema only allows
 * 'ok' | 'down', so a soft/degraded signal collapses to 'ok' (we never hard
 * 'down' the mock). Real broker health can be wired here when Kafka is enabled.
 */
function probeLive(): Health['live'] {
  try {
    // Touching liveFixtureIds confirms the in-process hub/provider is alive.
    return getMockProvider().liveFixtureIds.length >= 0 ? 'ok' : 'down';
  } catch (err) {
    captureError(err, { check: 'health.live' });
    return 'down';
  }
}

export async function GET() {
  try {
    const config = getServerConfig();

    const provider = getProvider();
    let providerOk = true;
    try {
      await provider.getCompetition('wft-2026');
    } catch (err) {
      providerOk = false;
      captureError(err, { check: 'health.provider' });
    }

    const database = await probeDatabase(config.databaseUrl);
    const live = probeLive();

    // Overall status: degrade (not down) if a configured DB is unreachable or
    // the provider failed. The mock default (db 'unconfigured') stays 'ok'.
    const degraded = !providerOk || database === 'down' || live === 'down';

    const body: Health = {
      status: degraded ? 'degraded' : 'ok',
      app: 'ok',
      database,
      provider: { name: config.provider, status: providerOk ? 'ok' : 'down' },
      live,
      version: APP_VERSION,
      time: new Date().toISOString(),
    };

    const parsed = healthSchema.parse(body);
    // Always 200 — degraded is reported in the body, not the HTTP status, so
    // the endpoint stays reachable in zero-infra mock mode. Cache-Control:
    // no-store is set by jsonResponse for cacheSeconds: 0.
    return jsonResponse(parsed, { cacheSeconds: 0 });
  } catch (err) {
    captureError(err, { route: 'GET /api/health' });
    return errorResponse('health_failed', 'Health check failed', 500, String(err));
  }
}
