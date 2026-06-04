import { integer, jsonb, pgTable, serial, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { getPostgresClient } from './postgres.js';

export const channelProfilesTable = pgTable('channel_profiles', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  description: text('description').notNull().default(''),
  seeds: jsonb('seeds_json').notNull().default([]),
  reddit: jsonb('reddit_json').notNull().default([]),
  keywords: jsonb('keywords_json').notNull().default([]),
  scoring: jsonb('scoring_json').notNull().default({}),
  strategy: jsonb('strategy_json').notNull().default({}),
  enabled: integer('enabled').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const accountSlotsTable = pgTable('account_slots', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  profileId: text('profile_id').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const signalsTable = pgTable('signals', {
  id: text('id').primaryKey(),
  source: text('source').notNull(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  metric: text('metric').notNull().default(''),
  summary: text('summary').notNull().default(''),
  type: text('type').notNull().default(''),
  firstSeenAt: text('first_seen_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
  collectedAt: text('collected_at').notNull(),
  seenCount: integer('seen_count').notNull().default(1),
  qualityScore: integer('quality_score').notNull().default(0),
  qualityLabel: text('quality_label').notNull().default(''),
  qualityReasons: jsonb('quality_reasons_json').notNull().default([])
}, (table) => [
  uniqueIndex('idx_signals_source_url').on(table.source, table.url)
]);

export const collectionRunsTable = pgTable('collection_runs', {
  id: serial('id').primaryKey(),
  source: text('source').notNull(),
  status: text('status').notNull(),
  itemCount: integer('item_count').notNull().default(0),
  error: text('error').notNull().default(''),
  reason: text('reason').notNull().default(''),
  startedAt: text('started_at').notNull(),
  finishedAt: text('finished_at').notNull()
});

export const keywordSnapshotsTable = pgTable('keyword_snapshots', {
  id: serial('id').primaryKey(),
  keyword: text('keyword').notNull(),
  area: text('area').notNull().default(''),
  score: integer('score').notNull().default(0),
  mentions: integer('mentions').notNull().default(0),
  sources: jsonb('sources_json').notNull().default([]),
  sampleTitles: jsonb('sample_titles_json').notNull().default([]),
  trend: jsonb('trend_json').notNull().default({}),
  reason: text('reason').notNull().default(''),
  createdAt: text('created_at').notNull()
});

export const candidateFeedbackTable = pgTable('candidate_feedback', {
  id: serial('id').primaryKey(),
  candidateId: text('candidate_id').notNull().default(''),
  keyword: text('keyword').notNull(),
  keywordKey: text('keyword_key').notNull(),
  action: text('action').notNull(),
  weight: integer('weight').notNull().default(0),
  profileId: text('profile_id').notNull().default(''),
  areaId: text('area_id').notNull().default(''),
  reason: text('reason').notNull().default(''),
  source: text('source').notNull().default(''),
  candidate: jsonb('candidate_json').notNull().default({}),
  createdAt: text('created_at').notNull()
});

export const contentPlansTable = pgTable('content_plans', {
  id: text('id').primaryKey(),
  candidateId: text('candidate_id').notNull().default(''),
  keyword: text('keyword').notNull(),
  plan: jsonb('plan_json').notNull().default({}),
  candidate: jsonb('candidate_json').notNull().default({}),
  provider: text('provider').notNull().default(''),
  status: text('status').notNull().default('draft'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const contentImagesTable = pgTable('content_images', {
  id: text('id').primaryKey(),
  planId: text('plan_id').notNull().default(''),
  cardKey: text('card_key').notNull().default(''),
  url: text('url').notNull(),
  provider: text('provider').notNull().default(''),
  model: text('model').notNull().default(''),
  prompt: text('prompt').notNull().default(''),
  status: text('status').notNull().default('ready'),
  warnings: jsonb('warnings_json').notNull().default([]),
  payload: jsonb('payload_json').notNull().default({}),
  image: jsonb('image_json').notNull().default({}),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

let initialized;

export async function ensurePostgresSchema() {
  if (!initialized) initialized = createPostgresSchema();
  return initialized;
}

async function createPostgresSchema() {
  const db = getPostgresClient();
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS channel_profiles (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      seeds_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      reddit_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      keywords_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      scoring_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      strategy_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS account_slots (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      profile_id TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS signals (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      metric TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT '',
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      collected_at TEXT NOT NULL,
      seen_count INTEGER NOT NULL DEFAULT 1,
      quality_score INTEGER NOT NULL DEFAULT 0,
      quality_label TEXT NOT NULL DEFAULT '',
      quality_reasons_json JSONB NOT NULL DEFAULT '[]'::jsonb
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_signals_source_url
      ON signals(source, url)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_signals_last_seen
      ON signals(last_seen_at DESC)
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS collection_runs (
      id SERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      item_count INTEGER NOT NULL DEFAULT 0,
      error TEXT NOT NULL DEFAULT '',
      reason TEXT NOT NULL DEFAULT '',
      started_at TEXT NOT NULL,
      finished_at TEXT NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_collection_runs_source_time
      ON collection_runs(source, finished_at DESC)
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS keyword_snapshots (
      id SERIAL PRIMARY KEY,
      keyword TEXT NOT NULL,
      area TEXT NOT NULL DEFAULT '',
      score INTEGER NOT NULL DEFAULT 0,
      mentions INTEGER NOT NULL DEFAULT 0,
      sources_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      sample_titles_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      trend_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_keyword_snapshots_created
      ON keyword_snapshots(created_at DESC)
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS candidate_feedback (
      id SERIAL PRIMARY KEY,
      candidate_id TEXT NOT NULL DEFAULT '',
      keyword TEXT NOT NULL,
      keyword_key TEXT NOT NULL,
      action TEXT NOT NULL,
      weight INTEGER NOT NULL DEFAULT 0,
      profile_id TEXT NOT NULL DEFAULT '',
      area_id TEXT NOT NULL DEFAULT '',
      reason TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      candidate_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TEXT NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_candidate_feedback_keyword
      ON candidate_feedback(keyword_key, created_at DESC)
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS content_plans (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL DEFAULT '',
      keyword TEXT NOT NULL,
      plan_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      candidate_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      provider TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_content_plans_updated
      ON content_plans(updated_at DESC)
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS content_images (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL DEFAULT '',
      card_key TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT '',
      prompt TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'ready',
      warnings_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      image_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_content_images_created
      ON content_images(created_at DESC)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_content_images_plan
      ON content_images(plan_id, created_at DESC)
  `);
}
