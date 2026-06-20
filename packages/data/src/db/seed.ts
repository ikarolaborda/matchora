/**
 * Seed script — loads the mock dataset into Postgres for the persistence path.
 * Requires DATABASE_URL. Safe to skip for local mock-only runs.
 */

import { buildMockDataset } from '../mock/dataset.js';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set. The MVP runs on the mock provider without a database.');
    console.error('Set DATABASE_URL and run `pnpm db:migrate` before seeding.');
    process.exit(1);
  }

  const data = buildMockDataset();
  // Wiring drizzle inserts is left as the documented next step; the dataset
  // shape already matches the schema. We log the plan so the path is clear.
  console.log(`[seed] competition: ${data.competition.name}`);
  console.log(`[seed] teams=${data.teams.length} groups=${data.groups.length} fixtures=${data.fixtures.length}`);
  console.log(`[seed] bracket slots=${data.bracket.slots.length}`);
  console.log('[seed] Connect drizzle to DATABASE_URL and insert in FK order: competitions → teams → groups → fixtures → match_events → bracket_slots.');
}

void main();
