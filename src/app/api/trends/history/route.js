import { getTrendHistory } from '@/lib/trend-history';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const limit = Number(new URL(request.url).searchParams.get('limit') ?? 18);
  return Response.json({ history: getTrendHistory(Math.min(60, limit)) });
}
