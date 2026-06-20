'use client';

import { useMemo } from 'react';
import { StandingsTable } from './StandingsTable';
import type { GroupStanding, Team } from '@matchora/shared';

/** Client wrapper: builds the team map and renders the standings table. */
export function GroupStandings({
  standing,
  teams,
  advancePerGroup,
}: {
  standing: GroupStanding;
  teams: Team[];
  advancePerGroup: number;
}) {
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  return (
    <StandingsTable standing={standing} teams={teamMap} advancePerGroup={advancePerGroup} />
  );
}
