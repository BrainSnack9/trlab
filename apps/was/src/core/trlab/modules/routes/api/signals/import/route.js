import { saveCollectionResult } from '#trlab/modules/services/signals/signal-store';
import { badRequest, parseJsonBody } from '#trlab/modules/routes/validators/common';
import { importSignalsBodySchema } from '#trlab/modules/routes/validators/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  let body;
  try {
    body = await parseJsonBody(request, importSignalsBodySchema);
  } catch (error) {
    return badRequest(error);
  }
  const startedAt = body.startedAt ?? new Date().toISOString();
  const finishedAt = body.finishedAt ?? new Date().toISOString();
  const payload = {
    source: body.source ?? 'Manual Import',
    status: body.status ?? 'ok',
    error: body.error ?? '',
    items: body.items ?? []
  };
  await saveCollectionResult({ payloads: [payload], startedAt, finishedAt, reason: body.reason ?? 'browser-import' });
  return Response.json({ ok: true, source: payload.source, count: payload.items.length });
}
