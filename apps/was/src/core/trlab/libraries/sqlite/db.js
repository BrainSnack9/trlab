import initSqlJs from 'sql.js';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'trlab.sqlite');
const require = createRequire(import.meta.url);
const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');

let dbPromise;
let writeQueue = Promise.resolve();

export async function getDb() {
  if (!dbPromise) dbPromise = createDb();
  return dbPromise;
}

export async function all(sql, params = []) {
  const database = await getDb();
  return select(database, sql, params);
}

export async function get(sql, params = []) {
  const rows = await all(sql, params);
  return rows[0];
}

export async function run(sql, params = []) {
  return write((database) => database.run(sql, params));
}

export async function write(callback) {
  const next = writeQueue.then(async () => {
    const database = await getDb();
    callback(database);
    await persist(database);
  });
  writeQueue = next.catch(() => {});
  return next;
}

async function createDb() {
  await fs.mkdir(dataDir, { recursive: true });
  const SQL = await initSqlJs({ locateFile: () => wasmPath });
  let bytes;
  try {
    bytes = await fs.readFile(dbPath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const database = bytes ? new SQL.Database(bytes) : new SQL.Database();
  initialize(database);
  await persist(database);
  return database;
}

function select(database, sql, params = []) {
  const statement = database.prepare(sql, params);
  const rows = [];
  try {
    while (statement.step()) rows.push(statement.getAsObject());
  } finally {
    statement.free();
  }
  return rows;
}

async function persist(database) {
  await fs.writeFile(dbPath, Buffer.from(database.export()));
}

function initialize(database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS signals (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      metric TEXT DEFAULT '',
      summary TEXT DEFAULT '',
      type TEXT DEFAULT '',
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      collected_at TEXT NOT NULL,
      seen_count INTEGER NOT NULL DEFAULT 1,
      quality_score INTEGER NOT NULL DEFAULT 0,
      quality_label TEXT DEFAULT '',
      quality_reasons_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_signals_source_url
      ON signals(source, url);

    CREATE INDEX IF NOT EXISTS idx_signals_last_seen
      ON signals(last_seen_at DESC);

    CREATE TABLE IF NOT EXISTS collection_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      item_count INTEGER NOT NULL DEFAULT 0,
      error TEXT DEFAULT '',
      reason TEXT DEFAULT '',
      started_at TEXT NOT NULL,
      finished_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_collection_runs_source_time
      ON collection_runs(source, finished_at DESC);

    CREATE TABLE IF NOT EXISTS keyword_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      area TEXT DEFAULT '',
      score INTEGER NOT NULL DEFAULT 0,
      mentions INTEGER NOT NULL DEFAULT 0,
      sources_json TEXT NOT NULL DEFAULT '[]',
      sample_titles_json TEXT NOT NULL DEFAULT '[]',
      trend_json TEXT NOT NULL DEFAULT '{}',
      reason TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_keyword_snapshots_created
      ON keyword_snapshots(created_at DESC);

    CREATE TABLE IF NOT EXISTS candidate_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id TEXT DEFAULT '',
      keyword TEXT NOT NULL,
      keyword_key TEXT NOT NULL,
      action TEXT NOT NULL,
      weight INTEGER NOT NULL DEFAULT 0,
      profile_id TEXT DEFAULT '',
      area_id TEXT DEFAULT '',
      reason TEXT DEFAULT '',
      source TEXT DEFAULT '',
      candidate_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_candidate_feedback_keyword
      ON candidate_feedback(keyword_key, created_at DESC);

    CREATE TABLE IF NOT EXISTS content_plans (
      id TEXT PRIMARY KEY,
      candidate_id TEXT DEFAULT '',
      keyword TEXT NOT NULL,
      plan_json TEXT NOT NULL,
      candidate_json TEXT NOT NULL DEFAULT '{}',
      provider TEXT DEFAULT '',
      status TEXT DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_content_plans_updated
      ON content_plans(updated_at DESC);

    CREATE TABLE IF NOT EXISTS content_images (
      id TEXT PRIMARY KEY,
      plan_id TEXT DEFAULT '',
      card_key TEXT DEFAULT '',
      url TEXT NOT NULL,
      provider TEXT DEFAULT '',
      model TEXT DEFAULT '',
      prompt TEXT DEFAULT '',
      status TEXT DEFAULT 'ready',
      warnings_json TEXT NOT NULL DEFAULT '[]',
      payload_json TEXT NOT NULL DEFAULT '{}',
      image_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_content_images_created
      ON content_images(created_at DESC);

    CREATE TABLE IF NOT EXISTS channel_profiles (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      description TEXT DEFAULT '',
      seeds_json TEXT NOT NULL DEFAULT '[]',
      reddit_json TEXT NOT NULL DEFAULT '[]',
      keywords_json TEXT NOT NULL DEFAULT '[]',
      scoring_json TEXT NOT NULL DEFAULT '{}',
      strategy_json TEXT NOT NULL DEFAULT '{}',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS account_slots (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      profile_id TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  ensureColumn(database, 'keyword_snapshots', 'reason', "TEXT DEFAULT ''");
  ensureColumn(database, 'keyword_snapshots', 'trend_json', "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(database, 'candidate_feedback', 'candidate_json', "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(database, 'candidate_feedback', 'source', "TEXT DEFAULT ''");
  ensureColumn(database, 'signals', 'quality_score', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(database, 'signals', 'quality_label', "TEXT DEFAULT ''");
  ensureColumn(database, 'signals', 'quality_reasons_json', "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(database, 'content_plans', 'candidate_json', "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(database, 'content_plans', 'status', "TEXT DEFAULT 'draft'");
  ensureColumn(database, 'content_images', 'plan_id', "TEXT DEFAULT ''");
  ensureColumn(database, 'content_images', 'card_key', "TEXT DEFAULT ''");
  ensureColumn(database, 'content_images', 'status', "TEXT DEFAULT 'ready'");
  ensureColumn(database, 'channel_profiles', 'strategy_json', "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(database, 'account_slots', 'profile_id', "TEXT DEFAULT ''");
  ensureColumn(database, 'account_slots', 'sort_order', "INTEGER NOT NULL DEFAULT 0");
}

function ensureColumn(database, table, column, definition) {
  const exists = select(database, `PRAGMA table_info(${table})`).some((row) => row.name === column);
  if (!exists) database.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
