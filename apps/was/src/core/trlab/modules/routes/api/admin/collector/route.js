import { getCollectorRuntimeStatus, updateCollectorRuntime } from '#trlab/modules/services/admin/collector-runtime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return Response.json(getCollectorRuntimeStatus());
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const result = await updateCollectorRuntime(`${body.action ?? ''}`, body);
  if (result?.error) return Response.json(result, { status: 400 });
  return Response.json(result);
}
