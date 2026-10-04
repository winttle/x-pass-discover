import 'server-only';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { env } from '@/lib/env';
import * as schema from './schema';

export type Database = ReturnType<typeof drizzle<typeof schema>>;

let cached: Database | null = null;

/** Returns the Neon-backed Drizzle client, or null when DATABASE_URL is unset. */
export function getDb(): Database | null {
  if (!env.databaseUrl) return null;
  if (!cached) {
    const sql = neon(env.databaseUrl);
    cached = drizzle(sql, { schema });
  }
  return cached;
}

export function requireDb(): Database {
  const db = getDb();
  if (!db) {
    throw new Error(
      'DATABASE_URL is not configured. Set it to use Neon persistence.',
    );
  }
  return db;
}

export { schema };
