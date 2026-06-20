import { matchEventSchema } from '@matchora/shared';
import { getMockProvider } from '@matchora/data';
import { jsonResponse, errorResponse, rateLimitedResponse } from '@/lib/api-helpers';
import { checkRateLimit } from '@/lib/rate-limit';
import { captureError } from '@/lib/observability';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Burst-prone mutation endpoint: cap ingest writes per client.
const RATE_LIMIT = { key: 'ingest', limit: 60, windowMs: 60_000 };

export async function POST(request: Request) {
  const rl = checkRateLimit(request, RATE_LIMIT);
  if (!rl.ok) {
    return rateLimitedResponse(rl);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('invalid_body', 'Body must be JSON', 400);
  }

  const parsed = matchEventSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('invalid_event', 'Invalid match event', 400, parsed.error.flatten());
  }

  try {
    const snapshot = getMockProvider().ingest(parsed.data);
    return jsonResponse({ snapshot }, { status: 201, cacheSeconds: 0 });
  } catch (err) {
    captureError(err, { route: 'POST /api/live/ingest' });
    return errorResponse('ingest_failed', 'Could not ingest event', 500, String(err));
  }
}
