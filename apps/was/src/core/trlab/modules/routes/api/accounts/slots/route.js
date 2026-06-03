import { getAccountSlots, saveAccountSlots } from '#trlab/modules/services/accounts/account-slots';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return Response.json({ slots: await getAccountSlots() });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  return Response.json({ slots: await saveAccountSlots(body.slots ?? []) });
}
