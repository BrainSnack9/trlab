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
    coverBackplateInstruction(card, studio),
    dataBackplateInstruction(card, studio),
    'Do not render any Korean text, English text, numbers, labels, logos, watermarks, captions, UI chrome, or handwritten words inside the generated image.',
    'Create a clean visual backplate only; TrLab will overlay every Korean character, number, and label as exact SVG text afterward.',
    'Avoid fake UI chrome, random English filler, and generic stock-photo composition.'
  ].filter(Boolean).join('\n');
}

export function generateLocalCard({ studio, card, style, remoteVisual }, errors) {
  const s = style ?? { bg: '#f8fafc', ink: '#0f172a', accent: '#dc2626', sub: '#2563eb' };
  const svg = renderExactTextCard({ studio, card, style: s, remoteVisual, errors });
  return {
    provider: remoteVisual ? `trlab+${remoteVisual.provider}` : 'trlab',
    model: remoteVisual ? `exact-text-svg+${remoteVisual.model}` : 'exact-text-svg',
    buffer: Buffer.from(svg),
    ext: 'svg'
  };
}

function renderExactTextCard({ studio, card, style, remoteVisual, errors }) {
  if (card?.layout === 'cover_text' || card?.layout === 'cover_photo' || card?.role === 'cover') {
    return renderCoverCard({ studio, card, style, remoteVisual, errors });
  }
  if (card?.layout === 'comparison_board' || card?.role === 'comparison') {
    return renderComparisonCard({ studio, card, style, remoteVisual, errors });
  }
  if (card?.layout === 'data_chart' || card?.role === 'data_scene') {
    return renderDataCard({ studio, card, style, remoteVisual, errors });
  }
  if (card?.layout === 'checklist' || card?.role === 'checklist' || card?.role === 'closing') {
    return renderChecklistCard({ studio, card, style, remoteVisual, errors });
  }
  if (card?.layout === 'quote_card' || card?.role === 'community_signal' || card?.role === 'misconception') {
    return renderQuoteCard({ studio, card, style, remoteVisual, errors });
  }
  return renderResearchCard({ studio, card, style, remoteVisual, errors });
}

function renderCoverCard({ studio, card, remoteVisual, errors }) {
  const channelName = displayChannelName(studio);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
<defs>
<linearGradient id="coverShade" x1="0" x2="0" y1="0" y2="1">
<stop offset="0%" stop-color="#000" stop-opacity="0.04"/>
<stop offset="52%" stop-color="#000" stop-opacity="0.05"/>
<stop offset="78%" stop-color="#000" stop-opacity="0.58"/>
<stop offset="100%" stop-color="#000" stop-opacity="0.94"/>
</linearGradient>
<linearGradient id="fallbackSky" x1="0" x2="0" y1="0" y2="1">
<stop offset="0%" stop-color="#172033"/>
<stop offset="52%" stop-color="#334155"/>
<stop offset="100%" stop-color="#020617"/>
</linearGradient>
</defs>
<rect width="1080" height="1350" fill="url(#fallbackSky)"/>
${remoteVisual ? `<image x="0" y="0" width="1080" height="1350" preserveAspectRatio="xMidYMid slice" href="data:${mimeForExt(remoteVisual.ext)};base64,${remoteVisual.buffer.toString('base64')}"/>` : fallbackCoverScene()}
<rect width="1080" height="1350" fill="url(#coverShade)"/>
${svgTextLines(card?.title, 72, 1008, 86, 108, 11, 3, { fill: '#fff', weight: 900 })}
${card?.body ? svgTextLines(card.body, 76, 1168, 30, 42, 22, 2, { fill: '#ffffffd9', weight: 800 }) : ''}
<text x="540" y="1268" font-family="${FONT_STACK}" font-size="28" text-anchor="middle" font-weight="900" fill="#fff">${esc(channelName)}</text>
</svg>`;
}

function renderComparisonCard({ studio, card, style: s, remoteVisual, errors }) {
  const labels = visualItems(card, [studio?.label ?? '주제', '비교 대상', '과거 기준', '독자 기준']);
  return svgShell(s, `
${headline(card, s, studio)}
${labels.map((label, index) => {
  const x = 80 + (index % 2) * 470;
  const y = 350 + Math.floor(index / 2) * 210;
  const meta = index === 0 ? '기준' : index === 1 ? '대상' : '확인';
  return `<rect x="${x}" y="${y}" width="430" height="170" fill="#fff" stroke="${s.ink}" stroke-width="4"/>
<text x="${x + 28}" y="${y + 42}" font-family="${FONT_STACK}" font-size="20" font-weight="900" fill="#64748b">${meta}</text>
${svgTextLines(label, x + 28, y + 104, 38, 46, 10, 2, { fill: s.ink })}`;
}).join('')}
<rect x="80" y="840" width="920" height="4" fill="${s.ink}"/>
${svgTextLines(card?.body, 80, 930, 36, 56, 24, 3, { fill: s.ink, weight: 900 })}
${svgTextLines(card?.emphasis || '비교 기준으로 나눠보기', 80, 1210, 22, 30, 34, 2, { fill: '#64748b', weight: 900 })}
`, { studio, card, remoteVisual });
}

function renderDataCard({ studio, card, style: s, remoteVisual, errors }) {
  const labels = visualItems(card, ['대표 지표', '검색량', '댓글 반응', '가격/비중']);
  const metrics = chartMetrics(card, labels);
  const chartLabels = chartAxisLabels(card, labels, metrics.length);
  const hasCityData = isCityHousingCard(card, studio);
  const averagePrice = isAveragePriceCard(card);
  if (!averagePrice && hasMixedMetricUnits(metrics)) {
    return renderMetricTileDataCard({ studio, card, style: s, remoteVisual, labels, metrics, hasCityData });
  }
  const story = dataCardStoryLines(card, metrics);
  const maxHeight = 300;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
<defs>
<linearGradient id="dataShade" x1="0" x2="0" y1="0" y2="1">
<stop offset="0%" stop-color="#020617" stop-opacity="0.18"/>
<stop offset="42%" stop-color="#020617" stop-opacity="0.34"/>
<stop offset="100%" stop-color="#020617" stop-opacity="0.88"/>
</linearGradient>
<linearGradient id="blueBar" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#60a5fa"/><stop offset="100%" stop-color="#2563eb"/></linearGradient>
<linearGradient id="redBar" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#fb7185"/><stop offset="100%" stop-color="${s.accent}"/></linearGradient>
<filter id="panelShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#020617" flood-opacity="0.22"/></filter>
<filter id="barGlow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="10" flood-color="${s.accent}" flood-opacity="0.32"/></filter>
</defs>
<rect width="1080" height="1350" fill="#101827"/>
${remoteVisual ? `<image x="0" y="0" width="1080" height="1350" preserveAspectRatio="xMidYMid slice" opacity="0.92" href="data:${mimeForExt(remoteVisual.ext)};base64,${remoteVisual.buffer.toString('base64')}"/>` : cityChartFallbackScene(hasCityData ? 'hongkong' : 'default')}
<rect width="1080" height="1350" fill="url(#dataShade)"/>
<text x="76" y="116" font-family="${FONT_STACK}" font-size="25" font-weight="900" fill="#ffffffcc">${esc(displayChannelName(studio))} · ${String(card?.page ?? 2).padStart(2, '0')}</text>
${svgTextLines(card?.title, 76, 235, 64, 76, 13, 2, { fill: '#fff', weight: 900 })}
<rect x="64" y="392" width="952" height="560" rx="42" fill="#f8fafce8" filter="url(#panelShadow)"/>
<rect x="92" y="420" width="896" height="504" rx="32" fill="#ffffffb8" stroke="#ffffff" stroke-width="2"/>
<text x="132" y="492" font-family="${FONT_STACK}" font-size="28" font-weight="900" fill="${s.sub}">${esc(chartCaption(card, studio))}</text>
<text x="132" y="528" font-family="${FONT_STACK}" font-size="19" font-weight="800" fill="#64748b">${esc(card?.emphasis || '최근 값 중심으로 보기')}</text>
${[0, 1, 2, 3].map((line) => `<line x1="148" y1="${610 + line * 70}" x2="940" y2="${610 + line * 70}" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="7 14" opacity="0.72"/>`).join('')}
<line x1="148" y1="842" x2="940" y2="842" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/>
${metrics.map((metric, index) => {
  const count = Math.max(metrics.length, 4);
  const width = Math.min(108, Math.max(78, Math.floor(560 / count)));
  const gap = Math.max(46, Math.floor((720 - width * count) / Math.max(1, count - 1)));
  const x = 190 + index * (width + gap);
  const h = Math.max(82, Math.round((metric.height / 100) * maxHeight));
  const y = 842 - h;
  const isLast = index === metrics.length - 1;
  const fill = isLast ? 'url(#redBar)' : 'url(#blueBar)';
  const center = x + width / 2;
  return `<rect x="${x - 8}" y="${y - 8}" width="${width + 16}" height="${h + 8}" rx="3" fill="#0f172a" opacity="0.05"/>
<rect x="${x}" y="${y}" width="${width}" height="${h}" rx="3" fill="${fill}" ${isLast ? 'filter="url(#barGlow)"' : ''}/>
<rect x="${x + 10}" y="${y + 12}" width="${Math.max(20, width - 20)}" height="8" rx="2" fill="#fff" opacity="0.2"/>
<text x="${center}" y="${y - 18}" font-family="${FONT_STACK}" font-size="${isLast ? 28 : 23}" text-anchor="middle" font-weight="900" fill="${isLast ? s.accent : '#2563eb'}">${esc(metric.label)}</text>
${false && isLast && averagePrice ? `<path d="M${x + width / 2} ${y - 62} C${x + width / 2 + 40} ${y - 104}, ${Math.min(902, x + width / 2 + 170)} ${y - 112}, ${Math.min(904, x + width / 2 + 205)} ${y - 76}" stroke="${s.accent}" stroke-width="4" fill="none" stroke-linecap="round"/>
<rect x="${Math.min(632, Math.max(520, x - 72))}" y="${Math.max(510, y - 150)}" width="330" height="64" rx="32" fill="${s.accent}"/>
<text x="${Math.min(797, Math.max(685, x + 93))}" y="${Math.max(551, y - 109)}" font-family="${FONT_STACK}" font-size="24" text-anchor="middle" font-weight="900" fill="#fff">현재 평균 집값</text>` : ''}
${svgCenteredLines(chartLabels[index], center, 892, 20, 26, 8, 2, { fill: '#334155', weight: 900 })}`;
}).join('')}
<rect x="64" y="1004" width="952" height="238" rx="34" fill="#020617b5" stroke="#ffffff2b" stroke-width="2"/>
${svgTextLines(story, 96, 1078, 36, 54, 25, 3, { fill: '#fff', weight: 900 })}
</svg>`;
}

function renderMetricTileDataCard({ studio, card, style: s, remoteVisual, labels, metrics, hasCityData }) {
  const pairs = metricTilePairs(labels, metrics);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
<defs>
<linearGradient id="dataShade" x1="0" x2="0" y1="0" y2="1">
<stop offset="0%" stop-color="#020617" stop-opacity="0.18"/>
<stop offset="48%" stop-color="#020617" stop-opacity="0.46"/>
<stop offset="100%" stop-color="#020617" stop-opacity="0.84"/>
</linearGradient>
<filter id="panelShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#020617" flood-opacity="0.22"/></filter>
</defs>
<rect width="1080" height="1350" fill="#101827"/>
${remoteVisual ? `<image x="0" y="0" width="1080" height="1350" preserveAspectRatio="xMidYMid slice" opacity="0.9" href="data:${mimeForExt(remoteVisual.ext)};base64,${remoteVisual.buffer.toString('base64')}"/>` : cityChartFallbackScene(hasCityData ? 'hongkong' : 'default')}
<rect width="1080" height="1350" fill="url(#dataShade)"/>
<text x="76" y="116" font-family="${FONT_STACK}" font-size="25" font-weight="900" fill="#ffffffcc">${esc(displayChannelName(studio))} · ${String(card?.page ?? 2).padStart(2, '0')}</text>
${svgTextLines(card?.title, 76, 235, 64, 76, 13, 2, { fill: '#fff', weight: 900 })}
<rect x="72" y="430" width="936" height="508" rx="36" fill="#ffffffeb" filter="url(#panelShadow)"/>
<text x="122" y="505" font-family="${FONT_STACK}" font-size="28" font-weight="900" fill="${s.sub}">${esc(card?.emphasis || chartCaption(card, studio))}</text>
${pairs.map((pair, index) => {
  const x = 122 + (index % 2) * 438;
  const y = 565 + Math.floor(index / 2) * 158;
  return `<rect x="${x}" y="${y}" width="388" height="118" rx="24" fill="#fff" stroke="#cbd5e1" stroke-width="3"/>
<text x="${x + 30}" y="${y + 42}" font-family="${FONT_STACK}" font-size="23" font-weight="900" fill="#64748b">${esc(pair.label)}</text>
<text x="${x + 30}" y="${y + 92}" font-family="${FONT_STACK}" font-size="42" font-weight="900" fill="${index === pairs.length - 1 ? s.accent : s.ink}">${esc(pair.value)}</text>`;
}).join('')}
${svgTextLines(card?.body, 78, 1040, 34, 54, 24, 3, { fill: '#fff', weight: 900 })}
${svgTextLines(card?.visualPrompt || card?.sourceLine || card?.emphasis, 78, 1232, 26, 36, 30, 2, { fill: '#ffffffcc', weight: 800 })}
</svg>`;
}

function renderQuoteCard({ studio, card, style: s, remoteVisual, errors }) {
  return svgShell(s, `
<text x="80" y="130" font-family="${FONT_STACK}" font-size="24" font-weight="900" fill="${s.sub}">사람들이 반응한 지점</text>
<rect x="80" y="280" width="920" height="590" rx="54" fill="#fff" filter="url(#shadow)"/>
${svgTextLines(card?.title, 130, 430, 62, 76, 12, 3, { fill: s.ink })}
${svgTextLines(card?.body, 130, 660, 34, 52, 23, 3, { fill: '#334155', weight: 900 })}
${svgTextLines(card?.emphasis || '반응이 몰린 지점', 80, 1160, 26, 36, 34, 2, { fill: '#64748b', weight: 800 })}
`, { studio, card, remoteVisual });
}

function renderChecklistCard({ studio, card, style: s, remoteVisual, errors }) {
  const lines = visualItems(card, cardTextLines(card?.body, 24, 4));
  const items = lines.length ? lines : ['반응이 있었나', '비교가 가능한가', '숫자로 설명되나'];
  return svgShell(s, `
<text x="80" y="120" font-family="${FONT_STACK}" font-size="24" font-weight="900" fill="${s.sub}">저장해두고 볼 기준</text>
${svgTextLines(card?.title, 80, 235, 64, 76, 13, 2, { fill: s.ink })}
${svgTextLines(card?.emphasis || '다음에도 다시 볼 체크리스트', 80, 380, 30, 42, 26, 2, { fill: s.accent, weight: 900 })}
${items.slice(0, 4).map((line, index) => {
  const y = 500 + index * 150;
  return `<rect x="80" y="${y}" width="920" height="102" rx="22" fill="#fff" stroke="${s.ink}" stroke-width="4"/>
<circle cx="128" cy="${y + 51}" r="22" fill="${s.accent}"/>
<text x="128" y="${y + 61}" font-family="${FONT_STACK}" font-size="24" text-anchor="middle" font-weight="900" fill="#fff">✓</text>
${svgTextLines(line, 178, y + 63, 32, 42, 24, 1, { fill: s.ink, weight: 900 })}`;
}).join('')}
<rect x="80" y="1135" width="920" height="96" rx="22" fill="#fff" stroke="${s.ink}" stroke-width="3"/>
${svgTextLines('저장할 때는 비교 기준과 숫자 하나를 같이 챙기세요.', 112, 1190, 24, 34, 34, 2, { fill: '#475569', weight: 900 })}
`, { studio, card, remoteVisual });
}

function renderResearchCard({ studio, card, style: s, remoteVisual, errors }) {
  const labels = visualItems(card, ['반응 신호', '비교 기준', '확인할 숫자']);
  return svgShell(s, `
${headline(card, s, studio)}
<rect x="80" y="360" width="920" height="520" rx="46" fill="#f8fafc" stroke="${s.ink}" stroke-width="5" stroke-dasharray="14 12"/>
${labels.slice(0, 3).map((label, i) => `<rect x="${130 + i * 270}" y="415" width="230" height="54" rx="27" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>
${svgTextLines(label, 158 + i * 270, 450, 22, 28, 9, 1, { fill: '#64748b', weight: 900 })}`).join('')}
${svgTextLines(card?.body, 130, 570, 38, 58, 22, 4, { fill: s.ink, weight: 900 })}
<path d="M120 965 C270 915, 390 1065, 540 995 S830 905, 960 985" fill="none" stroke="${s.accent}" stroke-width="14" stroke-linecap="round"/>
${svgTextLines(card?.emphasis || card?.visualPrompt || studio?.label || '핵심 포인트', 80, 1160, 28, 38, 28, 2, { fill: '#64748b', weight: 900 })}
`, { studio, card, remoteVisual });
}

function svgShell(s, children, context = {}) {
  const backdrop = renderGenericBackdrop(context);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
<defs>
<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="18" flood-color="#0f172a" flood-opacity="0.16"/></filter>
<linearGradient id="genericShade" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#020617" stop-opacity="0.08"/><stop offset="100%" stop-color="#020617" stop-opacity="0.34"/></linearGradient>
</defs>
<rect width="1080" height="1350" fill="#eef3f8"/>
<rect x="44" y="44" width="992" height="1262" rx="26" fill="${s.bg}" stroke="#0f172a" stroke-width="5"/>
${backdrop}
${children}
</svg>`;
}

function headline(card, s, studio) {
  return `<text x="80" y="122" font-family="${FONT_STACK}" font-size="24" font-weight="900" fill="${s.sub}">${esc(displayChannelName(studio))} · ${String(card?.page ?? 1).padStart(2, '0')}</text>
${svgTextLines(card?.title, 80, 235, 58, 70, 14, 2, { fill: s.ink })}
<rect x="80" y="300" width="${pillWidth(card?.emphasis, 180, 620)}" height="52" rx="26" fill="${s.accent}"/>
${svgTextLines(card?.emphasis || '핵심 포인트', 106, 334, 22, 28, 22, 1, { fill: '#fff', weight: 900 })}`;
}

function structureInstruction(card) {
  const role = card?.role;
  const layout = card?.layout;
  if (role === 'cover' || layout === 'cover_text' || layout === 'cover_photo') {
    return 'full-bleed editorial cover image: one strong topic-matched background photo or generated scene fills the entire 4:5 card; reserve the lower 35% for a dark gradient and exact title overlay. Do not create panels, charts, cards, UI frames, stickers, labels, or text inside the image.';
  }
  if (role === 'comparison' || layout === 'comparison_board') {
    return 'comparison board: two-by-two empty comparison cells and visual separators; TrLab will overlay all labels afterward.';
  }
  if (role === 'data_scene' || layout === 'data_chart') {
    return 'data card: premium editorial data story layout; create a topic-specific photographic background with clear reserved space in the center for a chart panel and clear reserved space near the bottom for a short data story. Do not draw chart bars, axes, numbers, labels, arrows, legends, or text; TrLab will overlay the exact chart and copy afterward.';
  }
  if (role === 'checklist' || layout === 'checklist') {
    return 'save-worthy closing card: 3 blank checklist rows in the center with clean space for exact text overlay.';
  }
  if (role === 'community_signal' || role === 'misconception' || layout === 'quote_card') {
    return 'quote/reaction card: one big quote-like claim in a white panel, no long article summary.';
  }
  return 'research note card: title at top, 2-3 small chips, short body in a paper-like panel.';
}

function coverBackplateInstruction(card, studio) {
  const role = card?.role;
  const layout = card?.layout;
  if (role !== 'cover' && layout !== 'cover_text' && layout !== 'cover_photo') return '';
  const topic = [studio?.label, studio?.keyword, card?.title, card?.visualPrompt].filter(Boolean).join(' / ');
  return [
    `Cover backplate direction: make a topic-specific full-bleed photographic or high-end 3D editorial background for "${topic}".`,
    'If the topic is Gangnam real estate, use a dense Seoul/Gangnam apartment skyline at night, warm window lights, premium urban atmosphere, slightly top-down or telephoto composition.',
    'Keep the bottom area visually darker and low-detail so TrLab can overlay a large white Korean title there.'
  ].join(' ');
}

function dataBackplateInstruction(card, studio) {
  const role = card?.role;
  const layout = card?.layout;
  if (role !== 'data_scene' && layout !== 'data_chart') return '';
  const topic = [studio?.label, studio?.keyword, card?.title, card?.visualPrompt, card?.dataPoint].filter(Boolean).join(' / ');
  const housing = isCityHousingCard(card, studio);
  return [
    `Data-card backplate direction: make a topic-specific photographic background for "${topic}", composed for an overlaid central chart and lower story text.`,
    housing ? 'If Hong Kong is mentioned, use a dense Hong Kong high-rise skyline or Victoria Harbour residential towers at night, cinematic city lights, premium real-estate mood.' : '',
    'Composition contract: background fills the full 4:5 card; center 45% should be visually calm enough for a glass chart panel; lower 22% should be darker and low-detail for explanatory copy.',
    'Do not render the actual graph in the image model output: no bars, no axes, no labels, no digits, no Korean, no English, no random microcopy, no logos. TrLab renders the graph, values, and current/latest callout exactly.'
  ].filter(Boolean).join(' ');
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

function remoteBackplate(remoteVisual, x, y, width, height, radius, opacity) {
  if (!remoteVisual) return '';
  return `<defs><clipPath id="remoteClip"><rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}"/></clipPath></defs>
<image x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" clip-path="url(#remoteClip)" opacity="${opacity}" href="data:${mimeForExt(remoteVisual.ext)};base64,${remoteVisual.buffer.toString('base64')}"/>`;
}

function displayChannelName(studio) {
  const raw = `${studio?.channelName ?? studio?.manualBrief?.channelName ?? studio?.accountName ?? '@trlab.insight'}`.trim();
  if (!raw) return '@trlab.insight';
  return raw.startsWith('@') ? raw : `@${raw}`;
}

function renderGenericBackdrop({ studio, card, remoteVisual } = {}) {
  const housing = isCityHousingCard(card, studio);
  if (!remoteVisual && !housing) return '';
  const image = remoteVisual
    ? `<image x="44" y="44" width="992" height="1262" preserveAspectRatio="xMidYMid slice" opacity="0.22" clip-path="url(#genericClip)" href="data:${mimeForExt(remoteVisual.ext)};base64,${remoteVisual.buffer.toString('base64')}"/>`
    : cityChartFallbackScene(/홍콩|Hong Kong/i.test([card?.title, card?.visualPrompt, card?.body].join(' ')) ? 'hongkong' : 'default');
  const fallbackWrapped = remoteVisual ? image : `<g clip-path="url(#genericClip)" opacity="0.18" transform="translate(44 44) scale(0.9185)">${image}</g>`;
  return `<defs><clipPath id="genericClip"><rect x="44" y="44" width="992" height="1262" rx="26"/></clipPath></defs>
${fallbackWrapped}
<rect x="44" y="44" width="992" height="1262" rx="26" fill="url(#genericShade)"/>`;
}

function fallbackCoverScene() {
  const towers = Array.from({ length: 13 }, (_, index) => {
    const x = 30 + index * 86;
    const h = 250 + (index % 5) * 70;
    const y = 760 - h;
    const windows = Array.from({ length: Math.floor(h / 46) }, (__, row) => (
      `<rect x="${x + 20}" y="${y + 28 + row * 42}" width="14" height="20" rx="3" fill="#fde68a" opacity="${row % 3 === index % 3 ? 0.88 : 0.36}"/>
<rect x="${x + 52}" y="${y + 28 + row * 42}" width="14" height="20" rx="3" fill="#fde68a" opacity="${row % 2 ? 0.28 : 0.74}"/>`
    )).join('');
    return `<rect x="${x}" y="${y}" width="74" height="${h}" fill="#0f172a" opacity="0.82"/>${windows}`;
  }).join('');
  return `<circle cx="860" cy="170" r="84" fill="#f8fafc" opacity="0.72"/>
<rect x="0" y="650" width="1080" height="400" fill="#020617" opacity="0.28"/>
${towers}`;
}

function cityChartFallbackScene(kind = 'default') {
  const isHongKong = kind === 'hongkong';
  const bgTop = isHongKong ? '#111827' : '#172033';
  const bgBottom = isHongKong ? '#020617' : '#0f172a';
  const towers = Array.from({ length: 18 }, (_, index) => {
    const x = -30 + index * 66;
    const h = 210 + ((index * 47) % 300);
    const y = 620 - h;
    const color = index % 3 === 0 ? '#1f2937' : '#111827';
    const windows = Array.from({ length: Math.max(3, Math.floor(h / 44)) }, (__, row) => {
      const on = (row + index) % 3 !== 1;
      return `<rect x="${x + 16}" y="${y + 26 + row * 40}" width="10" height="18" rx="2" fill="#fbbf24" opacity="${on ? 0.78 : 0.22}"/>
<rect x="${x + 40}" y="${y + 26 + row * 40}" width="10" height="18" rx="2" fill="#fde68a" opacity="${on ? 0.5 : 0.18}"/>`;
    }).join('');
    return `<rect x="${x}" y="${y}" width="56" height="${h}" fill="${color}" opacity="0.9"/>${windows}`;
  }).join('');
  const water = isHongKong ? '<rect x="0" y="620" width="1080" height="230" fill="#0f2742" opacity="0.55"/><path d="M0 690 C180 650, 300 730, 480 690 S800 650, 1080 710" fill="none" stroke="#60a5fa" stroke-width="16" opacity="0.2"/>' : '';
  return `<rect width="1080" height="1350" fill="${bgBottom}"/>
<rect width="1080" height="680" fill="${bgTop}"/>
<circle cx="850" cy="145" r="74" fill="#e5e7eb" opacity="0.55"/>
${towers}
${water}`;
}

function isCityHousingCard(card, studio) {
  return /홍콩|Hong Kong|집값|부동산|아파트|real estate|housing/i.test([
    studio?.label,
    studio?.keyword,
    card?.title,
    card?.body,
    card?.emphasis,
    card?.visualPrompt,
    card?.dataPoint,
    card?.sourceLine,
    ...(Array.isArray(card?.visualItems) ? card.visualItems : [])
  ].filter(Boolean).join(' '));
}

function chartCaption(card, studio) {
  if (isCityHousingCard(card, studio)) return '집값 상승 흐름';
  return card?.emphasis || '지표 상승 흐름';
}

function isAveragePriceCard(card) {
  return /현재\s*평균\s*집값|평균\s*집값|average\s*home|average\s*price/i.test([
    card?.title,
    card?.body,
    card?.emphasis,
    card?.visualPrompt,
    card?.dataPoint,
    card?.sourceLine,
    ...(Array.isArray(card?.visualItems) ? card.visualItems : [])
  ].filter(Boolean).join(' '));
}

function chartAxisLabels(card, labels, count) {
  const joined = [card?.title, card?.body, card?.dataPoint, card?.sourceLine, ...(Array.isArray(labels) ? labels : [])].filter(Boolean).join(' ');
  if (isAveragePriceCard(card) && /홍콩|집값|부동산|아파트|real estate|housing/i.test(joined)) {
    return ['과거', '상승 구간', '최근', '현재 평균 집값'].slice(0, count);
  }
  const source = labels.length ? labels : ['과거', '중간', '최근', '현재'];
  const output = Array.from({ length: count }, (_, index) => source[index] || (index === count - 1 ? '현재' : `구간 ${index + 1}`));
  return output;
}

function svgTextLines(value, x, y, fontSize, lineHeight, limit, maxLines, options = {}) {
  const fill = options.fill ?? '#0f172a';
  const weight = options.weight ?? 900;
  const lines = cardTextLines(value, limit, maxLines);
  return lines.map((line, index) => `<text x="${x}" y="${y + index * lineHeight}" font-family="${FONT_STACK}" font-size="${fontSize}" font-weight="${weight}" fill="${fill}">${esc(line)}</text>`).join('');
}

function svgCenteredLines(value, x, y, fontSize, lineHeight, limit, maxLines, options = {}) {
  const fill = options.fill ?? '#0f172a';
  const weight = options.weight ?? 900;
  const lines = cardTextLines(value, limit, maxLines);
  return lines.map((line, index) => `<text x="${x}" y="${y + index * lineHeight}" font-family="${FONT_STACK}" font-size="${fontSize}" text-anchor="middle" font-weight="${weight}" fill="${fill}">${esc(line)}</text>`).join('');
}

function pillWidth(value, min, max) {
  const length = `${value ?? ''}`.trim().length || 10;
  return Math.min(max, Math.max(min, length * 30 + 70));
}

function chartMetrics(card, labelsOrCount = 4) {
  const labels = Array.isArray(labelsOrCount) ? labelsOrCount : [];
  const count = Array.isArray(labelsOrCount) ? labelsOrCount.length : labelsOrCount;
  const labeled = extractLabeledMetrics(card, labels);
  const values = labeled.length ? labeled : extractNumbers([card?.dataPoint, card?.sourceLine, card?.body, card?.emphasis].join(' '));
  const fallback = [78, 46, 62, 28].slice(0, count).map((value) => ({ value, label: `${value}` }));
  const normalized = values.length ? [...values, ...fallback].slice(0, count) : fallback;
  const max = Math.max(...normalized.map((item) => item.value), 1);
  return normalized.slice(0, count).map((item) => ({
    name: item.name,
    value: item.value,
    label: item.label,
    height: Math.max(24, Math.round((item.value / max) * 100))
  }));
}

function dataCardStoryLines(card, metrics = []) {
  const explicit = `${card?.dataStory ?? ''}`.trim();
  if (explicit) return explicit;
  const text = [card?.title, card?.body, card?.dataPoint, card?.sourceLine, card?.emphasis].filter(Boolean).join(' ');
  const years = [...text.matchAll(/\b(19\d{2}|20\d{2})\b/g)].map((match) => match[1]);
  const valueMetrics = metrics.filter((metric) => /\d/.test(metric.label));
  const current = valueMetrics.find((metric) => /현재|최근|평균|current|latest/i.test(metric.label)) ?? valueMetrics.at(-1);
  const maxMetric = valueMetrics.reduce((best, metric) => metric.value > (best?.value ?? -Infinity) ? metric : best, null);
  const firstYear = years[0];
  const lastYear = years.length > 1 ? years.at(-1) : '';
  const subject = /홍콩/.test(text) ? '홍콩 부동산' : /강남/.test(text) ? '강남 부동산' : '이 지표';
  const valueName = /집값|부동산|아파트|평균/.test(text) ? '평균 집값' : '현재값';
  if (firstYear && lastYear && current?.label) {
    return `${subject}은 ${firstYear}년부터 ${lastYear}년까지 상승 흐름이 이어졌습니다.\n현재 ${valueName}은 ${current.label}입니다.`;
  }
  if (maxMetric?.name && current?.name && maxMetric !== current) {
    return `가장 큰 신호는 ${maxMetric.name} ${maxMetric.label}입니다.\n마지막 확인값은 ${current.name} ${current.label}입니다.`;
  }
  if (current?.name && current?.label) {
    return `핵심 신호는 ${current.name}입니다.\n현재 확인할 값은 ${current.label}입니다.`;
  }
  if (current?.label) {
    return `${subject}은 최근 값이 판단 기준입니다.\n지금 확인할 값은 ${current.label}입니다.`;
  }
  return card?.body || card?.emphasis || '숫자는 흐름과 현재값을 함께 봐야 합니다.';
}

function hasMixedMetricUnits(metrics = []) {
  const units = new Set(metrics.map((metric) => metricUnit(metric?.label)).filter(Boolean));
  return units.size > 1;
}

function metricUnit(value) {
  const text = `${value ?? ''}`;
  if (text.includes('%')) return 'percent';
  if (/[억조]/.test(text)) return 'price';
  if (/[만]/.test(text)) return 'man';
  return 'number';
}

function metricTilePairs(labels = [], metrics = []) {
  return Array.from({ length: Math.max(labels.length, metrics.length, 4) }, (_, index) => ({
    label: labels[index] || `지표 ${index + 1}`,
    value: metrics[index]?.label || '-'
  })).slice(0, 4);
}

function extractLabeledMetrics(card, labels = []) {
  const text = [card?.dataPoint, card?.sourceLine, card?.body].filter(Boolean).join(', ');
  if (!text || !labels.length) return [];
  const metrics = labels.map((label) => {
    const escaped = escapeRegExp(label);
    const afterLabel = new RegExp(`${escaped}[^\\d-]*(-?\\d+(?:,\\d{3})*(?:\\.\\d+)?)(\\s*[%건개명만원억조])?`, 'i').exec(text);
    const afterYear = /^\d{4}$/.test(label)
      ? new RegExp(`${label}\\s*년?[^\\d-]*(-?\\d+(?:,\\d{3})*(?:\\.\\d+)?)(\\s*[%건개명만원억조])?`, 'i').exec(text)
      : null;
    const average = /현재|평균|집값/.test(label)
      ? /현재\s*평균\s*집값[^\d-]*(-?\d+(?:,\d{3})*(?:\.\d+)?)(\s*[%건개명만원억조])?/i.exec(text)
      : null;
    const match = average || afterYear || afterLabel;
    if (!match) return null;
    const value = Number(match[1].replace(/,/g, ''));
    const unit = (match[2] ?? '').trim();
    return Number.isFinite(value) ? { name: label, value, label: `${match[1]}${unit}` } : null;
  }).filter(Boolean);
  return metrics.length >= Math.min(2, labels.length) ? metrics : [];
}

function extractNumbers(text) {
  return [...`${text ?? ''}`.matchAll(/(\d+(?:,\d{3})*(?:\.\d+)?)(\s*[%건개명만원억조])?/g)]
    .map((match) => {
      const value = Number(match[1].replace(/,/g, ''));
      const unit = (match[2] ?? '').trim();
      return Number.isFinite(value) ? { value, label: `${match[1]}${unit}` } : null;
    })
    .filter(Boolean);
}

function escapeRegExp(value) {
  return `${value ?? ''}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function visualItems(card, fallback = []) {
  const source = Array.isArray(card?.visualItems) && card.visualItems.length ? card.visualItems : fallback;
  return source.map((item) => trimLabel(item, 18)).filter(Boolean).slice(0, 4);
}

function trimLabel(value, maxLength) {
  const text = `${value ?? ''}`.replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
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
