import { createContentPlan } from '#trlab/modules/services/content/content-planner';
import { getContentPlan, listContentPlans, saveContentPlan } from '#trlab/modules/services/content/content-plan-store';
import { badRequest, parseJsonBody } from '#trlab/modules/routes/validators/common';
import { contentPlanBodySchema } from '#trlab/modules/routes/validators/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  let payload;
  try {
    payload = await parseJsonBody(request, contentPlanBodySchema);
  } catch (error) {
    return badRequest(error);
  }
  const refresh = new URL(request.url).searchParams.get('refresh') === '1' || payload.refresh === true;
  let cached = null;
  try {
    cached = refresh ? null : await getContentPlan(payload);
  } catch {
    cached = null;
  }
  if (cached) return Response.json({ plan: cached.plan, saved: cached, cached: true, createdAt: cached.createdAt });
  const plan = await createContentPlan(payload);
  try {
    const saved = await saveContentPlan(payload, plan);
    return Response.json({ plan, saved, cached: false, createdAt: saved.createdAt });
  } catch (error) {
    return Response.json({
      plan,
      saved: null,
      cached: false,
      warning: error instanceof Error ? error.message : 'content plan save failed'
    });
  }
}

export async function GET() {
  return Response.json({ plans: await listContentPlans() });
}
