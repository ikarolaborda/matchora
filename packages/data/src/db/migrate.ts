/**
 * Migration runner — applies the generated SQL migrations in `../../drizzle`
 * to the database at DATABASE_URL using the drizzle-orm node-postgres migrator.
 *
 * INVOCATION (ONE-SHOT): this is meant to run exactly once per deploy as a
 * dedicated step — a one-shot compose `migrate` service (depends_on postgres
 * healthy; `web` depends on it completing) or a pre-deploy job — NOT
 * migrate-on-start baked into every app replica (that would race N replicas
 * against the same schema). The central integrator wires the compose service;
 * we only provide the runnable entrypoint here.
 *
 * Nothing runs at import time except when this file is executed directly
 * (`tsx src/db/migrate.ts`), preserving the zero-infra default.
 */

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('[migrate] DATABASE_URL is not set. The MVP runs on the mock provider without a database.');
    process.exit(1);
  }

  // Resolve the migrations folder relative to this file (package-root/drizzle),
  // independent of the process CWD.
  const here = dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = resolve(here, '../../drizzle');

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  console.log(`[migrate] applying migrations from ${migrationsFolder} ...`);
  try {
    await migrate(db, { migrationsFolder });
    console.log('[migrate] done — schema is up to date.');
  } catch (err) {
    console.error('[migrate] failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
