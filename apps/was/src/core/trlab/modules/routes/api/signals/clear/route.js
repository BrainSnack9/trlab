import { clearTrendCollectionData } from '#trlab/modules/services/signals/signal-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const result = await clearTrendCollectionData();
  return Response.json({
    ok: true,
    clearedAt: new Date().toISOString(),
    cleared: result.cleared
  });
}
