import { assistPlanningStage } from '#trlab/modules/services/content/planning-assistant';
import { badRequest } from '#trlab/modules/routes/validators/common';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return badRequest(error);
  }

  try {
    const result = await assistPlanningStage(payload);
    return Response.json(result);
  } catch (error) {
    return badRequest(error);
  }
}
