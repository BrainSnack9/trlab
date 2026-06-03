import { write } from '#trlab/libraries/storage/index';
import { closePostgresClient, getPostgresSqlClient } from '#trlab/libraries/storage/postgres';
import { ensurePostgresSchema } from '#trlab/libraries/storage/postgres-schema';
import { env, shouldUseSupabaseDatabase } from '#trlab/modules/configs/env';

const resetAll = process.argv.includes('--all');
const runtimeTables = ['signals', 'collection_runs', 'keyword_snapshots', 'content_plans', 'content_images'];
const configTables = ['account_slots', 'channel_profiles'];
const tables = resetAll ? [...runtimeTables, ...configTables] : runtimeTables;

if (shouldUseSupabaseDatabase()) {
  await resetPostgresTables(tables);
} else {
  await resetSqliteTables(tables);
}

console.log(`TrLab ${env.DATABASE_PROVIDER} DB reset complete: ${tables.join(', ')}`);

async function resetSqliteTables(targetTables) {
  await write((db) => {
    db.run('BEGIN');
    try {
      targetTables.forEach((table) => db.run(`DELETE FROM ${table}`));
      db.run("DELETE FROM sqlite_sequence WHERE name IN ('collection_runs', 'keyword_snapshots')");
      db.run('COMMIT');
      db.run('VACUUM');
    } catch (error) {
      db.run('ROLLBACK');
      throw error;
    }
  });
}

async function resetPostgresTables(targetTables) {
  await ensurePostgresSchema();
  const sql = getPostgresSqlClient();
  try {
    if (!targetTables.length) return;
    await sql.unsafe(`TRUNCATE TABLE ${targetTables.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE`);
  } finally {
    await closePostgresClient();
  }
}
