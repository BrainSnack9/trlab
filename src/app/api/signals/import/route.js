import { saveCollectionResult } from '@/lib/signal-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  const body = await request.json();
  const startedAt = body.startedAt ?? new Date().toISOString();
  const finishedAt = body.finishedAt ?? new Date().toISOString();
  const payload = {
    source: body.source ?? 'Manual Import',
    status: body.status ?? 'ok',
    error: body.error ?? '',
    items: body.items ?? []
  };
  saveCollectionResult({ payloads: [payload], startedAt, finishedAt, reason: body.reason ?? 'browser-import' });
  return Response.json({ ok: true, source: payload.source, count: payload.items.length });
}
