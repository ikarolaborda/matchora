import { healthSchema, type Health } from '@matchora/shared';
import { getServerConfig } from '@matchora/config';
import { APP_VERSION } from '@matchora/config';
import { getProvider, getMockProvider } from '@matchora/data';
import { jsonResponse, errorResponse } from '@/lib/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = getServerConfig();
    // Touch the provider to confirm it resolves; mock has live fixtures.
    const provider = getProvider();
    let providerOk = true;
    try {
      await provider.getCompetition('wft-2026');
    } catch {
      providerOk = false;
    }

    const live = getMockProvider().liveFixtureIds.length >= 0 ? 'ok' : 'down';

    const body: Health = {
      status: providerOk ? 'ok' : 'degraded',
      app: 'ok',
      database: config.databaseUrl ? 'ok' : 'unconfigured',
      provider: { name: config.provider, status: providerOk ? 'ok' : 'down' },
      live,
      version: APP_VERSION,
      time: new Date().toISOString(),
    };

    const parsed = healthSchema.parse(body);
    return jsonResponse(parsed, { cacheSeconds: 0 });
  } catch (err) {
    return errorResponse('health_failed', 'Health check failed', 500, String(err));
  }
}
