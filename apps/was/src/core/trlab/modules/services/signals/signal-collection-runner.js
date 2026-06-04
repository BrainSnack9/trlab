import { saveCollectionResult } from '#trlab/modules/services/signals/signal-store';
import { collectorMap, sourceNames } from '#trlab/modules/services/signals/signal-collectors';

export async function collectSignalsOnce({
  source,
  reason = 'manual',
  exclude = '',
  areas = [],
  profiles = [],
  onProgress
} = {}) {
  const startedAt = new Date().toISOString();
  const excluded = new Set(`${exclude ?? ''}`.split(',').filter(Boolean));
  const context = { areas, profiles };
  const entries = source && collectorMap[source]
    ? [[source, collectorMap[source]]]
    : Object.entries(collectorMap).filter(([id]) => !excluded.has(id));

  onProgress?.({ type: 'collecting', status: 'running', totalSources: entries.length });
  const settled = await Promise.allSettled(entries.map(([id, collector]) => collectSource(id, collector, context, onProgress)));
  const payloads = settled.map((result, index) => normalizeResult(result, entries[index][0]));
  const signals = payloads.flatMap((payload) => payload.items);
  const finishedAt = new Date().toISOString();

  onProgress?.({ type: 'saving', status: 'running', count: signals.length, totalSources: payloads.length });
  await saveCollectionResult({ payloads, startedAt, finishedAt, reason });
  onProgress?.({ type: 'saved', status: 'ok', count: signals.length, totalSources: payloads.length });

  return {
    startedAt,
    finishedAt,
    count: signals.length,
    areas: context.areas,
    profiles: context.profiles,
    sources: payloads.map(({ source: name, status, error, items }) => ({ source: name, status, error, count: items.length })),
    signals
  };
}

async function collectSource(id, collector, context, onProgress) {
  const sourceName = sourceNames[id] ?? id;
  const startedAt = new Date().toISOString();
  onProgress?.({ type: 'source-started', status: 'running', source: sourceName, startedAt });
  try {
    const result = await collector(context);
    onProgress?.({ type: 'source-finished', status: 'ok', source: result.source ?? sourceName, count: result.items?.length ?? 0, startedAt, finishedAt: new Date().toISOString() });
    return result;
  } catch (error) {
    onProgress?.({ type: 'source-failed', status: 'failed', source: sourceName, error: error.message, startedAt, finishedAt: new Date().toISOString() });
    throw error;
  }
}

function normalizeResult(result, sourceId) {
  if (result.status === 'fulfilled') return result.value;
  return {
    source: sourceNames[sourceId],
    status: 'failed',
    error: result.reason?.message ?? 'Unknown error',
    items: []
  };
}
