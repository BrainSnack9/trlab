import { saveCollectionResult } from '@/lib/signal-store';
import { collectorMap, sourceNames } from '@/lib/signal-collectors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const startedAt = new Date().toISOString();
  const params = new URL(request.url).searchParams;
  const source = params.get('source');
  const reason = params.get('reason') ?? (source ? 'single-source' : 'manual');
  const excluded = new Set((params.get('exclude') ?? '').split(',').filter(Boolean));
  const context = { areas: (params.get('areas') ?? '').split(',').filter(Boolean) };
  const entries = source && collectorMap[source]
    ? [[source, collectorMap[source]]]
    : Object.entries(collectorMap).filter(([id]) => !excluded.has(id));
  const settled = await Promise.allSettled(entries.map(([, collector]) => collector(context)));
  const payloads = settled.map((result, index) => normalizeResult(result, entries[index][0]));
  const signals = payloads.flatMap((payload) => payload.items);
  const finishedAt = new Date().toISOString();
  saveCollectionResult({ payloads, startedAt, finishedAt, reason });
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
