import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { cardTextLines } from './card-text.js';
import { tryGenerateRemoteImage } from './image-provider-clients.js';

const outputDir = path.join(process.cwd(), 'public', 'generated', 'cardnews');
const exactTextWarning = 'Korean copy is rendered by TrLab exact-text SVG, not by an image model, to prevent broken Hangul.';
const FONT_STACK = 'Pretendard, Apple SD Gothic Neo, Noto Sans CJK KR, Malgun Gothic, Arial, sans-serif';

export async function generateCardNewsImage({ studio, plan, card, style, index, editInstruction, previousImagePrompt }) {
  const prompt = makeImagePrompt({ studio, plan, card, style, editInstruction, previousImagePrompt });
  const { image: remoteVisual, errors } = await tryGenerateRemoteImage(prompt);
  if (!remoteVisual) {
    throw new Error(`AI 이미지 생성이 필요합니다. ${errors.length ? errors.join(' | ') : '사용 가능한 이미지 provider가 없습니다.'}`);
  }
  const finalImage = generateLocalCard({ studio, card, style, remoteVisual }, errors);
  await mkdir(outputDir, { recursive: true });
  const filename = `${safeName(visualTopic({ studio, plan, card }))}-${String((index ?? 0) + 1).padStart(2, '0')}-${Date.now()}.${finalImage.ext}`;
  await writeFile(path.join(outputDir, filename), finalImage.buffer);
  return { provider: finalImage.provider, model: finalImage.model, prompt, url: `/generated/cardnews/${filename}`, warnings: [exactTextWarning, ...errors] };
}

export function makeImagePrompt({ studio, plan, card, style, editInstruction, previousImagePrompt }) {
  const styleName = style?.name ?? '정보형 카드뉴스';
  const topic = visualTopic({ studio, plan, card });
  const items = visualItems(card, [topic, card?.emphasis, card?.sourceLine, card?.dataPoint]);
  const structure = structureInstruction(card);
  const guide = referenceVisualGuide(plan?.referenceStyle);
  const revision = cleanPromptText(editInstruction, 800);
  const previous = cleanPromptText(previousImagePrompt, 900);
  return [
    'Create one premium 4:5 Instagram carousel backplate for Korea. Final export is 1080x1350.',
    'Backplate only: no text, numbers, logos, captions, UI chrome, labels, watermarks, or random microcopy.',
    'No readable Korean, English, numerals, signage, document text, UI labels, product labels, or article thumbnails. If a signboard or paper appears, keep it blank or abstract.',
    'Leave calm blank zones for TrLab to overlay exact Korean SVG text afterward.',
    `Canvas template: ${styleName}. ${styleTemplateInstruction(style)}`,
    `Reference style: ${plan?.referenceStyle ?? 'handdrawn_research'}.`,
    plan?.referencePattern ? `Reference rhythm: ${referencePatternText(plan.referencePattern)}.` : '',
    `Reference visual guide: ${referenceVisualGuideText(guide)}.`,
    `Card role/layout: ${card?.role ?? 'content'} / ${card?.layout ?? 'data_chart'}.`,
    `Topic: ${topic}.`,
    `Core angle: ${plan?.coreAngle ?? plan?.summary ?? ''}.`,
    overlayTextContract(card),
    `Visual idea: ${card?.visualPrompt ?? ''}.`,
    `Semantic visual concepts for the illustration only, not text labels: ${items.join(' | ')}.`,
    `Role-specific composition: ${structure}.`,
    coverBackplateInstruction(card, studio, plan),
    dataBackplateInstruction(card, studio, plan),
    revision ? `Revision request: ${revision}. Preserve the card topic, exact Korean overlay text zones, aspect ratio, and style preset unless the request explicitly changes them.` : '',
    revision && previous ? `Previous prompt context to keep continuity: ${previous}.` : '',
    'Avoid unrelated stock-photo mood, fake interface screenshots, copied article thumbnails, and decorative abstract-only backgrounds.'
  ].filter(Boolean).join('\n');
}

function cleanPromptText(value, maxLength = 1000) {
  return `${value ?? ''}`.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function styleTemplateInstruction(style = {}) {
  const slots = Array.isArray(style.slots) ? style.slots.filter(Boolean).slice(0, 4).join(', ') : '';
  const guide = cleanPromptText(style.imageGuide || style.desc, 280);
  const palette = [style.bg, style.ink, style.accent, style.sub].filter(Boolean).join(' / ');
  return [
    guide ? `Use this template direction: ${guide}.` : '',
    slots ? `Respect template slots: ${slots}.` : '',
    palette ? `Use palette cues only for overlay compatibility: ${palette}.` : ''
  ].filter(Boolean).join(' ');
}

function overlayTextContract(card = {}) {
  const titleLines = cardTextLines(card?.title, 11, 3).length;
  const bodyLines = cardTextLines(card?.body, 24, 4).length;
  return `Overlay contract: TrLab will add exact Korean title (${titleLines || 1} line${titleLines > 1 ? 's' : ''}), body (${bodyLines || 0} line${bodyLines === 1 ? '' : 's'}), and optional emphasis afterward. Do not render the wording inside the image.`;
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
  const titleY = 1000;
  const titleLineHeight = 108;
  const titleLines = cardTextLines(card?.title, 11, 3);
  const bodyY = titleY + Math.max(0, titleLines.length - 1) * titleLineHeight + 92;
  const bodyMaxLines = titleLines.length >= 3 ? 1 : 2;
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
${svgTextLines(card?.title, 72, titleY, 86, titleLineHeight, 11, 3, { fill: '#fff', weight: 900, maxWidth: 930 })}
${card?.body ? svgTextLines(card.body, 76, bodyY, 30, 44, 22, bodyMaxLines, { fill: '#ffffffd9', weight: 800, maxWidth: 880 }) : ''}
<text x="540" y="1300" font-family="${FONT_STACK}" font-size="28" text-anchor="middle" font-weight="900" fill="#fff">${esc(channelName)}</text>
</svg>`;
}

function renderComparisonCard({ studio, card, style: s, remoteVisual, errors }) {
  if (remoteVisual) return renderEditorialBodyCard({ studio, card, style: s, remoteVisual, variant: 'comparison' });
  const labels = visualItems(card, [card?.title ?? studio?.label ?? '주제', '비교 대상', '과거 기준', '독자 기준']);
  const visual = remoteVisual
    ? `<image x="0" y="0" width="1080" height="1350" preserveAspectRatio="xMidYMid slice" opacity="0.82" href="data:${mimeForExt(remoteVisual.ext)};base64,${remoteVisual.buffer.toString('base64')}"/>`
    : generatedComparisonFallbackScene(card, studio);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
<defs>
<linearGradient id="comparisonShade" x1="0" x2="0" y1="0" y2="1">
<stop offset="0%" stop-color="#f8fafc" stop-opacity="0.64"/>
<stop offset="48%" stop-color="#f8fafc" stop-opacity="0.26"/>
<stop offset="100%" stop-color="#020617" stop-opacity="0.76"/>
</linearGradient>
<filter id="comparisonPanel" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#020617" flood-opacity="0.18"/></filter>
</defs>
<rect width="1080" height="1350" fill="#e7edf4"/>
${visual}
<rect width="1080" height="1350" fill="url(#comparisonShade)"/>
<text x="72" y="118" font-family="${FONT_STACK}" font-size="24" font-weight="900" fill="#334155">${esc(displayChannelName(studio))} · ${String(card?.page ?? 3).padStart(2, '0')}</text>
${svgTextLines(card?.title, 72, 235, 64, 76, 12, 2, { fill: s.ink, weight: 900, maxWidth: 900 })}
<rect x="74" y="356" width="908" height="560" rx="42" fill="#fffffff0" filter="url(#comparisonPanel)"/>
<line x1="540" y1="404" x2="540" y2="868" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round"/>
<line x1="124" y1="634" x2="932" y2="634" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round"/>
${labels.slice(0, 4).map((label, index) => {
  const x = 132 + (index % 2) * 454;
  const y = 434 + Math.floor(index / 2) * 232;
  const chip = index === 0 ? '상황' : index === 1 ? '기준' : index === 2 ? '주의' : '판단';
  return `<rect x="${x}" y="${y}" width="360" height="162" rx="28" fill="${index === 0 ? '#fef2f2' : '#f8fafc'}" stroke="${index === 0 ? s.accent : '#e2e8f0'}" stroke-width="3"/>
<text x="${x + 28}" y="${y + 42}" font-family="${FONT_STACK}" font-size="20" font-weight="900" fill="${index === 0 ? s.accent : '#64748b'}">${esc(chip)}</text>
${svgTextLines(label, x + 28, y + 106, 34, 42, 10, 2, { fill: s.ink, weight: 900 })}`;
}).join('')}
<rect x="72" y="998" width="936" height="196" rx="34" fill="#020617c9"/>
${svgTextLines(card?.body, 110, 1070, 34, 52, 26, 3, { fill: '#fff', weight: 900, maxWidth: 860 })}
<text x="110" y="1240" font-family="${FONT_STACK}" font-size="25" font-weight="900" fill="#cbd5e1">${esc(card?.emphasis || '같은 문제도 기준을 나누면 답이 달라져요.')}</text>
</svg>`;
}

function renderDataCard({ studio, card, style: s, remoteVisual, errors }) {
  if (remoteVisual && !/\d|%|억|만|조/.test(`${card?.body ?? ''} ${card?.dataPoint ?? ''} ${card?.visualItems?.join(' ') ?? ''}`)) {
    return renderEditorialBodyCard({ studio, card, style: s, remoteVisual, variant: 'data' });
  }
  const labels = visualItems(card, dataFallbackLabels(card, studio));
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
${svgTextLines(card?.title, 76, 235, 64, 76, 13, 2, { fill: '#fff', weight: 900, maxWidth: 900 })}
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
${svgTextLines(story, 96, 1078, 36, 54, 25, 3, { fill: '#fff', weight: 900, maxWidth: 860 })}
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
${svgTextLines(card?.title, 76, 235, 64, 76, 13, 2, { fill: '#fff', weight: 900, maxWidth: 900 })}
<rect x="72" y="430" width="936" height="508" rx="36" fill="#ffffffeb" filter="url(#panelShadow)"/>
<text x="122" y="505" font-family="${FONT_STACK}" font-size="28" font-weight="900" fill="${s.sub}">${esc(card?.emphasis || chartCaption(card, studio))}</text>
${pairs.map((pair, index) => {
  const x = 122 + (index % 2) * 438;
  const y = 565 + Math.floor(index / 2) * 158;
  return `<rect x="${x}" y="${y}" width="388" height="118" rx="24" fill="#fff" stroke="#cbd5e1" stroke-width="3"/>
<text x="${x + 30}" y="${y + 42}" font-family="${FONT_STACK}" font-size="23" font-weight="900" fill="#64748b">${esc(pair.label)}</text>
<text x="${x + 30}" y="${y + 92}" font-family="${FONT_STACK}" font-size="42" font-weight="900" fill="${index === pairs.length - 1 ? s.accent : s.ink}">${esc(pair.value)}</text>`;
}).join('')}
${svgTextLines(card?.body, 78, 1040, 34, 54, 24, 3, { fill: '#fff', weight: 900, maxWidth: 860 })}
${svgTextLines(card?.visualPrompt || card?.sourceLine || card?.emphasis, 78, 1232, 26, 36, 30, 2, { fill: '#ffffffcc', weight: 800 })}
</svg>`;
}

function renderQuoteCard({ studio, card, style: s, remoteVisual, errors }) {
  if (remoteVisual) return renderEditorialBodyCard({ studio, card, style: s, remoteVisual, variant: 'quote' });
  const emphasis = cleanDisplayText(card?.emphasis);
  const visual = remoteVisual
    ? `<image x="0" y="0" width="1080" height="1350" preserveAspectRatio="xMidYMid slice" opacity="0.94" href="data:${mimeForExt(remoteVisual.ext)};base64,${remoteVisual.buffer.toString('base64')}"/>`
    : generatedQuoteFallbackScene(card, studio);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
<defs>
<linearGradient id="quoteShade" x1="0" x2="0" y1="0" y2="1">
<stop offset="0%" stop-color="#f8fafc" stop-opacity="0.52"/>
<stop offset="36%" stop-color="#f8fafc" stop-opacity="0.08"/>
<stop offset="72%" stop-color="#020617" stop-opacity="0.34"/>
<stop offset="100%" stop-color="#020617" stop-opacity="0.88"/>
</linearGradient>
<linearGradient id="quoteTitleVeil" x1="0" x2="1" y1="0" y2="0">
<stop offset="0%" stop-color="#ffffff" stop-opacity="0.86"/>
<stop offset="58%" stop-color="#ffffff" stop-opacity="0.58"/>
<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
</linearGradient>
<filter id="textLift" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="5" stdDeviation="7" flood-color="#ffffff" flood-opacity="0.68"/></filter>
<filter id="chipShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#020617" flood-opacity="0.14"/></filter>
</defs>
<rect width="1080" height="1350" fill="#e9eef4"/>
${visual}
<rect width="1080" height="1350" fill="url(#quoteShade)"/>
<rect x="56" y="56" width="968" height="1238" rx="34" fill="none" stroke="#0f172a" stroke-width="5"/>
<path d="M0 120 L820 92 L770 450 L0 520 Z" fill="url(#quoteTitleVeil)"/>
${emphasis ? `<rect x="78" y="88" width="${pillWidth(emphasis, 180, 520)}" height="50" rx="25" fill="#ffffffc8" filter="url(#chipShadow)"/>
${svgTextLines(emphasis, 106, 122, 22, 28, 18, 1, { fill: '#475569', weight: 750 })}` : ''}
<rect x="78" y="226" width="12" height="192" rx="6" fill="${s.accent}" opacity="0.82"/>
<g filter="url(#textLift)">
${svgTextLines(card?.title, 112, 318, 68, 82, 11, 2, { fill: '#111827', weight: 820, maxWidth: 820 })}
</g>
<path d="M80 620 C250 566, 470 624, 644 584 C768 556, 900 582, 1012 544 L1012 824 C814 866, 660 790, 486 836 C306 884, 178 812, 80 852 Z" fill="#ffffffe2"/>
${svgTextLines(card?.body, 118, 690, 32, 52, 25, 3, { fill: '#334155', weight: 600, maxWidth: 860 })}
</svg>`;
}

function renderEditorialBodyCard({ studio, card, style: s, remoteVisual, variant }) {
  const labels = visualItems(card, cardTextLines(card?.body, 24, 4)).slice(0, 4);
  const titleFill = variant === 'quote' ? '#0f172a' : '#ffffff';
  const bodyFill = '#ffffff';
  const visualOverlay = editorialVisualOverlay({ card, style: s, variant, labels });
  const footerText = variant === 'checklist' ? checklistGuide(card).tip : card?.body;
  const footerHeight = variant === 'checklist' ? 170 : 214;
  const footerY = variant === 'checklist' ? 1048 : 1012;
  const footerTextY = variant === 'checklist' ? 1116 : 1080;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
<defs>
<linearGradient id="editorialShade" x1="0" x2="0" y1="0" y2="1">
<stop offset="0%" stop-color="#f8fafc" stop-opacity="${variant === 'quote' ? '0.72' : '0.18'}"/>
<stop offset="42%" stop-color="#020617" stop-opacity="0.06"/>
<stop offset="72%" stop-color="#020617" stop-opacity="0.28"/>
<stop offset="100%" stop-color="#020617" stop-opacity="0.86"/>
</linearGradient>
<linearGradient id="editorialTitleVeil" x1="0" x2="1" y1="0" y2="0">
<stop offset="0%" stop-color="#ffffff" stop-opacity="${variant === 'quote' ? '0.88' : '0.22'}"/>
<stop offset="70%" stop-color="#ffffff" stop-opacity="0"/>
</linearGradient>
<filter id="softText" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="${variant === 'quote' ? '#fff' : '#020617'}" flood-opacity="0.32"/></filter>
<filter id="softPanel" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#020617" flood-opacity="0.22"/></filter>
</defs>
<rect width="1080" height="1350" fill="#0f172a"/>
<image x="0" y="0" width="1080" height="1350" preserveAspectRatio="xMidYMid slice" href="data:${mimeForExt(remoteVisual.ext)};base64,${remoteVisual.buffer.toString('base64')}"/>
<rect width="1080" height="1350" fill="url(#editorialShade)"/>
<path d="M0 72 L740 56 L700 360 L0 430 Z" fill="url(#editorialTitleVeil)"/>
<text x="76" y="112" font-family="${FONT_STACK}" font-size="24" font-weight="900" fill="${variant === 'quote' ? '#475569' : '#ffffffcc'}">${esc(displayChannelName(studio))} · ${String(card?.page ?? 2).padStart(2, '0')}</text>
<g filter="url(#softText)">
${svgTextLines(card?.title, 76, 240, 62, 74, 13, 2, { fill: titleFill, weight: 900, maxWidth: 900 })}
</g>
${visualOverlay}
<rect x="72" y="${footerY}" width="936" height="${footerHeight}" rx="34" fill="#020617c8" filter="url(#softPanel)"/>
${svgTextLines(footerText, 108, footerTextY, 32, 50, 27, variant === 'checklist' ? 2 : 3, { fill: bodyFill, weight: 600, maxWidth: 860 })}
${variant !== 'checklist' && card?.emphasis ? `<text x="108" y="1266" font-family="${FONT_STACK}" font-size="24" font-weight="800" fill="#ffffffc9">${esc(card.emphasis)}</text>` : ''}
</svg>`;
}

function editorialVisualOverlay({ card, style: s, variant, labels }) {
  if (variant === 'checklist') {
    const items = cardTextLines(card?.body, 24, 4).slice(0, 3);
    return `<g opacity="0.96" filter="url(#softPanel)">
${items.map((item, index) => {
  const y = 520 + index * 114;
  return `<rect x="104" y="${y}" width="760" height="76" rx="26" fill="#ffffffe8"/>
<circle cx="148" cy="${y + 38}" r="18" fill="${index === 0 ? s.accent : '#64748b'}"/>
<path d="M139 ${y + 38} L146 ${y + 46} L160 ${y + 30}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
${svgTextLines(item, 184, y + 49, 26, 32, 24, 1, { fill: s.ink, weight: 850 })}`;
}).join('')}
</g>`;
  }
  if (variant === 'comparison') {
    const items = labels.length ? labels : ['기준 A', '기준 B', '체크'];
    return `<g opacity="0.94" filter="url(#softPanel)">
<path d="M164 520 C324 468, 476 596, 642 528 S818 458, 932 560" fill="none" stroke="${s.accent}" stroke-width="10" stroke-linecap="round"/>
${items.slice(0, 3).map((item, index) => {
  const x = 110 + index * 286;
  const y = 600 + (index % 2) * 52;
  return `<rect x="${x}" y="${y}" width="244" height="78" rx="28" fill="#ffffffe8"/>
${svgTextLines(item, x + 28, y + 50, 24, 30, 10, 1, { fill: s.ink, weight: 900 })}`;
}).join('')}
</g>`;
  }
  if (variant === 'data') {
    const items = labels.length ? labels : ['신호 1', '신호 2', '신호 3'];
    return `<g opacity="0.94" filter="url(#softPanel)">
${items.slice(0, 3).map((item, index) => {
  const x = 132 + index * 220;
  const h = 92 + index * 42;
  const y = 760 - h;
  return `<rect x="${x}" y="${y}" width="120" height="${h}" rx="18" fill="${index === 2 ? s.accent : '#ffffffd9'}"/>
${svgTextLines(item, x - 18, 806, 22, 28, 9, 1, { fill: '#fff', weight: 900 })}`;
}).join('')}
</g>`;
  }
  if (variant === 'research') {
    const items = labels.length ? labels : ['거리', '시간', '신뢰'];
    return `<g opacity="0.95" filter="url(#softPanel)">
<rect x="82" y="502" width="520" height="240" rx="34" fill="#ffffffe6"/>
${items.slice(0, 3).map((item, index) => `<rect x="122" y="${542 + index * 58}" width="${pillWidth(item, 150, 390)}" height="38" rx="19" fill="${index === 0 ? s.accent : '#e2e8f0'}"/>
${svgTextLines(item, 142, 568 + index * 58, 20, 24, 14, 1, { fill: index === 0 ? '#fff' : s.ink, weight: 900 })}`).join('')}
<path d="M130 714 C220 680, 330 742, 470 704" fill="none" stroke="${s.accent}" stroke-width="8" stroke-linecap="round"/>
</g>`;
  }
  return '';
}

function generatedQuoteFallbackScene(card, studio) {
  const text = `${card?.title ?? ''} ${card?.body ?? ''} ${studio?.label ?? ''}`;
  if (/어린이집|유치원|등원|감기|아이/.test(text)) {
    return `<rect width="1080" height="1350" fill="#dfe7ef"/>
<rect x="0" y="0" width="1080" height="520" fill="#eef4f8"/>
<rect x="120" y="150" width="260" height="320" rx="28" fill="#f7d7dc" opacity="0.75"/>
<rect x="650" y="120" width="250" height="350" rx="28" fill="#dbeafe" opacity="0.72"/>
<circle cx="290" cy="420" r="118" fill="#f2c7a7" opacity="0.82"/>
<circle cx="720" cy="410" r="128" fill="#cbd5e1" opacity="0.88"/>
<rect x="430" y="510" width="250" height="130" rx="36" fill="#facc15" opacity="0.68"/>
<rect x="720" y="550" width="178" height="70" rx="18" fill="#94a3b8" opacity="0.55"/>`;
  }
  return `<rect width="1080" height="1350" fill="#e2e8f0"/>
<circle cx="870" cy="250" r="170" fill="#bfdbfe" opacity="0.55"/>
<circle cx="170" cy="780" r="220" fill="#fecdd3" opacity="0.50"/>
<rect x="120" y="160" width="780" height="560" rx="70" fill="#ffffff66"/>
<path d="M110 900 C270 820, 420 980, 570 900 S830 780, 1010 910" fill="none" stroke="#94a3b8" stroke-width="28" opacity="0.55"/>`;
}

function generatedComparisonFallbackScene(card, studio) {
  const text = `${card?.title ?? ''} ${card?.body ?? ''} ${studio?.label ?? ''}`;
  if (/어린이집|유치원|등원|감기|아이/.test(text)) {
    return `<rect width="1080" height="1350" fill="#dfe8f1"/>
<rect x="0" y="0" width="1080" height="560" fill="#f7fbff"/>
<rect x="110" y="210" width="260" height="180" rx="32" fill="#fbcfe8" opacity="0.56"/>
<rect x="684" y="178" width="250" height="230" rx="32" fill="#bfdbfe" opacity="0.62"/>
<circle cx="310" cy="510" r="116" fill="#f0c4a8" opacity="0.76"/>
<circle cx="718" cy="500" r="126" fill="#cbd5e1" opacity="0.82"/>
<rect x="402" y="590" width="230" height="88" rx="28" fill="#fbbf24" opacity="0.58"/>`;
  }
  return `<rect width="1080" height="1350" fill="#e8eef5"/>
<rect x="70" y="118" width="400" height="560" rx="54" fill="#dbeafe" opacity="0.50"/>
<rect x="580" y="210" width="350" height="500" rx="54" fill="#fecdd3" opacity="0.44"/>
<path d="M98 760 C270 700, 370 830, 540 760 S810 660, 1010 790" fill="none" stroke="#94a3b8" stroke-width="30" opacity="0.38"/>`;
}

function generatedChecklistFallbackScene(card, studio) {
  const text = `${card?.title ?? ''} ${card?.body ?? ''} ${studio?.label ?? ''}`;
  if (/어린이집|유치원|등원|감기|아이/.test(text)) {
    return `<rect width="1080" height="1350" fill="#e4ecf4"/>
<rect x="0" y="0" width="1080" height="620" fill="#f8fbff"/>
<rect x="112" y="190" width="184" height="150" rx="28" fill="#f9a8d4" opacity="0.52"/>
<rect x="332" y="170" width="230" height="170" rx="28" fill="#fef3c7" opacity="0.58"/>
<rect x="640" y="170" width="250" height="180" rx="30" fill="#bfdbfe" opacity="0.62"/>
<circle cx="232" cy="452" r="88" fill="#f2c7a7" opacity="0.72"/>
<rect x="430" y="430" width="260" height="120" rx="36" fill="#facc15" opacity="0.58"/>`;
  }
  return `<rect width="1080" height="1350" fill="#edf2f7"/>
<circle cx="862" cy="220" r="170" fill="#bae6fd" opacity="0.46"/>
<circle cx="170" cy="680" r="210" fill="#fecdd3" opacity="0.42"/>
<rect x="134" y="170" width="770" height="400" rx="58" fill="#ffffff61"/>`;
}

function generatedResearchFallbackScene(card, studio) {
  const text = `${card?.title ?? ''} ${card?.body ?? ''} ${studio?.label ?? ''}`;
  if (/어린이집|유치원|등원|감기|아이/.test(text)) {
    return `<rect width="1080" height="1350" fill="#efe7dc"/>
<rect x="0" y="0" width="1080" height="650" fill="#f8f3ea"/>
<rect x="126" y="188" width="340" height="410" rx="36" fill="#fff" opacity="0.54"/>
<rect x="602" y="158" width="270" height="380" rx="36" fill="#dbeafe" opacity="0.44"/>
<circle cx="302" cy="506" r="102" fill="#f2c7a7" opacity="0.70"/>
<path d="M130 700 C284 642, 410 742, 560 694 S822 622, 990 724" fill="none" stroke="#94a3b8" stroke-width="22" opacity="0.46"/>`;
  }
  return `<rect width="1080" height="1350" fill="#eee7da"/>
<rect x="112" y="132" width="780" height="510" rx="54" fill="#fff7ed" opacity="0.62"/>
<circle cx="890" cy="270" r="150" fill="#fed7aa" opacity="0.38"/>
<path d="M100 720 C260 650, 380 780, 520 720 S780 630, 1000 750" fill="none" stroke="#94a3b8" stroke-width="24" opacity="0.42"/>`;
}

function cleanDisplayText(value) {
  const text = trimLabel(value, 24);
  return isInternalLabel(text) ? '' : text;
}

function renderChecklistCard({ studio, card, style: s, remoteVisual, errors }) {
  if (remoteVisual) return renderEditorialBodyCard({ studio, card, style: s, remoteVisual, variant: 'checklist' });
  const guide = checklistGuide(card);
  const bodyLines = cardTextLines(card?.body, 24, 4);
  const lines = bodyLines.length ? bodyLines : visualItems(card, guide.items);
  const items = lines.length ? lines : guide.items;
  const visual = remoteVisual
    ? `<image x="0" y="0" width="1080" height="1350" preserveAspectRatio="xMidYMid slice" opacity="0.78" href="data:${mimeForExt(remoteVisual.ext)};base64,${remoteVisual.buffer.toString('base64')}"/>`
    : generatedChecklistFallbackScene(card, studio);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
<defs>
<linearGradient id="checklistShade" x1="0" x2="0" y1="0" y2="1">
<stop offset="0%" stop-color="#f8fafc" stop-opacity="0.70"/>
<stop offset="58%" stop-color="#f8fafc" stop-opacity="0.32"/>
<stop offset="100%" stop-color="#020617" stop-opacity="0.78"/>
</linearGradient>
<filter id="checklistPanel" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#020617" flood-opacity="0.18"/></filter>
</defs>
<rect width="1080" height="1350" fill="#eef2f7"/>
${visual}
<rect width="1080" height="1350" fill="url(#checklistShade)"/>
<rect x="70" y="78" width="${pillWidth(guide.eyebrow, 290, 690)}" height="60" rx="30" fill="#ffffffd9" filter="url(#checklistPanel)"/>
${svgTextLines(guide.eyebrow, 102, 118, 25, 30, 24, 1, { fill: '#334155', weight: 900 })}
${svgTextLines(card?.title, 72, 260, 66, 78, 12, 2, { fill: s.ink, weight: 900 })}
${svgTextLines(card?.emphasis || guide.emphasis, 76, 418, 30, 42, 26, 2, { fill: s.accent, weight: 900 })}
<rect x="96" y="514" width="888" height="520" rx="44" fill="#fffffff2" filter="url(#checklistPanel)"/>
<line x1="166" y1="598" x2="166" y2="910" stroke="${s.accent}" stroke-width="8" stroke-linecap="round" opacity="0.28"/>
${items.slice(0, 3).map((line, index) => {
  const y = 574 + index * 152;
  return `<circle cx="166" cy="${y + 46}" r="32" fill="${index === 0 ? s.accent : '#64748b'}"/>
<text x="166" y="${y + 57}" font-family="${FONT_STACK}" font-size="26" text-anchor="middle" font-weight="900" fill="#fff">✓</text>
<rect x="220" y="${y}" width="700" height="92" rx="26" fill="#f8fafc" stroke="#e2e8f0" stroke-width="3"/>
${svgTextLines(line, 252, y + 58, 31, 40, 23, 1, { fill: s.ink, weight: 900 })}`;
}).join('')}
<rect x="76" y="1136" width="932" height="132" rx="34" fill="#020617cf"/>
${svgTextLines(guide.tip, 112, 1206, 28, 40, 31, 2, { fill: '#fff', weight: 900 })}
</svg>`;
}

function renderResearchCard({ studio, card, style: s, remoteVisual, errors }) {
  if (remoteVisual) return renderEditorialBodyCard({ studio, card, style: s, remoteVisual, variant: 'research' });
  const labels = visualItems(card, researchFallbackLabels(card, studio));
  const visual = remoteVisual
    ? `<image x="0" y="0" width="1080" height="1350" preserveAspectRatio="xMidYMid slice" opacity="0.74" href="data:${mimeForExt(remoteVisual.ext)};base64,${remoteVisual.buffer.toString('base64')}"/>`
    : generatedResearchFallbackScene(card, studio);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
<defs>
<linearGradient id="researchShade" x1="0" x2="0" y1="0" y2="1">
<stop offset="0%" stop-color="#fff7ed" stop-opacity="0.62"/>
<stop offset="54%" stop-color="#f8fafc" stop-opacity="0.28"/>
<stop offset="100%" stop-color="#020617" stop-opacity="0.70"/>
</linearGradient>
<filter id="researchPaper" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#020617" flood-opacity="0.18"/></filter>
</defs>
<rect width="1080" height="1350" fill="#f5f0e8"/>
${visual}
<rect width="1080" height="1350" fill="url(#researchShade)"/>
<text x="74" y="116" font-family="${FONT_STACK}" font-size="24" font-weight="900" fill="#475569">${esc(displayChannelName(studio))} · ${String(card?.page ?? 4).padStart(2, '0')}</text>
${svgTextLines(card?.title, 74, 238, 62, 74, 13, 2, { fill: s.ink, weight: 900 })}
<g transform="rotate(-2 540 620)">
<rect x="104" y="372" width="820" height="520" rx="30" fill="#fffaf0" filter="url(#researchPaper)"/>
<rect x="104" y="372" width="820" height="74" rx="30" fill="#0f172a"/>
<text x="142" y="420" font-family="${FONT_STACK}" font-size="24" font-weight="900" fill="#fff">확인 메모</text>
${labels.slice(0, 3).map((label, i) => `<rect x="${142 + i * 250}" y="490" width="210" height="58" rx="29" fill="#ffffff" stroke="#e2e8f0" stroke-width="3"/>
${svgTextLines(label, 166 + i * 250, 527, 22, 28, 9, 1, { fill: '#64748b', weight: 900 })}`).join('')}
${svgTextLines(card?.body, 142, 648, 36, 56, 23, 3, { fill: s.ink, weight: 900 })}
<path d="M148 824 C260 784, 350 852, 458 812 S660 766, 820 818" fill="none" stroke="${s.accent}" stroke-width="12" stroke-linecap="round" opacity="0.82"/>
</g>
<rect x="74" y="1014" width="904" height="164" rx="34" fill="#020617bf"/>
${svgTextLines(card?.emphasis || card?.visualPrompt || '확인한 근거만 다음 카드로 넘겨요.', 110, 1088, 30, 44, 30, 2, { fill: '#fff', weight: 900 })}
</svg>`;
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
    return 'reaction story card: create a topic-specific scene with emotional context and open negative space. Do not create UI cards or white text boxes; TrLab overlays exact title, body, and small sticker points afterward.';
  }
  return 'research note card: title at top, 2-3 small chips, short body in a paper-like panel.';
}

function coverBackplateInstruction(card, studio, plan) {
  const role = card?.role;
  const layout = card?.layout;
  if (role !== 'cover' && layout !== 'cover_text' && layout !== 'cover_photo') return '';
  const topic = [visualTopic({ studio, plan, card }), card?.title, card?.visualPrompt].filter(Boolean).join(' / ');
  return [
    `Cover backplate direction: make a topic-specific full-bleed photographic or high-end 3D editorial background for "${topic}".`,
    'If the topic is Gangnam real estate, use a dense Seoul/Gangnam apartment skyline at night, warm window lights, premium urban atmosphere, slightly top-down or telephoto composition.',
    'Keep the bottom area visually darker and low-detail so TrLab can overlay a large white Korean title there.'
  ].join(' ');
}

function dataBackplateInstruction(card, studio, plan) {
  const role = card?.role;
  const layout = card?.layout;
  if (role !== 'data_scene' && layout !== 'data_chart') return '';
  const topic = cleanTopicParts([visualTopic({ studio, plan, card }), card?.title, card?.visualPrompt]).join(' / ');
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

function visualTopic({ studio, plan, card } = {}) {
  return cleanTopicParts([
    plan?.primaryTopic,
    plan?.selectedHookTitle,
    card?.role === 'cover' ? card?.title : '',
    studio?.selectedHookTitle,
    studio?.label,
    studio?.keyword,
    'TrLab insight'
  ])[0] ?? 'TrLab insight';
}

function cleanTopicParts(parts = []) {
  return parts
    .map((item) => `${item ?? ''}`.trim())
    .filter((item) => item && !isInternalLabel(trimLabel(item, 48)));
}

function referenceVisualGuide(referenceStyle) {
  return {
    handdrawn_research: {
      account: 'memo-style information card',
      cover: 'white space with a short topic label and one editor observation line',
      body: 'hand-drawn research note, data chips, comparison table, small handwritten annotations',
      typography: 'bold Korean headline plus short memo-like body copy',
      avoid: 'generic PowerPoint shapes, copied article titles, long paragraphs'
    },
    photo_hook: {
      account: 'photographic full-bleed template',
      cover: 'topic-specific realistic full-bleed background with a calm safe area for a large title',
      body: 'realistic photo background, short body copy, high-contrast overlay zones',
      typography: 'large bold Korean title plus short high-contrast body copy',
      avoid: 'unrelated stock-photo mood, fake text in the image, copied article titles'
    },
    magazine_story: {
      account: 'illustrated scene template',
      cover: 'topic-specific illustration or editorial scene with clean blank space for text overlay',
      body: 'illustrated background or scene panel, separated title/body areas, soft editorial composition',
      typography: 'clean bold Korean headline and short body copy over generous whitespace',
      avoid: 'abstract decoration only, crowded illustration behind text, copied article titles'
    },
    meme_factcheck: {
      account: 'fact-check board template',
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

function dataFallbackLabels(card, studio) {
  const text = [studio?.label, studio?.keyword, card?.title, card?.body, card?.emphasis].filter(Boolean).join(' ');
  if (/등원|어린이집|유치원|감기|돌봄/.test(text)) return ['등원 고민', '아이 컨디션', '기관 기준'];
  if (/성분|안전|유해|인증|소재|아기 욕조/.test(text)) return ['성분 기준', '사용 조건', '확인 필요'];
  if (/구매|제품|쇼핑|상품|생활템|장바구니/.test(text)) return ['구매 이유', '사용 장면', '반복 언급'];
  return ['대표 신호', '반복 언급', '확인 기준'];
}

function researchFallbackLabels(card, studio) {
  const text = [studio?.label, studio?.keyword, card?.title, card?.body, card?.emphasis].filter(Boolean).join(' ');
  if (/등원|어린이집|유치원|감기|돌봄/.test(text)) return ['부모 현실', '기관 기준', '아이 상태'];
  if (/성분|안전|유해|인증|소재|아기 욕조/.test(text)) return ['제품 기준', '성분 확인', '사용 조건'];
  if (/구매|제품|쇼핑|상품|생활템|장바구니/.test(text)) return ['구매 이유', '가격 기준', '쓸 장면'];
  return ['핵심 신호', '비교 기준', '확인 근거'];
}

function checklistGuide(card) {
  const text = `${card?.title ?? ''} ${card?.body ?? ''} ${card?.emphasis ?? ''}`;
  if (/어린이집|입소|대기|순번|운영 시간|출근 시간|거리/.test(text)) {
    return {
      eyebrow: '마지막으로 확인할 것',
      emphasis: card?.emphasis || '입소 판단 기준',
      items: ['집과 얼마나 가까운가', '출근 시간과 맞는가', '대기 순번만 보고 있진 않은가'],
      tip: '대기 순번보다 거리, 시간, 실제 등하원 동선을 같이 보세요.'
    };
  }
  if (/등원|어린이집|유치원|아이 컨디션/.test(text)) {
    return {
      eyebrow: '보내기 전 확인할 것',
      emphasis: '등원 판단 기준',
      items: ['우리 집 상황과 맞나', '기관 기준이 있나', '아이 컨디션을 봤나'],
      tip: '판단이 애매할수록 상황, 기관 기준, 아이 상태를 나눠보세요.'
    };
  }
  if (/구매|사기|성분|소재|인증|사용 연령|대체품|가격|재구매/.test(text)) {
    return {
      eyebrow: '사기 전 확인할 것',
      emphasis: '구매 판단 기준',
      items: ['실제로 쓸 장면이 있나', '확인 기준이 있나', '다시 살 이유가 있나'],
      tip: '구매 전에는 용도, 기준, 다시 쓸 장면을 먼저 확인하세요.'
    };
  }
  if (/실행|오늘|주의점|방법/.test(text)) {
    return {
      eyebrow: '바로 하기 전 확인할 것',
      emphasis: '실행 기준',
      items: ['오늘 할 수 있나', '주의점이 분명한가', '다시 볼 기준이 있나'],
      tip: '바로 할 수 있는지, 주의점이 분명한지 먼저 확인하세요.'
    };
  }
  return {
    eyebrow: '마지막으로 확인할 것',
    emphasis: '확인 기준',
    items: ['내 상황과 맞나', '비교 기준이 있나', '확인 근거가 있나'],
    tip: '저장할 때는 내 상황, 비교 기준, 확인 근거를 같이 챙기세요.'
  };
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
  const lines = options.maxWidth
    ? cardTextLinesByWidth(value, { limit, maxLines, fontSize, maxWidth: options.maxWidth })
    : cardTextLines(value, limit, maxLines);
  const fit = fitTextMetrics(lines.length, fontSize, lineHeight, maxLines, options);
  return lines.map((line, index) => `<text x="${x}" y="${y + index * fit.lineHeight}" font-family="${FONT_STACK}" font-size="${fit.fontSize}" font-weight="${weight}" fill="${fill}">${esc(line)}</text>`).join('');
}

function svgCenteredLines(value, x, y, fontSize, lineHeight, limit, maxLines, options = {}) {
  const fill = options.fill ?? '#0f172a';
  const weight = options.weight ?? 900;
  const lines = cardTextLines(value, limit, maxLines);
  const fit = fitTextMetrics(lines.length, fontSize, lineHeight, maxLines, options);
  return lines.map((line, index) => `<text x="${x}" y="${y + index * fit.lineHeight}" font-family="${FONT_STACK}" font-size="${fit.fontSize}" text-anchor="middle" font-weight="${weight}" fill="${fill}">${esc(line)}</text>`).join('');
}

function pillWidth(value, min, max) {
  const length = `${value ?? ''}`.trim().length || 10;
  return Math.min(max, Math.max(min, length * 30 + 70));
}

function fitTextMetrics(lineCount, fontSize, lineHeight, designLines, options = {}) {
  if (!lineCount || !designLines || lineCount <= designLines || options.fit === false) return { fontSize, lineHeight };
  const scale = Math.max(options.minScale ?? 0.58, Math.min(1, designLines / lineCount));
  return {
    fontSize: Math.max(16, Math.round(fontSize * scale)),
    lineHeight: Math.max(20, Math.round(lineHeight * scale))
  };
}

function cardTextLinesByWidth(value, { limit = 28, maxLines = 4, fontSize = 32, maxWidth = 800 } = {}) {
  const lines = [];
  formatCardTextForSvg(value).split('\n').forEach((line) => {
    for (const wrapped of wrapLineBySvgWidth(line, { maxWidth, fontSize })) {
      lines.push(wrapped);
    }
  });
  return lines;
}

function formatCardTextForSvg(value) {
  return `${value ?? ''}`
    .replace(/\s[-–—]\s/g, '\n')
    .replace(/(?:^|\s)([-–—•])\s+/g, '\n')
    .replace(/(\d+[.)])\s+/g, '\n$1 ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim().replace(/^[-–—•]\s*/, ''))
    .filter(Boolean)
    .join('\n');
}

function wrapLineBySvgWidth(line, { maxWidth, fontSize }) {
  const text = `${line ?? ''}`.trim();
  if (!text) return [];
  if (estimateSvgTextWidth(text, fontSize) <= maxWidth) return [text];
  const output = [];
  let current = '';
  for (const segment of splitKoreanTextSegments(text)) {
    const next = current ? `${current}${segment}` : segment.trimStart();
    if (current && estimateSvgTextWidth(next, fontSize) > maxWidth) {
      output.push(current.trim());
      current = segment.trimStart();
    } else {
      current = next;
    }
  }
  if (current.trim()) output.push(current.trim());
  return output;
}

function splitKoreanTextSegments(text) {
  return `${text ?? ''}`.split(/(\s+|[,.!?;:，。！？、])/).filter((part) => part !== '');
}

function estimateSvgTextWidth(text, fontSize) {
  return [...`${text ?? ''}`].reduce((width, char) => {
    if (/\s/.test(char)) return width + fontSize * 0.34;
    if (/[.,!?;:，。！？、]/.test(char)) return width + fontSize * 0.36;
    if (/[0-9A-Za-z@._/-]/.test(char)) return width + fontSize * 0.56;
    return width + fontSize * 0.88;
  }, 0);
}

function chartMetrics(card, labelsOrCount = 4) {
  const labels = Array.isArray(labelsOrCount) ? labelsOrCount : [];
  const count = Array.isArray(labelsOrCount) ? labelsOrCount.length : labelsOrCount;
  const labeled = extractLabeledMetrics(card, labels);
  const values = labeled.length ? labeled : extractNumbers([card?.dataPoint, card?.sourceLine, card?.body, card?.emphasis].join(' '));
  const fallbackNames = labels.length ? labels : dataFallbackLabels(card, {});
  const fallback = [80, 62, 44, 30].slice(0, count).map((value, index) => ({
    value,
    name: fallbackNames[index] ?? `신호 ${index + 1}`,
    label: fallbackNames[index] ?? '대표 신호'
  }));
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
  return source.map((item) => trimLabel(item, 18)).filter((item) => item && !isInternalLabel(item)).slice(0, 4);
}

function trimLabel(value, maxLength) {
  const text = `${value ?? ''}`.replace(/\s+/g, ' ').trim();
  return text;
}

function isInternalLabel(value) {
  const text = `${value ?? ''}`.trim();
  if (/Search SERP|Naver|Google|Brave|SERP|네이트판|더쿠|인스티즈|FMKOREA|에펨코리아/i.test(text)) return true;
  if (/https?:|www\.|\.com|\.co\.kr|\.net|\.org/i.test(text)) return true;
  if (/요즘 임출육|twig24|뉴시스|데일리한국|비즈니스포스트/.test(text)) return true;
  if (/[“”"']/.test(text) && text.length > 12) return true;
  if (text.length >= 17 && /[?？…]|걸린|보내면|토로|논란|기사|원문/.test(text)) return true;
  return false;
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
