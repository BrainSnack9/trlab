import { generateCardNewsImage } from '@/lib/card-image-generator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const payload = await request.json();
    if (!payload?.card || !payload?.studio) {
      return Response.json({ error: 'Missing card or studio' }, { status: 400 });
    }
    const image = await generateCardNewsImage(payload);
    return Response.json({ image, generatedAt: new Date().toISOString() });
  } catch (error) {
    return Response.json({
      error: 'card_image_failed',
      message: error instanceof Error ? error.message : '이미지 생성 실패'
    }, { status: 500 });
  }
}
