import { write } from '#trlab/libraries/storage/index';

const tables = ['signals', 'collection_runs', 'keyword_snapshots', 'content_plans'];

await write((db) => {
  db.run('BEGIN');
  try {
    tables.forEach((table) => db.run(`DELETE FROM ${table}`));
    db.run("DELETE FROM sqlite_sequence WHERE name IN ('collection_runs', 'keyword_snapshots')");
    db.run('COMMIT');
    db.run('VACUUM');
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
});

console.log(`TrLab DB reset complete: ${tables.join(', ')}`);
