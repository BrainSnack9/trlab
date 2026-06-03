import { getBusinessDateAnalysisWindow } from '#trlab/modules/services/ranking/analysis-window';
import { getSignalWindowSummary } from '#trlab/modules/services/signals/signal-store';
import { badRequest, parseSearchParams } from '#trlab/modules/routes/validators/common';
import { signalSummaryQuerySchema } from '#trlab/modules/routes/validators/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  let query;
  try {
    query = parseSearchParams(request, signalSummaryQuerySchema);
  } catch (error) {
    return badRequest(error);
  }
  const dates = query.dates.split(',').map((item) => item.trim()).filter(Boolean);
  const windows = dates.map((date) => getBusinessDateAnalysisWindow(date)).filter(Boolean);
  return Response.json({ summaries: await getSignalWindowSummary(windows) });
}
