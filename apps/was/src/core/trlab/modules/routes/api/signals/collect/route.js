import { collectSignalsOnce } from '#trlab/modules/services/signals/signal-collection-runner';
import { badRequest, parseSearchParams } from '#trlab/modules/routes/validators/common';
import { collectSignalsQuerySchema } from '#trlab/modules/routes/validators/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  let query;
  try {
    query = parseSearchParams(request, collectSignalsQuerySchema);
  } catch (error) {
    return badRequest(error);
  }
  return Response.json(await collectSignalsOnce({
    source: query.source,
    reason: query.reason ?? (query.source ? 'single-source' : 'manual'),
    exclude: query.exclude,
    areas: query.areas.split(',').filter(Boolean),
    profiles: query.profiles.split(',').filter(Boolean)
  }));
}
