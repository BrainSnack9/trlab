import { createContentPlan } from '@/lib/content-planner';
import { getContentPlan, listContentPlans, saveContentPlan } from '@/lib/content-plan-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  const payload = await request.json();
  if (!payload?.label && !payload?.keyword) return Response.json({ error: 'Missing candidate' }, { status: 400 });
  const refresh = new URL(request.url).searchParams.get('refresh') === '1' || payload.refresh === true;
  const cached = refresh ? null : getContentPlan(payload);
  if (cached) return Response.json({ plan: cached.plan, saved: cached, cached: true, createdAt: cached.createdAt });
  const plan = await createContentPlan(payload);
  const saved = saveContentPlan(payload, plan);
  return Response.json({ plan, saved, cached: false, createdAt: saved.createdAt });
}

export async function GET() {
  return Response.json({ plans: listContentPlans() });
}
