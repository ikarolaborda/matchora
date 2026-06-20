import { getProvider } from '@matchora/data';
import { jsonResponse, errorResponse } from '@/lib/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const fixture = await getProvider().getFixture(id);
    if (!fixture) {
      return errorResponse('not_found', `Fixture ${id} not found`, 404);
    }
    const events = await getProvider().getFixtureEvents(id);
    return jsonResponse({ fixture, events }, { cacheSeconds: 0 });
  } catch (err) {
    return errorResponse('fixture_failed', 'Could not load fixture', 500, String(err));
  }
}
