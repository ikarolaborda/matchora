import { getProvider } from '@matchora/data';
import { jsonResponse, errorResponse } from '@/lib/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const competitionId = url.searchParams.get('competitionId') ?? 'wft-2026';
  try {
    const groups = await getProvider().getGroups(competitionId);
    return jsonResponse({ groups }, { cacheSeconds: 60 });
  } catch (err) {
    return errorResponse('groups_failed', 'Could not load groups', 500, String(err));
  }
}
