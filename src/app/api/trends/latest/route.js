import { getLatestTrendSnapshot } from '@/lib/trend-history';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const scheduledOnly = params.has('scheduled') ? params.get('scheduled') !== '0' : false;
  return Response.json({ snapshot: getLatestTrendSnapshot({ scheduledOnly }) });
}
