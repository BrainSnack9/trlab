import { deleteChannelProfile, getChannelProfiles, saveChannelProfile } from '#trlab/modules/services/channel-profiles/channel-profiles';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return Response.json({ profiles: await getChannelProfiles() });
}

export async function POST(request) {
  const profile = await saveChannelProfile(await request.json());
  return Response.json({ profile });
}

export async function DELETE(request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'missing_id', message: 'Missing profile id' }, { status: 400 });
  return Response.json({ deleted: await deleteChannelProfile(id) });
}
