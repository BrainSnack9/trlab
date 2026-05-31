import { getDb } from '../src/lib/db.js';

const tables = ['signals', 'collection_runs', 'keyword_snapshots', 'content_plans'];
const db = getDb();

const reset = db.transaction(() => {
  tables.forEach((table) => db.prepare(`DELETE FROM ${table}`).run());
  db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('collection_runs', 'keyword_snapshots')").run();
});

reset();
db.pragma('wal_checkpoint(TRUNCATE)');
db.exec('VACUUM');

console.log(`TrLab DB reset complete: ${tables.join(', ')}`);
