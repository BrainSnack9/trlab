import { all, get } from '#trlab/libraries/storage/index';
import { repairText, repairTextList } from '#trlab/modules/helpers/text-repair';

export async function getTrendHistory(limit = 18) {
  const groups = await all(`
    SELECT created_at AS createdAt, reason, COUNT(*) AS count, ROUND(AVG(score)) AS avgScore
    FROM keyword_snapshots
    GROUP BY created_at
    ORDER BY created_at DESC
    LIMIT ?
  `, [limit]);
  return Promise.all(groups.map(async (group) => ({ ...group, items: await getSnapshotItems(group.createdAt) })));
}

export async function getLatestTrendSnapshot({ scheduledOnly = true } = {}) {
  const where = scheduledOnly ? "WHERE reason LIKE 'scheduled-%'" : '';
  const group = await get(`
    SELECT created_at AS createdAt, reason, COUNT(*) AS count, ROUND(AVG(score)) AS avgScore
    FROM keyword_snapshots
    ${where}
    GROUP BY created_at
    ORDER BY created_at DESC
    LIMIT 1
  `);

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
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
