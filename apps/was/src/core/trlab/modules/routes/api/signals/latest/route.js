import { getLatestSignals, getLatestSourceStatus, getRecentRuns, getSignalStats } from '#trlab/modules/services/signals/signal-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return Response.json({
    signals: await getLatestSignals(),
    stats: await getSignalStats(),
    sources: await getLatestSourceStatus(),
    runs: await getRecentRuns()
  });
}
