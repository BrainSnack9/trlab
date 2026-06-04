import { deleteCandidateFeedback, getCandidateFeedbackSummary, saveCandidateFeedback } from '#trlab/modules/services/ranking/candidate-feedback';
import { candidateFeedbackBodySchema } from '#trlab/modules/routes/validators/schemas';
import { badRequest } from '#trlab/modules/routes/validators/common';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return Response.json({ feedback: await getCandidateFeedbackSummary() });
}

export async function POST(request) {
  try {
    const body = candidateFeedbackBodySchema.parse(await request.json());
    const feedback = await saveCandidateFeedback(body);
    return Response.json({ ok: true, feedback });
  } catch (error) {
    if (error?.name === 'ZodError') return badRequest(error);
    return Response.json({
      error: 'candidate_feedback_failed',
      message: error instanceof Error ? error.message : '피드백 저장에 실패했습니다.'
    }, { status: 500 });
  }
}

export async function DELETE(request) {
  const candidateId = new URL(request.url).searchParams.get('candidateId');
  if (!candidateId) return Response.json({ error: 'missing_candidate_id', message: 'Missing candidate id' }, { status: 400 });
  return Response.json(await deleteCandidateFeedback({ candidateId }));
}
