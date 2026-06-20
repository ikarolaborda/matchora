import { matchEventSchema } from '@matchora/shared';
import { getMockProvider } from '@matchora/data';
import { jsonResponse, errorResponse } from '@/lib/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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
    return errorResponse('ingest_failed', 'Could not ingest event', 500, String(err));
  }
}
