import { getLatestTrendSnapshot } from '#trlab/modules/services/trends/trend-history';
import { badRequest, parseSearchParams } from '#trlab/modules/routes/validators/common';
import { latestTrendQuerySchema } from '#trlab/modules/routes/validators/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  let params;
  try {
    params = parseSearchParams(request, latestTrendQuerySchema);
  } catch (error) {
    return badRequest(error);
  }
  const scheduledOnly = params.scheduled ? params.scheduled !== '0' : false;
  return Response.json({ snapshot: await getLatestTrendSnapshot({ scheduledOnly, analysisDate: params.analysisDate }) });
}
