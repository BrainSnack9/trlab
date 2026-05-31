import { getDb } from './db';
import { repairText, repairTextList } from './text-repair';

export function getTrendHistory(limit = 18) {
  const groups = getDb().prepare(`
    SELECT created_at AS createdAt, reason, COUNT(*) AS count, ROUND(AVG(score)) AS avgScore
    FROM keyword_snapshots
    GROUP BY created_at
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit);
  return groups.map((group) => ({ ...group, items: getSnapshotItems(group.createdAt) }));
}

export function getLatestTrendSnapshot({ scheduledOnly = true } = {}) {
  const where = scheduledOnly ? "WHERE reason LIKE 'scheduled-%'" : '';
  const group = getDb().prepare(`
    SELECT created_at AS createdAt, reason, COUNT(*) AS count, ROUND(AVG(score)) AS avgScore
    FROM keyword_snapshots
    ${where}
    GROUP BY created_at
    ORDER BY created_at DESC
    LIMIT 1
  `).get();

  if (!group && scheduledOnly) return getLatestTrendSnapshot({ scheduledOnly: false });
  if (!group) return null;
  return { ...group, items: getSnapshotItems(group.createdAt) };
}

function getSnapshotItems(createdAt) {
  return getDb().prepare(`
    SELECT keyword, area, score, mentions, sources_json AS sourcesJson, sample_titles_json AS sampleTitlesJson
    FROM keyword_snapshots
    WHERE created_at = ?
    ORDER BY score DESC
    LIMIT 8
  `).all(createdAt).map((row) => ({
    keyword: repairText(row.keyword),
    area: repairText(row.area),
    score: row.score,
    mentions: row.mentions,
    sources: parseJson(row.sourcesJson),
    sampleTitles: repairTextList(parseJson(row.sampleTitlesJson))
  }));
}

function parseJson(value) {
  try { return JSON.parse(value || '[]'); } catch { return []; }
}
