import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tryGenerateRemoteImage } from './image-provider-clients.js';
import { cleanPexelsQuery, searchPexelsPhoto } from './pexels-client.js';

const outputDir = path.join(process.cwd(), 'public', 'generated', 'product-assets');

export async function generateProductAsset({ mode = 'search', query = '', product = {}, card = {}, studio = {} } = {}) {
  const cleanQuery = productAssetQuery({ query, product, card, studio });
  const result = mode === 'generate'
    ? await generateAiProductAsset({ query: cleanQuery, product, card, studio })
    : await searchProductAsset(cleanQuery);
  await mkdir(outputDir, { recursive: true });
  const filename = `${safeName(cleanQuery || product?.name || card?.title || 'product')}-${Date.now()}.${result.ext}`;
  await writeFile(path.join(outputDir, filename), result.buffer);
  return {
    asset: {
      url: `/generated/product-assets/${filename}`,
      provider: result.provider,
      model: result.model,
      prompt: result.prompt,
      sourceImage: result.source,
      query: cleanQuery,
      warnings: result.warnings ?? []
    }
  };
}

export function makeProductAssetPrompt({ query = '', product = {}, card = {}, studio = {} } = {}) {
  const name = cleanText(product.name || query || card.title || 'recommended product', 120);
  const description = cleanText(product.description || product.role || card.emphasis || card.body || '', 240);
  const topic = cleanText([studio?.label, studio?.keyword, card?.title].filter(Boolean).join(' / '), 180);
  return [
    'Create one isolated product cutout image for a Korean Instagram carousel editor.',
    'The image should show a single clean product object only, centered, high-end catalog lighting, no hands, no people, no readable labels, no brand logos, no text, no watermark.',
    'Use a transparent background if the model supports it; otherwise use a pure white background with soft natural shadow so the editor can place it on a card.',
    `Product object: ${name}.`,
    description ? `Product cue: ${description}.` : '',
    topic ? `Content context: ${topic}.` : '',
    'Avoid packaging text, fake brand marks, cluttered shelves, screenshots, social UI, charts, labels, and multiple products.'
  ].filter(Boolean).join('\n');
}

async function searchProductAsset(query) {
  const key = process.env.PEXELS_API_KEY;
  const cleanQuery = cleanPexelsQuery(query, 90);
  if (!key) throw new Error('PEXELS_API_KEY가 설정되지 않았습니다.');
  if (!cleanQuery) throw new Error('제품 검색어가 비어 있습니다.');
  const photo = await searchPexelsPhoto(cleanQuery, { key, orientation: 'square' });
  const imageUrl = photo?.src?.large2x || photo?.src?.large || photo?.src?.portrait || photo?.src?.medium;
  if (!imageUrl) throw new Error('Pexels 제품 이미지 결과가 비어 있습니다.');
  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Pexels product image download ${response.status}`);
  return {
    provider: 'pexels',
    model: 'pexels-product-search',
    ext: 'jpg',
    buffer: Buffer.from(await response.arrayBuffer()),
    prompt: cleanQuery,
    source: {
      id: photo.id,
      query: cleanQuery,
      url: photo.url,
      imageUrl,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      avgColor: photo.avg_color,
      width: photo.width,
      height: photo.height,
      alt: photo.alt
    },
    warnings: [`Pexels photo used: ${photo.photographer || 'unknown photographer'}${photo.url ? ` (${photo.url})` : ''}`]
  };
}

async function generateAiProductAsset({ query, product, card, studio }) {
  const prompt = makeProductAssetPrompt({ query, product, card, studio });
  const { image, errors } = await tryGenerateRemoteImage(prompt);
  if (!image) {
    throw new Error(`제품 이미지 생성이 필요합니다. ${errors.length ? errors.join(' | ') : '사용 가능한 이미지 provider가 없습니다.'}`);
  }
  return {
    ...image,
    prompt,
    warnings: errors
  };
}

function productAssetQuery({ query = '', product = {}, card = {}, studio = {} } = {}) {
  const raw = query || product.searchQuery || product.name || product.label || card?.visualBrief?.pexelsQuery || [studio?.label, card?.title, 'product photo'].filter(Boolean).join(' ');
  return cleanText(raw, 100);
}

function cleanText(value, maxLength = 1000) {
  return `${value ?? ''}`.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function safeName(value) {
  return `${value ?? 'product'}`
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70) || 'product';
}
