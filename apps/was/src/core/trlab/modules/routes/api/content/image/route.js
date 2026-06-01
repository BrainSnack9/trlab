import { generateCardNewsImage } from '#trlab/modules/services/content/card-image-generator';
import { badRequest, parseJsonBody } from '#trlab/modules/routes/validators/common';
import { contentImageBodySchema } from '#trlab/modules/routes/validators/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const payload = await parseJsonBody(request, contentImageBodySchema);
    const image = await generateCardNewsImage(payload);
    return Response.json({ image, generatedAt: new Date().toISOString() });
  } catch (error) {
    if (error?.name === 'ZodError') return badRequest(error);
    return Response.json({
      error: 'card_image_failed',
      message: error instanceof Error ? error.message : '이미지 생성 실패'
    }, { status: 500 });
  }
}
