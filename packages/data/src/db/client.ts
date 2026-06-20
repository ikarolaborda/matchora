/**
 * Lazy Drizzle (node-postgres) client.
 *
 * The DB is the OPTIONAL persistence path — the app runs entirely on the mock
 * provider with no DATABASE_URL. Nothing is initialized at import time: getDb()
 * returns null when DATABASE_URL is absent, and every caller must branch on it.
 * This preserves the zero-infra invariant.
 */

import { getServerConfig } from '@matchora/config';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

let _pool: Pool | null = null;
let _db: NodePgDatabase<typeof schema> | null = null;

export type Db = NodePgDatabase<typeof schema>;

/** Returns a Drizzle db bound to DATABASE_URL, or null when unconfigured. */
export function getDb(): Db | null {
  if (_db) {
    return _db;
  }
  const { databaseUrl } = getServerConfig();
  if (!databaseUrl) {
    return null;
  }
  _pool = new Pool({ connectionString: databaseUrl });
  _db = drizzle(_pool, { schema });
  return _db;
}

export function isDbConfigured(): boolean {
  return Boolean(getServerConfig().databaseUrl);
}

/** Cleanly close the pool (tests / graceful shutdown). */
export async function closeDb(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}

export { schema };
