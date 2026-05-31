import { getDb } from './db';
import { evaluateSignalQuality } from './signal-quality';
import { repairObjectText } from './text-repair';

export function saveCollectionResult({ payloads, startedAt, finishedAt, reason = 'manual' }) {
  const database = getDb();
  const insertRun = database.prepare(`
    INSERT INTO collection_runs (source, status, item_count, error, reason, started_at, finished_at)
    VALUES (@source, @status, @item_count, @error, @reason, @started_at, @finished_at)
  `);
  const upsertSignal = database.prepare(`
    INSERT INTO signals (
      id, source, title, url, metric, summary, type,
      first_seen_at, last_seen_at, collected_at, seen_count,
      quality_score, quality_label, quality_reasons_json
    )
    VALUES (
      @id, @source, @title, @url, @metric, @summary, @type,
      @collectedAt, @collectedAt, @collectedAt, 1,
      @qualityScore, @qualityLabel, @qualityReasonsJson
    )
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
  `);

  const transaction = database.transaction(() => {
    payloads.forEach((payload) => {
      insertRun.run({
        source: payload.source,
        status: payload.status,
        item_count: payload.items?.length ?? 0,
        error: payload.error ?? '',
        reason,
        started_at: startedAt,
        finished_at: finishedAt
      });

      (payload.items ?? []).map(repairSignal).filter((signal) => evaluateSignalQuality(signal).storable).forEach((signal) => {
        const quality = evaluateSignalQuality(signal);
        upsertSignal.run({
          ...signal,
          metric: signal.metric ?? '',
          summary: signal.summary ?? '',
          type: signal.type ?? '',
          qualityScore: quality.score,
          qualityLabel: quality.label,
          qualityReasonsJson: JSON.stringify(quality.reasons),
          collectedAt: signal.collectedAt ?? finishedAt
        });
      });
    });
  });

  transaction();
}

export function getLatestSignals(limit = 500) {
  const rows = getDb()
    .prepare(`
      SELECT id, source, title, url, metric, summary, type, collected_at AS collectedAt,
             first_seen_at AS firstSeenAt, last_seen_at AS lastSeenAt, seen_count AS seenCount,
             quality_score AS qualityScore, quality_label AS qualityLabel,
             quality_reasons_json AS qualityReasonsJson
      FROM signals
      ORDER BY last_seen_at DESC
      LIMIT ?
    `)
    .all(limit);

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

export function getSignalStats() {
  return getDb().prepare('SELECT COUNT(*) AS total FROM signals').get();
}
function repairSignal(signal) { return repairObjectText(signal, ['title', 'summary', 'metric', 'qualityLabel']); }

export function saveKeywordSnapshots(trends, reason = 'manual-rank') {
  const database = getDb();
  const createdAt = new Date().toISOString();
  const insert = database.prepare(`
    INSERT INTO keyword_snapshots (
      keyword, area, score, mentions, sources_json, sample_titles_json, reason, created_at
    )
    VALUES (@keyword, @area, @score, @mentions, @sources_json, @sample_titles_json, @reason, @created_at)
  `);

  const transaction = database.transaction(() => {
    trends.forEach((trend) => {
      insert.run({
        keyword: trend.keyword,
        area: trend.area?.label ?? '',
        score: Math.round(trend.score ?? 0),
        mentions: trend.mentions ?? 0,
        sources_json: JSON.stringify(trend.sources ?? []),
        sample_titles_json: JSON.stringify(trend.sampleTitles ?? []),
        reason,
        created_at: createdAt
      });
    });
  });

  transaction();
}

export function getLatestSourceStatus() {
  return getDb()
    .prepare(`
      SELECT source, status, item_count AS count, error, reason,
             started_at AS startedAt, finished_at AS finishedAt
      FROM collection_runs
      WHERE id IN (
        SELECT MAX(id)
        FROM collection_runs
        GROUP BY source
      )
      ORDER BY source ASC
    `)
    .all();
}

export function getRecentRuns(limit = 30) {
  return getDb()
    .prepare(`
      SELECT id, source, status, item_count AS count, error, reason,
             started_at AS startedAt, finished_at AS finishedAt
      FROM collection_runs
      ORDER BY id DESC
      LIMIT ?
    `)
    .all(limit);
}
