import { getTrendHistory } from '#trlab/modules/services/trends/trend-history';
import { badRequest, parseSearchParams } from '#trlab/modules/routes/validators/common';
import { trendHistoryQuerySchema } from '#trlab/modules/routes/validators/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const { limit } = parseSearchParams(request, trendHistoryQuerySchema);
    return Response.json({ history: await getTrendHistory(limit) });
  } catch (error) {
    return badRequest(error);
  }
}
