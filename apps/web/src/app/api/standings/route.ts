import {
  standingsQuerySchema,
  simulateRequestSchema,
  simulateGroupStanding,
} from '@matchora/shared';
import { getProvider } from '@matchora/data';
import { jsonResponse, errorResponse } from '@/lib/api-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = {
    competitionId: url.searchParams.get('competitionId') ?? 'wft-2026',
    groupId: url.searchParams.get('groupId') ?? undefined,
  };
  const parsed = standingsQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return errorResponse('invalid_query', 'Invalid standings query', 400, parsed.error.flatten());
  }

  try {
    const all = await getProvider().getStandings(parsed.data.competitionId);
    const standings = parsed.data.groupId
      ? all.filter((s) => s.groupId === parsed.data.groupId)
      : all;
    return jsonResponse({ standings }, { cacheSeconds: 0 });
  } catch (err) {
    return errorResponse('standings_failed', 'Could not load standings', 500, String(err));
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('invalid_body', 'Body must be JSON', 400);
  }

  const parsed = simulateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      'invalid_body',
      'Invalid simulate request',
      400,
      parsed.error.flatten(),
    );
  }
  const { competitionId, groupId, overrides } = parsed.data;

  try {
    const provider = getProvider();
    const [competition, groups, fixtures] = await Promise.all([
      provider.getCompetition(competitionId),
      provider.getGroups(competitionId),
      provider.getFixtures(competitionId),
    ]);
    if (!competition) {
      return errorResponse('not_found', `Competition ${competitionId} not found`, 404);
    }
    const group = groups.find((g) => g.id === groupId);
    if (!group) {
      return errorResponse('not_found', `Group ${groupId} not found`, 404);
    }

    const standing = simulateGroupStanding(
      groupId,
      competitionId,
      group.teamIds,
      fixtures.filter((f) => f.groupId === groupId),
      competition.rules,
      overrides,
    );

    return jsonResponse(
      { standing, advancePerGroup: competition.rules.advancePerGroup },
      { cacheSeconds: 0 },
    );
  } catch (err) {
    return errorResponse('simulate_failed', 'Simulation failed', 500, String(err));
  }
}
