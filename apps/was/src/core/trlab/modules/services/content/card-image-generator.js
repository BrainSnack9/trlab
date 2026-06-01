import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { cardTextLines } from './card-text.js';
import { tryGenerateRemoteImage } from './image-provider-clients.js';

const outputDir = path.join(process.cwd(), 'public', 'generated', 'cardnews');
const exactTextWarning = 'Korean copy is rendered by TrLab exact-text SVG, not by an image model, to prevent broken Hangul.';
const FONT_STACK = 'Pretendard, Apple SD Gothic Neo, Noto Sans CJK KR, Malgun Gothic, Arial, sans-serif';

export async function generateCardNewsImage({ studio, plan, card, style, index }) {
  const prompt = makeImagePrompt({ studio, plan, card, style });
  const { image: remoteVisual, errors } = await tryGenerateRemoteImage(prompt);
  const finalImage = generateLocalCard({ studio, card, style, remoteVisual }, errors);
  await mkdir(outputDir, { recursive: true });
  const filename = `${safeName(studio?.label)}-${String((index ?? 0) + 1).padStart(2, '0')}-${Date.now()}.${finalImage.ext}`;
  await writeFile(path.join(outputDir, filename), finalImage.buffer);
  return { provider: finalImage.provider, model: finalImage.model, prompt, url: `/generated/cardnews/${filename}`, warnings: [exactTextWarning, ...errors] }; 
}

export function makeImagePrompt({ studio, plan, card, style }) {
  const styleName = style?.name ?? '정보형 카드뉴스';
  const traits = [style?.desc, style?.bg, style?.accent, style?.sub].filter(Boolean).join(', ');
  const items = visualItems(card, [studio?.label, card?.emphasis, card?.sourceLine, card?.dataPoint]);
  const structure = structureInstruction(card);
  const guide = referenceVisualGuide(plan?.referenceStyle);
  return [
    'Create a premium 4:5 Instagram information carousel visual backplate for a Korean-market card.',
    'Compose for a 4:5 final crop with generous safe margins; TrLab exports every card as a 1080x1350 vertical image.',
    'Design like Korean viral information carousel references: bold hook cover, short copy, one visual idea per card, editorial poster quality.',
    'Keep Korean typography crisp and legible. If text rendering is uncertain, leave clean blank panels for text overlay.',
    `Style preset: ${styleName}. Traits: ${traits}.`,
    `Reference style: ${plan?.referenceStyle ?? 'handdrawn_research'}.`,
    plan?.referencePattern ? `Reference rhythm: ${referencePatternText(plan.referencePattern)}.` : '',
    `Reference visual guide: ${referenceVisualGuideText(guide)}.`,
    `Card role/layout: ${card?.role ?? 'content'} / ${card?.layout ?? 'data_chart'}.`,
    `Topic: ${studio?.label ?? studio?.keyword ?? 'TrLab insight'}.`,
    `Core angle: ${plan?.coreAngle ?? plan?.summary ?? ''}.`,
    `Title: ${card?.title ?? ''}.`,
    `Body: ${card?.body ?? ''}.`,
    `Emphasis: ${card?.emphasis ?? ''}.`,
    `Visual idea: ${card?.visualPrompt ?? ''}.`,
    `Semantic visual concepts for the illustration only, not text labels: ${items.join(' | ')}.`,
    `Role-specific composition: ${structure}.`,
    'Do not render any Korean text, English text, numbers, labels, logos, watermarks, captions, UI chrome, or handwritten words inside the generated image.',
    'Create a clean visual backplate only; TrLab will overlay every Korean character, number, and label as exact SVG text afterward.',
    'Avoid fake UI chrome, random English filler, and generic stock-photo composition.'
  ].filter(Boolean).join('\n');
}

export function generateLocalCard({ studio, card, style, remoteVisual }, errors) {
  const s = style ?? { bg: '#f8fafc', ink: '#0f172a', accent: '#dc2626', sub: '#2563eb' };
  const body = cardTextLines(card?.body, 24, 5);
  const role = visibleRole(card?.role, card?.layout);
  const items = visualItems(card, [studio?.label, card?.emphasis, card?.sourceLine, card?.dataPoint]);
  const footerLabel = card?.role === 'cover' || card?.layout === 'cover_text' || card?.layout === 'cover_photo'
    ? '저장 포인트'
    : '핵심 포인트';
  const closingCopy = card?.role === 'checklist' || card?.layout === 'checklist'
    ? '저장할 때는 비교 기준과 숫자 하나를 같이 남겨요.'
    : footerLabel === '저장 포인트'
      ? (card?.emphasis ?? studio?.label ?? '지금 봐야 할 신호')
      : (card?.emphasis ?? card?.visualPrompt ?? '핵심 포인트');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
<rect width="1080" height="1350" fill="${s.bg}"/>
<rect x="44" y="44" width="992" height="1262" rx="26" fill="#fff" stroke="#0f172a" stroke-width="5"/>
<text x="80" y="118" font-family="${FONT_STACK}" font-size="28" font-weight="900" fill="${s.sub}">@trlab.insight #${card?.page ?? 1}</text>
<text x="80" y="214" font-family="${FONT_STACK}" font-size="72" font-weight="900" fill="${s.ink}">${esc(card?.title)}</text>
<rect x="80" y="255" width="210" height="14" rx="7" fill="${s.accent}"/>
<defs><clipPath id="visualClip"><rect x="80" y="330" width="920" height="390"/></clipPath></defs>
<rect x="80" y="330" width="920" height="390" fill="#f1f5f9" stroke="#0f172a" stroke-width="3"/>
${remoteVisual ? `<image x="80" y="330" width="920" height="390" preserveAspectRatio="xMidYMid slice" clip-path="url(#visualClip)" opacity="0.28" href="data:${mimeForExt(remoteVisual.ext)};base64,${remoteVisual.buffer.toString('base64')}"/>` : ''}
<rect x="80" y="330" width="920" height="390" fill="#f8fafc" opacity="0.68"/>
<text x="118" y="410" font-family="${FONT_STACK}" font-size="34" font-weight="900" fill="${s.sub}">${esc(role)}</text>
<text x="118" y="480" font-family="${FONT_STACK}" font-size="52" font-weight="900" fill="${s.accent}">${esc(card?.emphasis ?? studio?.label)}</text>
${items.map((item, i) => {
  const x = 118 + (i % 2) * 420;
  const y = 535 + Math.floor(i / 2) * 94;
  return `<rect x="${x}" y="${y}" width="374" height="64" rx="18" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>
<text x="${x + 24}" y="${y + 42}" font-family="${FONT_STACK}" font-size="27" font-weight="900" fill="${s.ink}">${esc(trimLabel(item, 13))}</text>`;
}).join('')}
${body.map((line, i) => `<text x="90" y="${825 + i * 62}" font-family="${FONT_STACK}" font-size="38" font-weight="800" fill="${s.ink}">${esc(line)}</text>`).join('')}
<rect x="80" y="1118" width="920" height="118" rx="22" fill="#fff" stroke="#cbd5e1" stroke-width="3"/>
<text x="116" y="1160" font-family="${FONT_STACK}" font-size="20" font-weight="900" fill="${s.sub}">${esc(footerLabel)}</text>
<text x="116" y="1204" font-family="${FONT_STACK}" font-size="28" font-weight="900" fill="${s.ink}">${esc(trimLabel(closingCopy, 34))}</text>
<text x="80" y="1260" font-family="${FONT_STACK}" font-size="18" font-weight="700" fill="#64748b">${errors?.length ? 'Remote image unavailable · exact-text render' : 'Exact-text render'}</text>
</svg>`;
  return { provider: remoteVisual ? `trlab+${remoteVisual.provider}` : 'trlab', model: remoteVisual ? `exact-text-svg+${remoteVisual.model}` : 'exact-text-svg', buffer: Buffer.from(svg), ext: 'svg' };
}

function structureInstruction(card) {
  const role = card?.role;
  const layout = card?.layout;
  if (role === 'cover' || layout === 'cover_text' || layout === 'cover_photo') {
    return 'hook-first poster: top account mark, small emphasis pill, huge title, one short promise line, 2-3 small visual chips at the bottom. Do not show source paragraphs on the cover.';
  }
  if (role === 'comparison' || layout === 'comparison_board') {
    return 'comparison board: two-by-two empty comparison cells and visual separators; TrLab will overlay all labels afterward.';
  }
  if (role === 'data_scene' || layout === 'data_chart') {
    return 'data card: one large chart-like or numeric visual with blank bars and panels; TrLab will overlay all numbers and labels afterward.';
  }
  if (role === 'checklist' || layout === 'checklist') {
    return 'save-worthy closing card: 3 blank checklist rows in the center with clean space for exact text overlay.';
  }
  if (role === 'community_signal' || role === 'misconception' || layout === 'quote_card') {
    return 'quote/reaction card: one big quote-like claim in a white panel, no long article summary.';
  }
  return 'research note card: title at top, 2-3 small chips, short body in a paper-like panel.';
}

function referencePatternText(pattern) {
  return [
    pattern.deckLength,
    pattern.coverRhythm,
    pattern.bodyRhythm,
    pattern.endingRhythm
  ].filter(Boolean).join(' / ');
}

function referenceVisualGuide(referenceStyle) {
  return {
    handdrawn_research: {
      account: '@twojob_angel',
      cover: 'white space with a short topic label and one editor observation line',
      body: 'hand-drawn research note, data chips, comparison table, small handwritten annotations',
      typography: 'bold Korean headline plus short memo-like body copy',
      avoid: 'generic PowerPoint shapes, copied article titles, long paragraphs'
    },
    photo_hook: {
      account: '@power_biolife',
      cover: 'full-bleed photo or dark gradient with one surprising Korean hook sentence',
      body: 'one fact per card, large number, short explanation',
      typography: 'large white title, high-contrast emphasis label',
      avoid: 'flat report background, long source text on the cover'
    },
    magazine_story: {
      account: '@artart.today',
      cover: 'magazine cover composition with large photo/scene and short title',
      body: 'editorial scene-by-scene layout for culture or brand context',
      typography: 'clean sans-serif headline, generous spacing',
      avoid: 'too many charts, meme tone, excessive decoration'
    },
    meme_factcheck: {
      account: '@koreanmedicalmemed',
      cover: 'short keyword and speech-bubble style question',
      body: 'claim/check/misconception separated like a fact-check board',
      typography: 'short bold copy with red/blue contrast',
      avoid: 'vague opinion, unsourced certainty, long explanation'
    }
  }[referenceStyle] ?? {
    account: 'reference carousel',
    cover: 'short strong hook cover',
    body: 'one role and one visual idea per card',
    typography: 'bold title and short body copy',
    avoid: 'long paragraphs, random decoration, copied source text'
  };
}

function referenceVisualGuideText(guide) {
  return [
    guide.account,
    `cover ${guide.cover}`,
    `body ${guide.body}`,
    `typography ${guide.typography}`,
    `avoid ${guide.avoid}`
  ].filter(Boolean).join(' / ');
}

function visualItems(card, fallback = []) {
  const source = Array.isArray(card?.visualItems) && card.visualItems.length ? card.visualItems : fallback;
  return source.map((item) => trimLabel(item, 18)).filter(Boolean).slice(0, 4);
}

function trimLabel(value, maxLength) {
  const text = `${value ?? ''}`.replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function visibleRole(role, layout) {
  return {
    cover: '첫 장에서 멈추게',
    why_now: '왜 지금 봐야 하나',
    community_signal: '사람들이 반응한 말',
    comparison: '비교해야 보이는 것',
    data_scene: '숫자로 보는 장면',
    misconception: '과장하면 안 되는 지점',
    content_angle: '콘텐츠로 바꾸는 각도',
    checklist: '저장할 기준',
    closing: '마지막 체크'
  }[role] || {
    cover_photo: '첫 장에서 멈추게',
    cover_text: '첫 장에서 멈추게',
    handwritten_research: '리서치 노트',
    comparison_board: '비교해야 보이는 것',
    data_chart: '숫자로 보는 장면',
    quote_card: '사람들이 반응한 말',
    checklist: '저장할 기준'
  }[layout] || '카드뉴스 초안';
}

const safeName = (value) => `${value ?? 'cardnews'}`.replace(/[\\/:*?"<>|]/g, '').slice(0, 32);
const esc = (value) => `${value ?? ''}`.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));

function mimeForExt(ext) {
  const value = `${ext ?? ''}`.toLowerCase();
  if (value === 'jpg' || value === 'jpeg') return 'image/jpeg';
  if (value === 'webp') return 'image/webp';
  if (value === 'svg') return 'image/svg+xml';
  return 'image/png';
}
