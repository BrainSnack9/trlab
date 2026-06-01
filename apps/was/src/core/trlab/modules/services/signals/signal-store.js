import { all, get, write } from '#trlab/libraries/storage/index';
import { evaluateSignalQuality } from './signal-quality.js';
import { repairObjectText } from '#trlab/modules/helpers/text-repair';

export async function saveCollectionResult({ payloads, startedAt, finishedAt, reason = 'manual' }) {
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

export async function getSignalStats() {
  return get('SELECT COUNT(*) AS total FROM signals');
}
function repairSignal(signal) { return repairObjectText(signal, ['title', 'summary', 'metric', 'qualityLabel']); }

export async function saveKeywordSnapshots(trends, reason = 'manual-rank') {
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
  return all(`
      SELECT id, source, status, item_count AS count, error, reason,
             started_at AS startedAt, finished_at AS finishedAt
      FROM collection_runs
      ORDER BY id DESC
      LIMIT ?
    `, [limit]);
}
