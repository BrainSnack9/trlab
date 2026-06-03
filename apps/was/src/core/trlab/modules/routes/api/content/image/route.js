import { generateCardNewsImage, makeImagePrompt } from '#trlab/modules/services/content/card-image-generator';
import { listContentImages, saveContentImageResult } from '#trlab/modules/services/content/content-image-store';
import { badRequest, parseJsonBody } from '#trlab/modules/routes/validators/common';
import { contentImageBodySchema } from '#trlab/modules/routes/validators/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  const url = new URL(request.url);
  const planId = url.searchParams.get('planId') ?? '';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 60) || 60, 1), 100);
  return Response.json({ images: await listContentImages({ planId, limit }) });
}

export async function POST(request) {
  try {
    const payload = await parseJsonBody(request, contentImageBodySchema);
    if (payload.preview === true) {
      return Response.json({ prompt: makeImagePrompt(payload) });
    }
    const image = await generateCardNewsImage(payload);
    const savedImage = await saveContentImageResult(payload, image);
    return Response.json({ image: savedImage.image, record: savedImage, generatedAt: savedImage.createdAt });
  } catch (error) {
    if (error?.name === 'ZodError') return badRequest(error);
    return Response.json({
      error: 'card_image_failed',
      message: error instanceof Error ? error.message : '이미지 생성 실패'
    }, { status: 500 });
  }
}
