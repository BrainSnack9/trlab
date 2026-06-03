import { getDatabaseStatus, migrateSqliteToPostgres, resetRuntimeDatabase } from '#trlab/modules/services/admin/db-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return Response.json(await getDatabaseStatus());
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const action = `${body.action ?? ''}`;
  if (action === 'reset-runtime') {
    if (body.confirm !== 'RESET') {
      return Response.json({ error: 'confirmation_required', message: 'RESET 확인 문구가 필요합니다.' }, { status: 400 });
    }
    return Response.json({ action, result: await resetRuntimeDatabase() });
  }
  if (action === 'migrate-sqlite') {
    return Response.json({ action, result: await migrateSqliteToPostgres({ replaceRuntime: body.replaceRuntime !== false }) });
  }
  return Response.json({ error: 'invalid_action', message: '지원하지 않는 DB 작업입니다.' }, { status: 400 });
}
