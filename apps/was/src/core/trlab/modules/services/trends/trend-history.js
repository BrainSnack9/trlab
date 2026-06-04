import { all, get } from '#trlab/libraries/storage/index';
import { and, desc, eq, gte, like, lt, or, sql } from 'drizzle-orm';
import { getPostgresClient } from '#trlab/libraries/storage/postgres';
import { ensurePostgresSchema, keywordSnapshotsTable } from '#trlab/libraries/storage/postgres-schema';
import { shouldUseSupabaseDatabase } from '#trlab/modules/configs/env';
import { getBusinessDateAnalysisWindow } from '#trlab/modules/services/ranking/analysis-window';
import { repairText, repairTextList } from '#trlab/modules/helpers/text-repair';

export async function getTrendHistory(limit = 18) {
  if (shouldUseSupabaseDatabase()) return getPostgresTrendHistory(limit);
  const groups = await all(`
    SELECT created_at AS createdAt, reason, COUNT(*) AS count, ROUND(AVG(score)) AS avgScore
    FROM keyword_snapshots
    GROUP BY created_at
    ORDER BY created_at DESC
    LIMIT ?
  `, [limit]);
  return Promise.all(groups.map(async (group) => ({ ...group, items: await getSnapshotItems(group.createdAt) })));
}

export async function getLatestTrendSnapshot({ scheduledOnly = true, analysisDate } = {}) {
  if (shouldUseSupabaseDatabase()) return getPostgresLatestTrendSnapshot({ scheduledOnly, analysisDate });
  const window = analysisDate ? getBusinessDateAnalysisWindow(analysisDate) : null;
  const filters = [
    scheduledOnly ? "reason LIKE 'scheduled-%'" : '',
    window ? '(reason LIKE ? OR (created_at >= ? AND created_at < ?))' : ''
  ].filter(Boolean);
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const values = window ? [`%-${analysisDate}`, window.from, window.to] : [];
  const group = await get(`
    SELECT created_at AS createdAt, reason, COUNT(*) AS count, ROUND(AVG(score)) AS avgScore
    FROM keyword_snapshots
    ${where}
    GROUP BY created_at
    ORDER BY created_at DESC
    LIMIT 1
  `, values);

  if (!group && analysisDate) return null;
  if (!group && scheduledOnly) return getLatestTrendSnapshot({ scheduledOnly: false });
  if (!group) return null;
  return { ...group, items: await getSnapshotItems(group.createdAt) };
}

async function getSnapshotItems(createdAt) {
  const rows = await all(`
    SELECT keyword, area, score, mentions, sources_json AS sourcesJson, sample_titles_json AS sampleTitlesJson,
           trend_json AS trendJson
    FROM keyword_snapshots
    WHERE created_at = ?
  `, [createdAt]);
  return rows.map((row) => {
    const trend = parseJsonObject(row.trendJson);
    return {
      ...trend,
      keyword: repairText(trend.keyword ?? row.keyword),
      label: repairText(trend.label ?? trend.keyword ?? row.keyword),
      area: trend.area ?? repairText(row.area),
      score: trend.score ?? row.score,
      mentions: trend.mentions ?? row.mentions,
      sources: trend.sources ?? parseJson(row.sourcesJson),
      sampleTitles: repairTextList(trend.sampleTitles ?? parseJson(row.sampleTitlesJson))
    };
  }).sort(sortSnapshotItems).slice(0, 8);
}

async function getPostgresTrendHistory(limit = 18) {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  const groups = await db
    .select({
      createdAt: keywordSnapshotsTable.createdAt,
      reason: keywordSnapshotsTable.reason,
      count: sql`count(*)`,
      avgScore: sql`round(avg(${keywordSnapshotsTable.score}))`
    })
    .from(keywordSnapshotsTable)
    .groupBy(keywordSnapshotsTable.createdAt, keywordSnapshotsTable.reason)
    .orderBy(desc(keywordSnapshotsTable.createdAt))
    .limit(limit);
  return Promise.all(groups.map(async (group) => ({
    ...group,
    count: Number(group.count ?? 0),
    avgScore: Number(group.avgScore ?? 0),
    items: await getPostgresSnapshotItems(group.createdAt)
  })));
}

async function getPostgresLatestTrendSnapshot({ scheduledOnly = true, analysisDate } = {}) {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  const window = analysisDate ? getBusinessDateAnalysisWindow(analysisDate) : null;
  const clauses = [
    scheduledOnly ? like(keywordSnapshotsTable.reason, 'scheduled-%') : null,
    window ? or(
      like(keywordSnapshotsTable.reason, `%-${analysisDate}`),
      and(gte(keywordSnapshotsTable.createdAt, window.from), lt(keywordSnapshotsTable.createdAt, window.to))
    ) : null
  ].filter(Boolean);
  const base = db
    .select({
      createdAt: keywordSnapshotsTable.createdAt,
      reason: keywordSnapshotsTable.reason,
      count: sql`count(*)`,
      avgScore: sql`round(avg(${keywordSnapshotsTable.score}))`
    })
    .from(keywordSnapshotsTable);
  const query = clauses.length ? base.where(clauses.length > 1 ? and(...clauses) : clauses[0]) : base;
  const rows = await query.groupBy(keywordSnapshotsTable.createdAt, keywordSnapshotsTable.reason).orderBy(desc(keywordSnapshotsTable.createdAt)).limit(1);
  const group = rows[0];
  if (!group && analysisDate) return null;
  if (!group && scheduledOnly) return getPostgresLatestTrendSnapshot({ scheduledOnly: false });
  if (!group) return null;
  return {
    ...group,
    count: Number(group.count ?? 0),
    avgScore: Number(group.avgScore ?? 0),
    items: await getPostgresSnapshotItems(group.createdAt)
  };
}

async function getPostgresSnapshotItems(createdAt) {
  const db = getPostgresClient();
  const rows = await db.select().from(keywordSnapshotsTable).where(eq(keywordSnapshotsTable.createdAt, createdAt));
  return rows.map((row) => {
    const trend = parseJsonObject(row.trend);
    return {
      ...trend,
      keyword: repairText(trend.keyword ?? row.keyword),
      label: repairText(trend.label ?? trend.keyword ?? row.keyword),
      area: trend.area ?? repairText(row.area),
      score: trend.score ?? row.score,
      mentions: trend.mentions ?? row.mentions,
      sources: trend.sources ?? (Array.isArray(row.sources) ? row.sources : []),
      sampleTitles: repairTextList(trend.sampleTitles ?? (Array.isArray(row.sampleTitles) ? row.sampleTitles : []))
    };
  }).sort(sortSnapshotItems).slice(0, 8);
}

function sortSnapshotItems(a, b) {
  return getCommunityPriority(b) - getCommunityPriority(a)
    || getProductionScore(b) - getProductionScore(a)
    || (b.score ?? 0) - (a.score ?? 0);
}

function getProductionScore(item) {
  return item.production?.score ?? item.aiAnalysis?.finalScore ?? item.score ?? 0;
}

function getCommunityPriority(item) {
  const reaction = item.scoring?.communityReaction ?? 0;
  const hasCommunity = item.evidence?.some((evidence) => evidence.source && evidence.source !== 'Search SERP' && evidence.source !== 'Google Trends')
    || item.sources?.some((source) => source !== 'Search SERP' && source !== 'Google Trends');
  return reaction + (hasCommunity ? 20 : -20);
}

function parseJson(value) {
  try { return JSON.parse(value || '[]'); } catch { return []; }
}

function parseJsonObject(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value || '{}') : value;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
