import { recommendTemplates } from '#trlab/modules/services/content/template-recommender';
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
  const topic = `${payload?.topic ?? ''}`.trim();
  if (!topic) return badRequest(new Error('topic is required'));
  const result = await recommendTemplates({
    topic,
    audience: payload?.audience,
    goal: payload?.goal
  });
  return Response.json(result);
}
