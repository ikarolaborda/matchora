import { fixturesQuerySchema, isOnLocalDay, LIVE_STATUSES } from '@matchora/shared';
import { getProvider } from '@matchora/data';
import { jsonResponse, errorResponse } from '@/lib/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = {
    competitionId: url.searchParams.get('competitionId') ?? undefined,
    date: url.searchParams.get('date') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
    groupId: url.searchParams.get('groupId') ?? undefined,
  };

  const parsed = fixturesQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse('invalid_query', 'Invalid fixtures query', 400, parsed.error.flatten());
  }

  const { competitionId = 'wft-2026', date, status, groupId } = parsed.data;

  try {
    let fixtures = await getProvider().getFixtures(competitionId);

    if (groupId) {
      fixtures = fixtures.filter((f) => f.groupId === groupId);
    }
    if (status) {
      fixtures = fixtures.filter((f) => f.snapshot.status === status);
    }
    if (date) {
      const dayUtc = `${date}T12:00:00.000Z`;
      fixtures = fixtures.filter((f) => isOnLocalDay(f.kickoffAt, dayUtc, 'UTC'));
    }

    // Stable ordering: live first, then by kickoff.
    fixtures.sort((a, b) => {
      const aLive = LIVE_STATUSES.includes(a.snapshot.status) ? 0 : 1;
      const bLive = LIVE_STATUSES.includes(b.snapshot.status) ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;
      return a.kickoffAt.localeCompare(b.kickoffAt);
    });

    return jsonResponse({ fixtures }, { cacheSeconds: 0 });
  } catch (err) {
    return errorResponse('fixtures_failed', 'Could not load fixtures', 500, String(err));
  }
}
