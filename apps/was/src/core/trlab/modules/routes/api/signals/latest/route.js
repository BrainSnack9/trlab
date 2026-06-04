import { getBusinessDateAnalysisWindow } from '#trlab/modules/services/ranking/analysis-window';
import { getLatestSignals, getLatestSourceStatus, getRecentRuns, getSignalsForAnalysis, getSignalStats, getSignalWindowSummary } from '#trlab/modules/services/signals/signal-store';
import { badRequest, parseSearchParams } from '#trlab/modules/routes/validators/common';
import { latestSignalsQuerySchema } from '#trlab/modules/routes/validators/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  let query;
  try {
    query = parseSearchParams(request, latestSignalsQuerySchema);
  } catch (error) {
    return badRequest(error);
  }

  const window = query.analysisDate ? getBusinessDateAnalysisWindow(query.analysisDate) : null;
  const signals = window
    ? await getSignalsForAnalysis({ limit: query.limit, since: window.from, until: window.to })
    : await getLatestSignals(query.limit);
  const summaries = window ? await getSignalWindowSummary([window]) : [];
  const stats = window
    ? { total: summaries[0]?.count ?? signals.length, analysisWindow: window }
    : await getSignalStats();

  return Response.json({
    signals,
    stats,
    sources: await getLatestSourceStatus(),
    runs: await getRecentRuns()
  });
}
