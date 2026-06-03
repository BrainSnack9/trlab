import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { all, write } from '#trlab/libraries/storage/index';
import { closePostgresClient, getPostgresSqlClient, isPostgresStorageConfigured } from '#trlab/libraries/storage/postgres';
import { ensurePostgresSchema } from '#trlab/libraries/storage/postgres-schema';
import { env, shouldUseSupabaseDatabase } from '#trlab/modules/configs/env';

const execFileAsync = promisify(execFile);

const runtimeTables = ['signals', 'collection_runs', 'keyword_snapshots', 'content_plans', 'content_images'];
const configTables = ['account_slots', 'channel_profiles'];
const allTables = [...runtimeTables, ...configTables];

export async function getDatabaseStatus() {
  const counts = shouldUseSupabaseDatabase()
    ? await getPostgresCounts()
    : await getSqliteCounts();
  return {
    provider: env.DATABASE_PROVIDER,
    mode: shouldUseSupabaseDatabase() ? 'supabase' : 'sqlite',
    postgresConfigured: isPostgresStorageConfigured(),
    runtimeTables,
    configTables,
    counts,
    checkedAt: new Date().toISOString()
  };
}

export async function resetRuntimeDatabase() {
  if (shouldUseSupabaseDatabase()) {
    await ensurePostgresSchema();
    const sql = getPostgresSqlClient();
    try {
      await sql.unsafe(`TRUNCATE TABLE ${runtimeTables.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE`);
    } finally {
      await closePostgresClient();
    }
  } else {
    await write((db) => {
      db.run('BEGIN');
      try {
        runtimeTables.forEach((table) => db.run(`DELETE FROM ${table}`));
        db.run("DELETE FROM sqlite_sequence WHERE name IN ('collection_runs', 'keyword_snapshots')");
        db.run('COMMIT');
        db.run('VACUUM');
      } catch (error) {
        db.run('ROLLBACK');
        throw error;
      }
    });
  }
  return getDatabaseStatus();
}

export async function migrateSqliteToPostgres({ replaceRuntime = true } = {}) {
  const script = resolve(process.cwd(), 'src/core/trlab/scripts/migrate-sqlite-to-postgres.js');
  const args = [script];
  if (replaceRuntime) args.push('--replace-runtime');
  const { stdout, stderr } = await execFileAsync(process.execPath, args, {
    cwd: process.cwd(),
    env: process.env,
    timeout: 120000,
    maxBuffer: 1024 * 1024 * 4
  });
  return {
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    status: await getDatabaseStatus()
  };
}

async function getSqliteCounts() {
  const entries = await Promise.all(allTables.map(async (table) => {
    const rows = await all(`SELECT COUNT(*) AS count FROM ${table}`).catch(() => [{ count: 0 }]);
    return [table, Number(rows[0]?.count ?? 0)];
  }));
  return Object.fromEntries(entries);
}

async function getPostgresCounts() {
  await ensurePostgresSchema();
  const sql = getPostgresSqlClient();
  try {
    const entries = await Promise.all(allTables.map(async (table) => {
      const rows = await sql.unsafe(`SELECT COUNT(*)::int AS count FROM "${table}"`);
      return [table, Number(rows[0]?.count ?? 0)];
    }));
    return Object.fromEntries(entries);
  } finally {
    await closePostgresClient();
  }
}
