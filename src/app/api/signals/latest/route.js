import { getLatestSignals, getLatestSourceStatus, getRecentRuns, getSignalStats } from '@/lib/signal-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return Response.json({
    signals: getLatestSignals(),
    stats: getSignalStats(),
    sources: getLatestSourceStatus(),
    runs: getRecentRuns()
  });
}
