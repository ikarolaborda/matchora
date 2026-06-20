/**
 * Deterministic mock dataset for MatchOra.
 *
 * Generates a full World-football-tournament-shaped competition: 8 groups of 4
 * national teams, round-robin group fixtures across three matchdays (finished /
 * live / upcoming relative to a reference instant), a knockout bracket with
 * unresolved slots, and event logs for finished and live matches. No protected
 * marks — neutral national-team names + emoji-flag fallback + placeholder colors.
 */

import { applyEvent, emptySnapshot, type Fixture, type Group, type KnockoutBracket, type MatchEvent, type Team, type Venue, type BracketSlot, type Competition, type StageKind } from '@matchora/shared';

export interface MockDataset {
  competition: Competition;
  teams: Team[];
  venues: Venue[];
  groups: Group[];
  fixtures: Fixture[];
  bracket: KnockoutBracket;
  events: Map<string, MatchEvent[]>;
  /** fixture ids that are live at generation time (driven by the simulator). */
  liveFixtureIds: string[];
}

const COMPETITION_ID = 'wft-2026';

interface Nation {
  code: string;
  name: string;
  cc: string; // ISO alpha-2 for emoji flag
  c1: string;
  c2: string;
}

// 32 neutral national-team entries (country names are not protected marks).
const NATIONS: Nation[] = [
  { code: 'BRA', name: 'Brazil', cc: 'BR', c1: '#1c9c4b', c2: '#ffd400' },
  { code: 'ARG', name: 'Argentina', cc: 'AR', c1: '#6cace4', c2: '#ffffff' },
  { code: 'FRA', name: 'France', cc: 'FR', c1: '#1f3a93', c2: '#ffffff' },
  { code: 'ENG', name: 'England', cc: 'GB', c1: '#ffffff', c2: '#cf142b' },
  { code: 'ESP', name: 'Spain', cc: 'ES', c1: '#aa151b', c2: '#f1bf00' },
  { code: 'GER', name: 'Germany', cc: 'DE', c1: '#111111', c2: '#dd0000' },
  { code: 'POR', name: 'Portugal', cc: 'PT', c1: '#006600', c2: '#ff0000' },
  { code: 'NED', name: 'Netherlands', cc: 'NL', c1: '#ff6a00', c2: '#21468b' },
  { code: 'BEL', name: 'Belgium', cc: 'BE', c1: '#111111', c2: '#fdda24' },
  { code: 'CRO', name: 'Croatia', cc: 'HR', c1: '#ff0000', c2: '#ffffff' },
  { code: 'URU', name: 'Uruguay', cc: 'UY', c1: '#6cace4', c2: '#111111' },
  { code: 'MAR', name: 'Morocco', cc: 'MA', c1: '#c1272d', c2: '#006233' },
  { code: 'JPN', name: 'Japan', cc: 'JP', c1: '#1f3a93', c2: '#ffffff' },
  { code: 'KOR', name: 'South Korea', cc: 'KR', c1: '#c60c30', c2: '#003478' },
  { code: 'MEX', name: 'Mexico', cc: 'MX', c1: '#006847', c2: '#ce1126' },
  { code: 'USA', name: 'United States', cc: 'US', c1: '#3c3b6e', c2: '#b22234' },
  { code: 'SEN', name: 'Senegal', cc: 'SN', c1: '#00853f', c2: '#fdef42' },
  { code: 'COL', name: 'Colombia', cc: 'CO', c1: '#fcd116', c2: '#003893' },
  { code: 'SUI', name: 'Switzerland', cc: 'CH', c1: '#ff0000', c2: '#ffffff' },
  { code: 'DEN', name: 'Denmark', cc: 'DK', c1: '#c60c30', c2: '#ffffff' },
  { code: 'SRB', name: 'Serbia', cc: 'RS', c1: '#c6363c', c2: '#0c4076' },
  { code: 'POL', name: 'Poland', cc: 'PL', c1: '#ffffff', c2: '#dc143c' },
  { code: 'AUS', name: 'Australia', cc: 'AU', c1: '#00843d', c2: '#ffcd00' },
  { code: 'CAN', name: 'Canada', cc: 'CA', c1: '#ff0000', c2: '#ffffff' },
  { code: 'GHA', name: 'Ghana', cc: 'GH', c1: '#006b3f', c2: '#fcd116' },
  { code: 'ECU', name: 'Ecuador', cc: 'EC', c1: '#ffdd00', c2: '#034ea2' },
  { code: 'NGA', name: 'Nigeria', cc: 'NG', c1: '#008751', c2: '#ffffff' },
  { code: 'CMR', name: 'Cameroon', cc: 'CM', c1: '#007a5e', c2: '#ce1126' },
  { code: 'EGY', name: 'Egypt', cc: 'EG', c1: '#ce1126', c2: '#111111' },
  { code: 'NOR', name: 'Norway', cc: 'NO', c1: '#ba0c2f', c2: '#00205b' },
  { code: 'AUT', name: 'Austria', cc: 'AT', c1: '#ed2939', c2: '#ffffff' },
  { code: 'CHI', name: 'Chile', cc: 'CL', c1: '#0039a6', c2: '#d52b1e' },
];

const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/** Deterministic PRNG (mulberry32) seeded from a string. */
function seeded(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Single round-robin pairings for 4 teams across 3 matchdays.
const ROUND_ROBIN: Array<Array<[number, number]>> = [
  [[0, 1], [2, 3]], // matchday 1
  [[0, 2], [3, 1]], // matchday 2
  [[3, 0], [1, 2]], // matchday 3
];

function isoPlus(baseMs: number, deltaMinutes: number): string {
  return new Date(baseMs + deltaMinutes * 60_000).toISOString();
}

export function buildMockDataset(nowMs: number = Date.parse('2026-06-19T18:00:00.000Z')): MockDataset {
  const competition: Competition = {
    id: COMPETITION_ID,
    name: 'World Football Tournament 2026',
    season: '2026',
    rules: {
      pointsWin: 3,
      pointsDraw: 1,
      pointsLoss: 0,
      tiebreakers: ['points', 'goal_difference', 'goals_for', 'head_to_head_points', 'fair_play'],
      advancePerGroup: 2,
      knockoutExtraTime: true,
    },
  };

  const teams: Team[] = NATIONS.map((n) => ({
    id: `team-${n.code.toLowerCase()}`,
    name: n.name,
    code: n.code,
    countryCode: n.cc,
    colorPrimary: n.c1,
    colorSecondary: n.c2,
  }));

  const venues: Venue[] = GROUP_LETTERS.map((g, i) => ({
    id: `venue-${i + 1}`,
    name: `Stadium ${i + 1}`,
    city: `Host City ${i + 1}`,
    countryCode: 'US',
  }));

  const groups: Group[] = GROUP_LETTERS.map((letter, gi) => ({
    id: `group-${letter.toLowerCase()}`,
    competitionId: COMPETITION_ID,
    name: `Group ${letter}`,
    teamIds: teams.slice(gi * 4, gi * 4 + 4).map((t) => t.id),
  }));

  const fixtures: Fixture[] = [];
  const events = new Map<string, MatchEvent[]>();
  const liveFixtureIds: string[] = [];

  groups.forEach((group, gi) => {
    const groupTeams = group.teamIds;
    ROUND_ROBIN.forEach((matchday, md) => {
      matchday.forEach(([h, a], idx) => {
        const fixtureId = `fx-${group.name.split(' ')[1]!.toLowerCase()}-md${md + 1}-${idx + 1}`;
        const homeTeamId = groupTeams[h]!;
        const awayTeamId = groupTeams[a]!;
        // Matchday spacing: md1 finished (past), md2 happening around now, md3 future.
        const dayOffset = (md - 1) * 24 * 60; // minutes
        const slotOffset = gi * 30 + idx * 90;
        const kickoffMs = nowMs + dayOffset * 60_000 + slotOffset * 60_000 - 60 * 60_000;
        const kickoffAt = new Date(kickoffMs).toISOString();

        const fixture: Fixture = {
          id: fixtureId,
          competitionId: COMPETITION_ID,
          stage: 'group' as StageKind,
          groupId: group.id,
          knockoutRoundId: null,
          homeTeamId,
          awayTeamId,
          venueId: venues[gi]?.id ?? null,
          kickoffAt,
          snapshot: emptySnapshot(fixtureId),
        };

        const rng = seeded(fixtureId);
        if (md === 0) {
          // finished
          const hg = Math.floor(rng() * 4);
          const ag = Math.floor(rng() * 3);
          const log = buildFinishedLog(fixtureId, hg, ag, kickoffMs);
          events.set(fixtureId, log);
          fixture.snapshot = foldLog(fixtureId, log);
        } else if (md === 1 && (gi % 2 === 0) && idx === 0) {
          // a live match in even groups' matchday 2, first slot
          const log = buildLiveLog(fixtureId, kickoffMs, nowMs, rng);
          events.set(fixtureId, log);
          fixture.snapshot = foldLog(fixtureId, log);
          liveFixtureIds.push(fixtureId);
        }
        // else scheduled (empty snapshot)

        fixtures.push(fixture);
      });
    });
  });

  const bracket = buildBracket(groups);

  return { competition, teams, venues, groups, fixtures, bracket, events, liveFixtureIds };
}

function foldLog(fixtureId: string, log: MatchEvent[]): Fixture['snapshot'] {
  return log.reduce(applyEvent, emptySnapshot(fixtureId));
}

let globalSeq = 0;
function nextEventId(): string {
  globalSeq += 1;
  return `ev_seed_${globalSeq.toString(36)}`;
}

function ev(
  fixtureId: string,
  sequence: number,
  kind: MatchEvent['kind'],
  emittedMs: number,
  extra: Partial<MatchEvent> = {},
): MatchEvent {
  return {
    eventId: nextEventId(),
    fixtureId,
    sequence,
    kind,
    matchClock: extra.matchClock ?? null,
    side: extra.side ?? null,
    teamId: null,
    playerId: null,
    payload: extra.payload ?? {},
    emittedAt: new Date(emittedMs).toISOString(),
    source: 'mock',
    externalId: null,
    correctionOf: null,
  };
}

function buildFinishedLog(fixtureId: string, hg: number, ag: number, kickoffMs: number): MatchEvent[] {
  const log: MatchEvent[] = [ev(fixtureId, 1, 'match_started', kickoffMs, { matchClock: 0 })];
  let seq = 2;
  const goals: Array<{ side: 'home' | 'away'; minute: number }> = [];
  for (let i = 0; i < hg; i++) {
    goals.push({ side: 'home', minute: 10 + i * 17 });
  }
  for (let i = 0; i < ag; i++) {
    goals.push({ side: 'away', minute: 18 + i * 19 });
  }
  goals.sort((a, b) => a.minute - b.minute);
  for (const g of goals) {
    log.push(ev(fixtureId, seq++, 'goal', kickoffMs + g.minute * 60_000, { side: g.side, matchClock: g.minute }));
  }
  log.push(ev(fixtureId, seq++, 'halftime', kickoffMs + 45 * 60_000, { matchClock: 45 }));
  log.push(ev(fixtureId, seq++, 'match_ended', kickoffMs + 94 * 60_000, { matchClock: 90, payload: { status: 'finished' } }));
  return log;
}

function buildLiveLog(fixtureId: string, kickoffMs: number, nowMs: number, rng: () => number): MatchEvent[] {
  const elapsedMin = Math.max(5, Math.min(85, Math.floor((nowMs - kickoffMs) / 60_000)));
  const log: MatchEvent[] = [ev(fixtureId, 1, 'match_started', kickoffMs, { matchClock: 0 })];
  let seq = 2;
  let minute = 0;
  while (minute < elapsedMin) {
    minute += 8 + Math.floor(rng() * 15);
    if (minute >= elapsedMin) {
      break;
    }
    const roll = rng();
    if (roll < 0.28) {
      log.push(ev(fixtureId, seq++, 'goal', kickoffMs + minute * 60_000, { side: rng() < 0.5 ? 'home' : 'away', matchClock: minute }));
    } else if (roll < 0.4) {
      log.push(ev(fixtureId, seq++, 'yellow_card', kickoffMs + minute * 60_000, { side: rng() < 0.5 ? 'home' : 'away', matchClock: minute }));
    }
  }
  // a final "current minute" period marker
  log.push(ev(fixtureId, seq++, 'period_started', kickoffMs + elapsedMin * 60_000, { matchClock: elapsedMin }));
  return log;
}

function buildBracket(groups: Group[]): KnockoutBracket {
  const rounds = [
    { id: 'r16', competitionId: COMPETITION_ID, stage: 'round_of_16' as StageKind, name: 'Round of 16', order: 1 },
    { id: 'qf', competitionId: COMPETITION_ID, stage: 'quarter_final' as StageKind, name: 'Quarter-finals', order: 2 },
    { id: 'sf', competitionId: COMPETITION_ID, stage: 'semi_final' as StageKind, name: 'Semi-finals', order: 3 },
    { id: 'tp', competitionId: COMPETITION_ID, stage: 'third_place' as StageKind, name: 'Third place', order: 4 },
    { id: 'final', competitionId: COMPETITION_ID, stage: 'final' as StageKind, name: 'Final', order: 5 },
  ];

  const slots: BracketSlot[] = [];
  const letters = groups.map((g) => g.id);

  // R16: 8 ties pairing winner of group X vs runner-up of group Y (cross pattern).
  const r16Pairs: Array<[number, number]> = [
    [0, 1], [2, 3], [4, 5], [6, 7], [1, 0], [3, 2], [5, 4], [7, 6],
  ];
  r16Pairs.forEach(([wg, rg], i) => {
    slots.push({
      id: `r16-${i + 1}`,
      roundId: 'r16',
      fixtureId: null,
      homeSource: { kind: 'group_position', groupId: letters[wg]!, position: 1 },
      awaySource: { kind: 'group_position', groupId: letters[rg]!, position: 2 },
      homeTeamId: null,
      awayTeamId: null,
      feedsIntoSlotId: `qf-${Math.floor(i / 2) + 1}`,
      feedsIntoSide: i % 2 === 0 ? 'home' : 'away',
    });
  });

  // QF: winners of pairs of R16 slots.
  for (let i = 0; i < 4; i++) {
    slots.push({
      id: `qf-${i + 1}`,
      roundId: 'qf',
      fixtureId: null,
      homeSource: { kind: 'winner_of', slotId: `r16-${i * 2 + 1}` },
      awaySource: { kind: 'winner_of', slotId: `r16-${i * 2 + 2}` },
      homeTeamId: null,
      awayTeamId: null,
      feedsIntoSlotId: `sf-${Math.floor(i / 2) + 1}`,
      feedsIntoSide: i % 2 === 0 ? 'home' : 'away',
    });
  }

  // SF: winners of QF pairs.
  for (let i = 0; i < 2; i++) {
    slots.push({
      id: `sf-${i + 1}`,
      roundId: 'sf',
      fixtureId: null,
      homeSource: { kind: 'winner_of', slotId: `qf-${i * 2 + 1}` },
      awaySource: { kind: 'winner_of', slotId: `qf-${i * 2 + 2}` },
      homeTeamId: null,
      awayTeamId: null,
      feedsIntoSlotId: i === 0 ? 'final-1' : 'final-1',
      feedsIntoSide: i === 0 ? 'home' : 'away',
    });
  }

  slots.push({
    id: 'tp-1',
    roundId: 'tp',
    fixtureId: null,
    homeSource: { kind: 'loser_of', slotId: 'sf-1' },
    awaySource: { kind: 'loser_of', slotId: 'sf-2' },
    homeTeamId: null,
    awayTeamId: null,
    feedsIntoSlotId: null,
    feedsIntoSide: null,
  });

  slots.push({
    id: 'final-1',
    roundId: 'final',
    fixtureId: null,
    homeSource: { kind: 'winner_of', slotId: 'sf-1' },
    awaySource: { kind: 'winner_of', slotId: 'sf-2' },
    homeTeamId: null,
    awayTeamId: null,
    feedsIntoSlotId: null,
    feedsIntoSide: null,
  });

  return { competitionId: COMPETITION_ID, rounds, slots };
}
