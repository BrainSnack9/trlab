import { saveCollectionResult } from '#trlab/modules/services/signals/signal-store';
import { collectorMap, sourceNames } from '#trlab/modules/services/signals/signal-collectors';
import { badRequest, parseSearchParams } from '#trlab/modules/routes/validators/common';
import { collectSignalsQuerySchema } from '#trlab/modules/routes/validators/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const startedAt = new Date().toISOString();
  let query;
  try {
    query = parseSearchParams(request, collectSignalsQuerySchema);
  } catch (error) {
    return badRequest(error);
  }
  const source = query.source;
  const reason = query.reason ?? (source ? 'single-source' : 'manual');
  const excluded = new Set(query.exclude.split(',').filter(Boolean));
  const context = { areas: query.areas.split(',').filter(Boolean) };
  const entries = source && collectorMap[source]
    ? [[source, collectorMap[source]]]
    : Object.entries(collectorMap).filter(([id]) => !excluded.has(id));
  const settled = await Promise.allSettled(entries.map(([, collector]) => collector(context)));
  const payloads = settled.map((result, index) => normalizeResult(result, entries[index][0]));
  const signals = payloads.flatMap((payload) => payload.items);
  const finishedAt = new Date().toISOString();
  await saveCollectionResult({ payloads, startedAt, finishedAt, reason });
  return Response.json({
    startedAt,
    finishedAt,
    count: signals.length,
    areas: context.areas,
    sources: payloads.map(({ source: name, status, error, items }) => ({ source: name, status, error, count: items.length })),
    signals
  });
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
