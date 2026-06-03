import { all as sqliteAll } from '#trlab/libraries/sqlite/db';
import { closePostgresClient, getPostgresClient } from '#trlab/libraries/storage/postgres';
import { sql } from 'drizzle-orm';
import {
  accountSlotsTable,
  channelProfilesTable,
  collectionRunsTable,
  contentImagesTable,
  contentPlansTable,
  ensurePostgresSchema,
  keywordSnapshotsTable,
  signalsTable
} from '#trlab/libraries/storage/postgres-schema';

await ensurePostgresSchema();

const db = getPostgresClient();
const replaceRuntime = process.argv.includes('--replace-runtime');
const summary = {};

try {
  if (replaceRuntime) await clearRuntimeTables();
  summary.channelProfiles = await migrateChannelProfiles();
  summary.accountSlots = await migrateAccountSlots();
  summary.signals = await migrateSignals();
  summary.collectionRuns = await migrateCollectionRuns();
  summary.keywordSnapshots = await migrateKeywordSnapshots();
  summary.contentPlans = await migrateContentPlans();
  summary.contentImages = await migrateContentImages();
} finally {
  await closePostgresClient();
}

console.log(JSON.stringify({ migrated: summary }, null, 2));

async function clearRuntimeTables() {
  await db.delete(signalsTable);
  await db.delete(collectionRunsTable);
  await db.delete(keywordSnapshotsTable);
  await db.delete(contentPlansTable);
  await db.delete(contentImagesTable);
}

async function migrateChannelProfiles() {
  const rows = await sqliteAll(`
    SELECT id, label, description, seeds_json AS seedsJson, reddit_json AS redditJson,
           keywords_json AS keywordsJson, scoring_json AS scoringJson, strategy_json AS strategyJson,
           enabled, created_at AS createdAt, updated_at AS updatedAt
    FROM channel_profiles
    ORDER BY created_at ASC
  `);
  for (const row of rows) {
    await db.insert(channelProfilesTable)
      .values({
        id: row.id,
        label: row.label,
        description: row.description ?? '',
        seeds: parseJson(row.seedsJson, []),
        reddit: parseJson(row.redditJson, []),
        keywords: parseJson(row.keywordsJson, []),
        scoring: parseJson(row.scoringJson, {}),
        strategy: parseJson(row.strategyJson, {}),
        enabled: row.enabled ? 1 : 0,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      })
      .onConflictDoUpdate({
        target: channelProfilesTable.id,
        set: {
          label: row.label,
          description: row.description ?? '',
          seeds: parseJson(row.seedsJson, []),
          reddit: parseJson(row.redditJson, []),
          keywords: parseJson(row.keywordsJson, []),
          scoring: parseJson(row.scoringJson, {}),
          strategy: parseJson(row.strategyJson, {}),
          enabled: row.enabled ? 1 : 0,
          updatedAt: row.updatedAt
        }
      });
  }
  return rows.length;
}

async function migrateAccountSlots() {
  const rows = await sqliteAll(`
    SELECT id, label, profile_id AS profileId, sort_order AS sortOrder, created_at AS createdAt, updated_at AS updatedAt
    FROM account_slots
    ORDER BY sort_order ASC, id ASC
  `);
  for (const row of rows) {
    await db.insert(accountSlotsTable)
      .values({
        id: row.id,
        label: row.label,
        profileId: row.profileId ?? '',
        sortOrder: Number(row.sortOrder) || 0,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      })
      .onConflictDoUpdate({
        target: accountSlotsTable.id,
        set: {
          label: row.label,
          profileId: row.profileId ?? '',
          sortOrder: Number(row.sortOrder) || 0,
          updatedAt: row.updatedAt
        }
      });
  }
  return rows.length;
}

async function migrateSignals() {
  const rows = await sqliteAll(`
    SELECT id, source, title, url, metric, summary, type,
           first_seen_at AS firstSeenAt, last_seen_at AS lastSeenAt, collected_at AS collectedAt, seen_count AS seenCount,
           quality_score AS qualityScore, quality_label AS qualityLabel, quality_reasons_json AS qualityReasonsJson
    FROM signals
    ORDER BY last_seen_at ASC
  `);
  for (const chunk of chunks(rows, 250)) {
    await db.insert(signalsTable)
      .values(chunk.map((row) => ({
        id: row.id,
        source: row.source,
        title: row.title,
        url: row.url,
        metric: row.metric ?? '',
        summary: row.summary ?? '',
        type: row.type ?? '',
        firstSeenAt: row.firstSeenAt,
        lastSeenAt: row.lastSeenAt,
        collectedAt: row.collectedAt,
        seenCount: Number(row.seenCount) || 1,
        qualityScore: Number(row.qualityScore) || 0,
        qualityLabel: row.qualityLabel ?? '',
        qualityReasons: parseJson(row.qualityReasonsJson, [])
      })))
      .onConflictDoUpdate({
        target: [signalsTable.source, signalsTable.url],
        set: {
          title: sql.raw('excluded.title'),
          metric: sql.raw('excluded.metric'),
          summary: sql.raw('excluded.summary'),
          type: sql.raw('excluded.type'),
          lastSeenAt: sql.raw('excluded.last_seen_at'),
          collectedAt: sql.raw('excluded.collected_at'),
          seenCount: sql.raw('excluded.seen_count'),
          qualityScore: sql.raw('excluded.quality_score'),
          qualityLabel: sql.raw('excluded.quality_label'),
          qualityReasons: sql.raw('excluded.quality_reasons_json')
        }
      });
  }
  return rows.length;
}

async function migrateCollectionRuns() {
  const rows = await sqliteAll(`
    SELECT source, status, item_count AS itemCount, error, reason, started_at AS startedAt, finished_at AS finishedAt
    FROM collection_runs
    ORDER BY id ASC
  `);
  if (rows.length) {
    await db.insert(collectionRunsTable).values(rows.map((row) => ({
      source: row.source,
      status: row.status,
      itemCount: Number(row.itemCount) || 0,
      error: row.error ?? '',
      reason: row.reason ?? '',
      startedAt: row.startedAt,
      finishedAt: row.finishedAt
    })));
  }
  return rows.length;
}

async function migrateKeywordSnapshots() {
  const rows = await sqliteAll(`
    SELECT keyword, area, score, mentions, sources_json AS sourcesJson,
           sample_titles_json AS sampleTitlesJson, trend_json AS trendJson, reason, created_at AS createdAt
    FROM keyword_snapshots
    ORDER BY id ASC
  `);
  if (rows.length) {
    await db.insert(keywordSnapshotsTable).values(rows.map((row) => ({
      keyword: row.keyword,
      area: row.area ?? '',
      score: Number(row.score) || 0,
      mentions: Number(row.mentions) || 0,
      sources: parseJson(row.sourcesJson, []),
      sampleTitles: parseJson(row.sampleTitlesJson, []),
      trend: parseJson(row.trendJson, {}),
      reason: row.reason ?? '',
      createdAt: row.createdAt
    })));
  }
  return rows.length;
}

async function migrateContentPlans() {
  const rows = await sqliteAll(`
    SELECT id, candidate_id AS candidateId, keyword, plan_json AS planJson,
           candidate_json AS candidateJson, provider, status, created_at AS createdAt, updated_at AS updatedAt
    FROM content_plans
    ORDER BY updated_at ASC
  `);
  for (const row of rows) {
    await db.insert(contentPlansTable)
      .values({
        id: row.id,
        candidateId: row.candidateId ?? '',
        keyword: row.keyword,
        plan: parseJson(row.planJson, {}),
        candidate: parseJson(row.candidateJson, {}),
        provider: row.provider ?? '',
        status: row.status ?? 'draft',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      })
      .onConflictDoUpdate({
        target: contentPlansTable.id,
        set: {
          plan: parseJson(row.planJson, {}),
          candidate: parseJson(row.candidateJson, {}),
          provider: row.provider ?? '',
          status: row.status ?? 'draft',
          updatedAt: row.updatedAt
        }
      });
  }
  return rows.length;
}

async function migrateContentImages() {
  if (!await sqliteTableExists('content_images')) return 0;
  const rows = await sqliteAll(`
    SELECT id, plan_id AS planId, card_key AS cardKey, url, provider, model, prompt, status,
           warnings_json AS warningsJson, payload_json AS payloadJson, image_json AS imageJson,
           created_at AS createdAt, updated_at AS updatedAt
    FROM content_images
    ORDER BY created_at ASC
  `);
  for (const row of rows) {
    await db.insert(contentImagesTable)
      .values({
        id: row.id,
        planId: row.planId ?? '',
        cardKey: row.cardKey ?? '',
        url: row.url,
        provider: row.provider ?? '',
        model: row.model ?? '',
        prompt: row.prompt ?? '',
        status: row.status ?? 'ready',
        warnings: parseJson(row.warningsJson, []),
        payload: parseJson(row.payloadJson, {}),
        image: parseJson(row.imageJson, {}),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      })
      .onConflictDoUpdate({
        target: contentImagesTable.id,
        set: {
          url: row.url,
          provider: row.provider ?? '',
          model: row.model ?? '',
          prompt: row.prompt ?? '',
          status: row.status ?? 'ready',
          warnings: parseJson(row.warningsJson, []),
          payload: parseJson(row.payloadJson, {}),
          image: parseJson(row.imageJson, {}),
          updatedAt: row.updatedAt
        }
      });
  }
  return rows.length;
}

async function sqliteTableExists(tableName) {
  const rows = await sqliteAll('SELECT name FROM sqlite_master WHERE type = ? AND name = ?', ['table', tableName]);
  return rows.length > 0;
}

function parseJson(value, fallback) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value || '') : value;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}
