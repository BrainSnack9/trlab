import { all, get, write } from '#trlab/libraries/storage/index';
import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { getPostgresClient } from '#trlab/libraries/storage/postgres';
import { collectionRunsTable, ensurePostgresSchema, keywordSnapshotsTable, signalsTable } from '#trlab/libraries/storage/postgres-schema';
import { shouldUseSupabaseDatabase } from '#trlab/modules/configs/env';
import { evaluateSignalQuality } from './signal-quality.js';
import { repairObjectText } from '#trlab/modules/helpers/text-repair';

export async function saveCollectionResult({ payloads, startedAt, finishedAt, reason = 'manual' }) {
  if (shouldUseSupabaseDatabase()) return savePostgresCollectionResult({ payloads, startedAt, finishedAt, reason });
  await write((database) => {
    database.run('BEGIN');
    try {
      payloads.forEach((payload) => {
        database.run(`
          INSERT INTO collection_runs (source, status, item_count, error, reason, started_at, finished_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [payload.source, payload.status, payload.items?.length ?? 0, payload.error ?? '', reason, startedAt, finishedAt]);

        (payload.items ?? []).map(repairSignal).filter((signal) => evaluateSignalQuality(signal).storable).forEach((signal) => {
          const quality = evaluateSignalQuality(signal);
          const collectedAt = signal.collectedAt ?? finishedAt;
          database.run(`
            INSERT INTO signals (
              id, source, title, url, metric, summary, type,
              first_seen_at, last_seen_at, collected_at, seen_count,
              quality_score, quality_label, quality_reasons_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
            ON CONFLICT(source, url) DO UPDATE SET
              title = excluded.title,
              metric = excluded.metric,
              summary = excluded.summary,
              type = excluded.type,
              quality_score = excluded.quality_score,
              quality_label = excluded.quality_label,
              quality_reasons_json = excluded.quality_reasons_json,
              last_seen_at = excluded.collected_at,
              collected_at = excluded.collected_at,
              seen_count = signals.seen_count + 1
          `, [
            signal.id,
            signal.source,
            signal.title,
            signal.url,
            signal.metric ?? '',
            signal.summary ?? '',
            signal.type ?? '',
            collectedAt,
            collectedAt,
            collectedAt,
            quality.score,
            quality.label,
            JSON.stringify(quality.reasons)
          ]);
        });
      });
      database.run('COMMIT');
    } catch (error) {
      database.run('ROLLBACK');
      throw error;
    }
  });
}

export async function getLatestSignals(limit = 500) {
  if (shouldUseSupabaseDatabase()) return getPostgresLatestSignals(limit);
  const rows = await all(`
      SELECT id, source, title, url, metric, summary, type, collected_at AS collectedAt,
             first_seen_at AS firstSeenAt, last_seen_at AS lastSeenAt, seen_count AS seenCount,
             quality_score AS qualityScore, quality_label AS qualityLabel,
             quality_reasons_json AS qualityReasonsJson
      FROM signals
      ORDER BY last_seen_at DESC
      LIMIT ?
    `, [limit]);

  return rows.map((row) => {
    const fixed = repairSignal(row);
    const fallback = evaluateSignalQuality(fixed);
    return {
      ...fixed,
      qualityScore: fallback.score,
      qualityLabel: fallback.label,
      qualityReasons: fallback.reasons
    };
  });
}

export async function getSignalsForAnalysis({ limit = 500, since, until } = {}) {
  if (!since && !until) return getLatestSignals(limit);
  if (shouldUseSupabaseDatabase()) return getPostgresSignalsForAnalysis({ limit, since, until });
  const where = [
    since ? 'last_seen_at >= ?' : '',
    until ? 'last_seen_at < ?' : ''
  ].filter(Boolean).join(' AND ');
  const values = [since, until].filter(Boolean);
  const rows = await all(`
      SELECT id, source, title, url, metric, summary, type, collected_at AS collectedAt,
             first_seen_at AS firstSeenAt, last_seen_at AS lastSeenAt, seen_count AS seenCount,
             quality_score AS qualityScore, quality_label AS qualityLabel,
             quality_reasons_json AS qualityReasonsJson
      FROM signals
      WHERE ${where}
      ORDER BY last_seen_at DESC
      LIMIT ?
    `, [...values, limit]);

  return rows.map((row) => {
    const fixed = repairSignal(row);
    const fallback = evaluateSignalQuality(fixed);
    return {
      ...fixed,
      qualityScore: fallback.score,
      qualityLabel: fallback.label,
      qualityReasons: fallback.reasons
    };
  });
}

export async function getSignalStats() {
  if (shouldUseSupabaseDatabase()) return getPostgresSignalStats();
  return get('SELECT COUNT(*) AS total FROM signals');
}

export async function getSignalWindowSummary(windows = []) {
  if (shouldUseSupabaseDatabase()) return getPostgresSignalWindowSummary(windows);
  const summaries = [];
  for (const window of windows) {
    const row = await get(`
      SELECT COUNT(*) AS count, COUNT(DISTINCT source) AS sources
      FROM signals
      WHERE last_seen_at >= ? AND last_seen_at < ?
    `, [window.from, window.to]);
    summaries.push({
      date: window.date,
      from: window.from,
      to: window.to,
      count: Number(row?.count ?? 0),
      sources: Number(row?.sources ?? 0)
    });
  }
  return summaries;
}
function repairSignal(signal) { return repairObjectText(signal, ['title', 'summary', 'metric', 'qualityLabel']); }

export async function clearTrendCollectionData() {
  if (shouldUseSupabaseDatabase()) return clearPostgresTrendCollectionData();
  const tables = ['signals', 'collection_runs', 'keyword_snapshots'];
  await write((database) => {
    database.run('BEGIN');
    try {
      tables.forEach((table) => database.run(`DELETE FROM ${table}`));
      database.run("DELETE FROM sqlite_sequence WHERE name IN ('collection_runs', 'keyword_snapshots')");
      database.run('COMMIT');
    } catch (error) {
      database.run('ROLLBACK');
      throw error;
    }
  });
  return { cleared: tables };
}

export async function saveKeywordSnapshots(trends, reason = 'manual-rank') {
  if (shouldUseSupabaseDatabase()) return savePostgresKeywordSnapshots(trends, reason);
  const createdAt = new Date().toISOString();
  await write((database) => {
    database.run('BEGIN');
    try {
      trends.forEach((trend) => {
        database.run(`
          INSERT INTO keyword_snapshots (
            keyword, area, score, mentions, sources_json, sample_titles_json, trend_json, reason, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          trend.keyword,
          trend.area?.label ?? '',
          Math.round(trend.score ?? 0),
          trend.mentions ?? 0,
          JSON.stringify(trend.sources ?? []),
          JSON.stringify(trend.sampleTitles ?? []),
          JSON.stringify(trend),
          reason,
          createdAt
        ]);
      });
      database.run('COMMIT');
    } catch (error) {
      database.run('ROLLBACK');
      throw error;
    }
  });
}

export async function getLatestSourceStatus() {
  if (shouldUseSupabaseDatabase()) return getPostgresLatestSourceStatus();
  return all(`
      SELECT source, status, item_count AS count, error, reason,
             started_at AS startedAt, finished_at AS finishedAt
      FROM collection_runs
      WHERE id IN (
        SELECT MAX(id)
        FROM collection_runs
        GROUP BY source
      )
      ORDER BY source ASC
    `);
}

export async function getRecentRuns(limit = 30) {
  if (shouldUseSupabaseDatabase()) return getPostgresRecentRuns(limit);
  return all(`
      SELECT id, source, status, item_count AS count, error, reason,
             started_at AS startedAt, finished_at AS finishedAt
      FROM collection_runs
      ORDER BY id DESC
      LIMIT ?
    `, [limit]);
}

async function savePostgresCollectionResult({ payloads, startedAt, finishedAt, reason = 'manual' }) {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  for (const payload of payloads) {
    await db.insert(collectionRunsTable).values({
      source: payload.source,
      status: payload.status,
      itemCount: payload.items?.length ?? 0,
      error: payload.error ?? '',
      reason,
      startedAt,
      finishedAt
    });
    const signals = (payload.items ?? []).map(repairSignal).filter((signal) => evaluateSignalQuality(signal).storable);
    for (const signal of signals) {
      const quality = evaluateSignalQuality(signal);
      const collectedAt = signal.collectedAt ?? finishedAt;
      await db.insert(signalsTable)
        .values({
          id: signal.id,
          source: signal.source,
          title: signal.title,
          url: signal.url,
          metric: signal.metric ?? '',
          summary: signal.summary ?? '',
          type: signal.type ?? '',
          firstSeenAt: collectedAt,
          lastSeenAt: collectedAt,
          collectedAt,
          seenCount: 1,
          qualityScore: quality.score,
          qualityLabel: quality.label,
          qualityReasons: quality.reasons
        })
        .onConflictDoUpdate({
          target: [signalsTable.source, signalsTable.url],
          set: {
            title: signal.title,
            metric: signal.metric ?? '',
            summary: signal.summary ?? '',
            type: signal.type ?? '',
            qualityScore: quality.score,
            qualityLabel: quality.label,
            qualityReasons: quality.reasons,
            lastSeenAt: collectedAt,
            collectedAt,
            seenCount: sql`${signalsTable.seenCount} + 1`
          }
        });
    }
  }
}

async function getPostgresLatestSignals(limit = 500) {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  const rows = await db.select().from(signalsTable).orderBy(desc(signalsTable.lastSeenAt)).limit(limit);
  return rows.map(rowToSignal);
}

async function getPostgresSignalsForAnalysis({ limit = 500, since, until } = {}) {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  const clauses = [
    since ? gte(signalsTable.lastSeenAt, since) : null,
    until ? lt(signalsTable.lastSeenAt, until) : null
  ].filter(Boolean);
  const rows = await db
    .select()
    .from(signalsTable)
    .where(clauses.length > 1 ? and(...clauses) : clauses[0])
    .orderBy(desc(signalsTable.lastSeenAt))
    .limit(limit);
  return rows.map(rowToSignal);
}

async function getPostgresSignalStats() {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  const rows = await db.select({ total: sql`count(*)` }).from(signalsTable);
  return { total: Number(rows[0]?.total ?? 0) };
}

async function getPostgresSignalWindowSummary(windows = []) {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  const summaries = [];
  for (const window of windows) {
    const rows = await db
      .select({
        count: sql`count(*)`,
        sources: sql`count(distinct ${signalsTable.source})`
      })
      .from(signalsTable)
      .where(and(gte(signalsTable.lastSeenAt, window.from), lt(signalsTable.lastSeenAt, window.to)));
    summaries.push({
      date: window.date,
      from: window.from,
      to: window.to,
      count: Number(rows[0]?.count ?? 0),
      sources: Number(rows[0]?.sources ?? 0)
    });
  }
  return summaries;
}

async function clearPostgresTrendCollectionData() {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  await db.delete(signalsTable);
  await db.delete(collectionRunsTable);
  await db.delete(keywordSnapshotsTable);
  return { cleared: ['signals', 'collection_runs', 'keyword_snapshots'] };
}

async function savePostgresKeywordSnapshots(trends, reason = 'manual-rank') {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  const createdAt = new Date().toISOString();
  if (!trends.length) return;
  await db.insert(keywordSnapshotsTable).values(trends.map((trend) => ({
    keyword: trend.keyword,
    area: trend.area?.label ?? '',
    score: Math.round(trend.score ?? 0),
    mentions: trend.mentions ?? 0,
    sources: trend.sources ?? [],
    sampleTitles: trend.sampleTitles ?? [],
    trend,
    reason,
    createdAt
  })));
}

async function getPostgresLatestSourceStatus() {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  const latest = await db.execute(sql`
    SELECT DISTINCT ON (source)
      source, status, item_count AS "count", error, reason,
      started_at AS "startedAt", finished_at AS "finishedAt"
    FROM collection_runs
    ORDER BY source ASC, id DESC
  `);
  return Array.from(latest);
}

async function getPostgresRecentRuns(limit = 30) {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  const rows = await db.select().from(collectionRunsTable).orderBy(desc(collectionRunsTable.id)).limit(limit);
  return rows.map((row) => ({
    id: row.id,
    source: row.source,
    status: row.status,
    count: row.itemCount,
    error: row.error,
    reason: row.reason,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt
  }));
}

function rowToSignal(row) {
  const fixed = repairSignal({
    id: row.id,
    source: row.source,
    title: row.title,
    url: row.url,
    metric: row.metric,
    summary: row.summary,
    type: row.type,
    collectedAt: row.collectedAt,
    firstSeenAt: row.firstSeenAt,
    lastSeenAt: row.lastSeenAt,
    seenCount: row.seenCount,
    qualityScore: row.qualityScore,
    qualityLabel: row.qualityLabel,
    qualityReasonsJson: JSON.stringify(row.qualityReasons ?? [])
  });
  const fallback = evaluateSignalQuality(fixed);
  return {
    ...fixed,
    qualityScore: fallback.score,
    qualityLabel: fallback.label,
    qualityReasons: fallback.reasons
  };
}
