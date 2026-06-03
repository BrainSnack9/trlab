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
  if (!sqlClient) sqlClient = createSqlClient();
  if (!drizzleClient) drizzleClient = drizzle(sqlClient);
  return drizzleClient;
}

export function getPostgresSqlClient() {
  if (!isPostgresStorageConfigured()) return null;
  if (!sqlClient) sqlClient = createSqlClient();
  return sqlClient;
}

export async function closePostgresClient() {
  if (!sqlClient) return;
  const client = sqlClient;
  sqlClient = null;
  drizzleClient = null;
  await client.end({ timeout: 1 });
}

export function getPostgresConnectionString() {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  const user = encodeURIComponent(env.SUPABASE_DB_USER ?? 'postgres');
  const password = encodeURIComponent(env.SUPABASE_DB_PASSWORD ?? '');
  const host = env.SUPABASE_DB_HOST;
  const port = env.SUPABASE_DB_PORT ?? 5432;
  const database = encodeURIComponent(env.SUPABASE_DB_NAME ?? 'postgres');
  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
}

function createSqlClient() {
  return postgres(getPostgresConnectionString(), {
    max: 5,
    ssl: 'require',
    onnotice: () => {}
  });
}
