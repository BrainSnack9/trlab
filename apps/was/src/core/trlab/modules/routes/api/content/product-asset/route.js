import { generateProductAsset, makeProductAssetPrompt } from '#trlab/modules/services/content/product-asset-generator';
import { badRequest, parseJsonBody } from '#trlab/modules/routes/validators/common';
import { contentProductAssetBodySchema } from '#trlab/modules/routes/validators/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const payload = await parseJsonBody(request, contentProductAssetBodySchema);
    if (payload.preview === true) {
      return Response.json({ prompt: makeProductAssetPrompt(payload) });
    }
    return Response.json(await generateProductAsset(payload));
  } catch (error) {
    if (error?.name === 'ZodError') return badRequest(error);
    return Response.json({
      error: 'product_asset_failed',
      message: error instanceof Error ? error.message : '제품 이미지 처리 실패'
    }, { status: 500 });
  }
}
