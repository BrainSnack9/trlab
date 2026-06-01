import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env, hasPostgresConfig } from '#trlab/modules/configs/env';

let sqlClient;
let drizzleClient;

export function isPostgresStorageConfigured() {
  return hasPostgresConfig();
}

export function getPostgresClient() {
  if (!isPostgresStorageConfigured()) return null;
  if (!sqlClient) sqlClient = postgres(env.DATABASE_URL, { max: 5 });
  if (!drizzleClient) drizzleClient = drizzle(sqlClient);
  return drizzleClient;
}
