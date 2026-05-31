import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { cardTextLines } from './card-text';
import { tryGenerateRemoteImage } from './image-provider-clients';

const outputDir = path.join(process.cwd(), 'public', 'generated', 'cardnews');

export async function generateCardNewsImage({ studio, plan, card, style, index }) {
  const prompt = makeImagePrompt({ studio, plan, card, style });
  const { image, errors } = await tryGenerateRemoteImage(prompt);
  const finalImage = image ?? generateLocalCard({ studio, card, style }, errors);
  await mkdir(outputDir, { recursive: true });
  const filename = `${safeName(studio?.label)}-${String((index ?? 0) + 1).padStart(2, '0')}-${Date.now()}.${finalImage.ext}`;
  await writeFile(path.join(outputDir, filename), finalImage.buffer);
  return { provider: finalImage.provider, model: finalImage.model, prompt, url: `/generated/cardnews/${filename}`, warnings: errors };
}

function makeImagePrompt({ studio, plan, card, style }) {
  const styleName = style?.name ?? '정보형 카드뉴스';
  const traits = [style?.desc, style?.bg, style?.accent, style?.sub].filter(Boolean).join(', ');
  return [
    'Create a premium square Instagram information carousel card in Korean.',
    'Design like Korean finance, real-estate, and trend info accounts: bold headline, dense infographic, strong grid, editorial poster quality.',
    'Keep Korean typography crisp and legible. If text rendering is uncertain, leave clean blank panels for text overlay.',
    `Style preset: ${styleName}. Traits: ${traits}.`,
    `Topic: ${studio?.label ?? studio?.keyword ?? 'TrLab insight'}.`,
    `Core angle: ${plan?.coreAngle ?? plan?.summary ?? ''}.`,
    `Title: ${card?.title ?? ''}.`,
    `Body: ${card?.body ?? ''}.`,
    `Emphasis: ${card?.emphasis ?? ''}.`,
    `Evidence/data point: ${card?.dataPoint ?? card?.visualPrompt ?? ''}.`,
    'Avoid watermarks, fake UI chrome, random English filler, and generic stock-photo composition.'
  ].join('\n');
}

function generateLocalCard({ studio, card, style }, errors) {
  const s = style ?? { bg: '#f8fafc', ink: '#0f172a', accent: '#dc2626', sub: '#2563eb' };
  const body = cardTextLines(card?.body, 24, 5);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080">
<rect width="1080" height="1080" fill="${s.bg}"/>
<rect x="44" y="44" width="992" height="992" rx="26" fill="#fff" stroke="#0f172a" stroke-width="5"/>
<text x="80" y="118" font-family="Pretendard, Arial" font-size="28" font-weight="900" fill="${s.sub}">TrLab Insight #${card?.page ?? 1}</text>
<text x="80" y="214" font-family="Pretendard, Arial" font-size="72" font-weight="900" fill="${s.ink}">${esc(card?.title)}</text>
<rect x="80" y="255" width="210" height="14" rx="7" fill="${s.accent}"/>
<rect x="80" y="320" width="920" height="210" fill="#f1f5f9" stroke="#0f172a" stroke-width="3"/>
${['근거', '변화', '액션'].map((v, i) => `<rect x="${115 + i * 295}" y="365" width="230" height="110" rx="16" fill="${i === 1 ? s.accent : s.sub}"/><text x="${230 + i * 295}" y="432" text-anchor="middle" font-family="Pretendard, Arial" font-size="34" font-weight="900" fill="#fff">${v}</text>`).join('')}
${body.map((line, i) => `<text x="90" y="${625 + i * 58}" font-family="Pretendard, Arial" font-size="36" font-weight="800" fill="${s.ink}">${esc(line)}</text>`).join('')}
<rect x="80" y="900" width="920" height="84" rx="18" fill="${s.ink}"/>
<text x="116" y="954" font-family="Pretendard, Arial" font-size="34" font-weight="900" fill="#fff">${esc(card?.emphasis ?? studio?.label)}</text>
<text x="80" y="1025" font-family="Pretendard, Arial" font-size="18" font-weight="700" fill="#64748b">${errors?.length ? 'Remote image unavailable · exact-text render' : 'Exact-text render'}</text>
</svg>`;
  return { provider: 'trlab', model: 'exact-text-svg', buffer: Buffer.from(svg), ext: 'svg' };
}

const safeName = (value) => `${value ?? 'cardnews'}`.replace(/[\\/:*?"<>|]/g, '').slice(0, 32);
const esc = (value) => `${value ?? ''}`.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
