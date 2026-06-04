import { cardTextLines, formatCardText } from '@/lib/card-text';
import { referenceVisualGuide } from './card-news-styles';

export function makePrompt(studio, plan, card, styleName) {
  const guide = referenceVisualGuide(plan.referenceStyle);
  const visualDirection = safeVisualDirection(card);
  return [
    'Create one premium 4:5 Instagram carousel backplate for Korea. Final export is 1080x1350.',
    'Backplate only. Generate the background/photo/editorial scene only. TrLab adds every Korean word, badge, table, chart, label, source, and callout later as SVG.',
    'No visible text or pseudo-data: no readable Korean/English/numerals, logos, UI, captions, signs, document text, product labels, quote/review text, article thumbnails, watermarks, charts, tables, axes, bars, checkmarks, formulas, scorecards, percentages, or filled forms.',
    `Subject context: ${sceneContextSummary([studio.label, plan.coreAngle, card.visualPrompt].filter(Boolean).join(' '))}.`,
    `Backplate style: ${safeStyleName(styleName)}. ${backplateGuideText(plan.referenceStyle, guide)}.`,
    visualDirection ? `Background scene: ${visualDirection}` : '',
    `Overlay reservation: ${overlayZoneText(card)}.`,
    visualDataPromptLine(card),
    'Avoid unrelated stock-photo mood, fake interface screenshots, copied article thumbnails, decorative abstract-only backgrounds, and anything that looks like unverified evidence.'
  ].filter(Boolean).join('\n');
}

function backplateGuideText(referenceStyle, guide = {}) {
  const mapped = {
    handdrawn_research: [
      'memo-style information card',
      'blank paper panels',
      'empty SVG overlay zones',
      'subtle editorial research mood'
    ],
    photo_hook: [
      'photographic full-bleed template',
      'topic-specific realistic background',
      'high-contrast overlay-safe zones only'
    ],
    magazine_story: [
      'editorial illustration template',
      'topic-specific scene',
      'clean blank space for text overlay'
    ],
    meme_factcheck: [
      'editorial board mood only',
      'blank editorial board zones',
      'no claim or evidence contents'
    ]
  }[referenceStyle];
  if (mapped) return [...mapped, 'no typography or readable marks inside the generated image'].join(' / ');
  if (/[가-힣]/.test([guide.account, guide.cover, guide.body].filter(Boolean).join(' '))) {
    return 'premium editorial backplate / blank overlay-safe zones / no typography or readable marks inside the generated image';
  }
  return [
    guide.account,
    guide.cover,
    guide.body,
    'no typography or readable marks inside the generated image'
  ].filter(Boolean).join(' / ').replace(/claim|evidence|chart|graph|table|label|typography/gi, 'blank overlay-safe area');
}

function safeVisualDirection(card = {}) {
  const raw = cleanPromptText(card.visualPrompt, 220)
    .replace(/성분표|효능\s*비교표|비교표|표|테이블|그래프|막대그래프|차트|수치|숫자|라벨|체크\s*표시|체크|댓글|리뷰\s*인용구|말풍선|스크린샷|UI|가격|제품명/gi, '')
    .replace(/2x2|3줄|4개|\d+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (raw && !/[가-힣]/.test(raw)) return `${raw}. Use blank overlay-safe panels only; do not draw text or data artifacts.`;
  if (card.role === 'cover' || card.layout === 'cover_text' || card.layout === 'cover_photo') return 'Strong topic-specific full-bleed subject with a calm lower title-safe area.';
  if (card.role === 'community_signal' || card.layout === 'quote_card') return 'Topic-specific lifestyle reaction scene with generous negative space; no comment UI, quote cards, or speech bubbles.';
  if (card.role === 'data_scene' || card.layout === 'data_chart' || card.role === 'comparison' || card.layout === 'comparison_board') return 'Topic-specific research scene with one blank central panel reserved for verified SVG data.';
  return 'Clean editorial backplate with quiet texture and blank areas for later text overlays.';
}

function visualDataPromptLine(card = {}) {
  if (!card.visualData || typeof card.visualData !== 'object') return '';
  const type = {
    bar_chart: 'chart',
    evidence_table: 'table',
    comparison_table: 'comparison table'
  }[card.visualData.type] ?? 'data panel';
  return `Verified SVG overlay reserved: ${type}. Leave a calm blank panel for that SVG. Do not draw data, source names, rows, bars, labels, or values.`;
}

function overlayZoneText(card = {}) {
  if (card.role === 'cover' || card.layout === 'cover_text' || card.layout === 'cover_photo') return 'large lower title-safe area and small emphasis zone, calm and low-detail';
  if (card.role === 'data_scene' || card.layout === 'data_chart') return 'one blank central SVG data panel plus quiet title/body zones';
  if (card.role === 'comparison' || card.layout === 'comparison_board') return 'blank split SVG comparison panel plus quiet title/body zones';
  if (card.role === 'checklist' || card.layout === 'checklist') return 'three blank horizontal text rows with no checkmarks or numbers';
  if (card.role === 'community_signal' || card.layout === 'quote_card') return 'open lifestyle negative space for title/body and a small emphasis overlay zone';
  return 'quiet title/body/emphasis safe areas';
}

function cleanPromptText(value, maxLength = 1000) {
  return `${value ?? ''}`.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function sceneContextSummary(value = '') {
  const text = `${value ?? ''}`;
  if (/아기\s*욕조|유해성분|환경호르몬|육아용품/i.test(text)) return 'baby product safety check in a Korean parenting context';
  if (/오메가\s*3|omega-?3|EPA|DHA|ALA|피쉬\s*오일|fish\s*oil|영양제/i.test(text)) return 'omega-3 supplement and food-based nutrition decision';
  if (/K뷰티|뷰티|화장품|스킨케어|성분|효능|사용감/i.test(text)) return 'K-beauty skincare ingredient-conscious shopping';
  if (/어린이집|유치원|등원|육아|부모|아이/i.test(text)) return 'Korean childcare availability and parent schedule friction';
  if (/부동산|아파트|강남|서울|홍콩|집값|주거/i.test(text)) return 'urban apartment housing and real-estate decision context';
  if (/코스피|반도체|주식|증시|수급|투자/i.test(text)) return 'Korean stock market and finance research context';
  if (/[가-힣]/.test(text)) return 'topic-specific Korean editorial context';
  return cleanPromptText(text, 180) || 'topic-specific Korean editorial context';
}

function safeStyleName(value = '') {
  const text = `${value ?? ''}`;
  if (/실사|photo/i.test(text)) return 'photographic full-bleed backplate';
  if (/팩트|fact|ranking/i.test(text)) return 'editorial board backplate';
  if (/일러스트|story|illustration/i.test(text)) return 'editorial illustration backplate';
  if (/메모|note|리서치|research/i.test(text)) return 'research note backplate';
  return 'premium editorial backplate';
}

export function makePostCopy(plan) {
  return [
    plan.captionFirstLine,
    plan.captionBody,
    plan.captionCTA,
    Array.isArray(plan.hashtags) ? plan.hashtags.join(' ') : ''
  ].filter(Boolean).join('\n\n');
}

export function makeDeckBrief(plan = {}) {
  const guide = referenceVisualGuide(plan.referenceStyle);
  const pattern = plan.referencePattern;
  return [
    '제작 브리프',
    `레퍼런스 스타일: ${plan.referenceStyle || 'handdrawn_research'}`,
    plan.coreAngle ? `핵심 각도: ${plan.coreAngle}` : '',
    pattern ? `카드 길이: ${pattern.deckLength || ''}` : '',
    pattern ? `표지 리듬: ${pattern.coverRhythm || ''}` : '',
    pattern ? `본문 리듬: ${pattern.bodyRhythm || ''}` : '',
    pattern ? `마무리: ${pattern.endingRhythm || ''}` : '',
    `시각 유형: ${guide.account}`,
    `표지 시각: ${guide.cover}`,
    `본문 시각: ${guide.body}`,
    `타이포: ${guide.typography}`,
    `금지: ${guide.avoid}`
  ].filter(Boolean).join('\n');
}

export function makeCarouselScript(plan) {
  const cards = Array.isArray(plan?.cards) ? plan.cards : [];
  const brief = makeDeckBrief(plan);
  const script = cards.map((card, index) => [
    `Card ${card.page ?? index + 1} · ${roleLabel(card.role)}`,
    `제목: ${card.title ?? ''}`,
    card.emphasis ? `강조: ${card.emphasis}` : '',
    `본문:\n${formatCardText(card.body ?? '')}`,
    card.visualItems?.length ? `시각 라벨: ${card.visualItems.join(' / ')}` : ''
  ].filter(Boolean).join('\n')).join('\n\n---\n\n');
  const postCopy = makePostCopy(plan);
  return [brief, script, postCopy ? `게시 문구\n${postCopy}` : ''].filter(Boolean).join('\n\n===\n\n');
}

export function downloadCard(card, index, studio, style, format) {
  const svg = makeSvg(card, studio, style);
  const name = `${safeName(studio.label)}-${String(index + 1).padStart(2, '0')}`;
  if (format === 'svg') return downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${name}.svg`);
  const image = new Image();
  image.onload = () => {
    const canvas = Object.assign(document.createElement('canvas'), { width: 1080, height: 1350 });
    canvas.getContext('2d').drawImage(image, 0, 0);
    canvas.toBlob((blob) => blob && downloadBlob(blob, `${name}.png`));
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function makeSvg(card, studio, style) {
  if (card.layout === 'cover_text' || card.layout === 'cover_photo') return coverSvg(card, studio, style);
  if (card.layout === 'comparison_board') return comparisonSvg(card, studio, style);
  if (card.layout === 'data_chart') return dataChartSvg(card, studio, style);
  if (card.layout === 'quote_card') return quoteSvg(card, studio, style);
  if (card.layout === 'checklist') return checklistSvg(card, studio, style);
  if (card.layout === 'handwritten_research') return researchSvg(card, studio, style);
  if (style.name.includes('지도')) return mapSvg(card, studio, style);
  if (style.name.includes('사다리')) return treeSvg(card, studio, style);
  if (style.name.includes('파워 포토')) return powerPhotoSvg(card, studio, style);
  if (style.name.includes('노트')) return noteSvg(card, studio, style);
  if (style.name.includes('스토리')) return storySvg(card, studio, style);
  return rankingSvg(card, style);
}

function coverSvg(card, studio, s) {
  const photo = card.layout === 'cover_photo';
  const bg = photo ? `<defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#d9dee7"/><stop offset="54%" stop-color="#8a93a3"/><stop offset="100%" stop-color="#050505"/></linearGradient></defs><rect width="1080" height="1350" fill="url(#g)"/>` : `<rect width="1080" height="1350" fill="${s.bg}"/>`;
  const ink = photo ? '#fff' : s.ink;
  const sub = photo ? '#e2e8f0' : s.sub;
  const labels = visualItems(card, [card.emphasis, studio.label]).slice(0, 3);
  return rawSvg(`${bg}<text x="80" y="110" font-size="28" font-weight="900" fill="${sub}">${esc(channelName(studio))}</text><rect x="910" y="70" width="90" height="54" rx="27" fill="${photo ? '#ffffff33' : '#fff'}" stroke="${sub}" stroke-width="2"/><text x="955" y="106" text-anchor="middle" font-size="24" font-weight="900" fill="${sub}">${String(card.page ?? 1).padStart(2, '0')}</text><rect x="80" y="340" width="${Math.min(520, Math.max(230, `${card.emphasis ?? '지금 봐야 할 신호'}`.length * 34))}" height="68" rx="34" fill="${s.accent}"/><text x="112" y="385" font-size="30" font-weight="900" fill="#fff">${esc(card.emphasis || '지금 봐야 할 신호')}</text>${svgText(card.title, 80, 560, 96, 104, 10, 3, { fill: ink })}<rect x="80" y="820" width="180" height="16" rx="8" fill="${photo ? '#fff' : s.accent}"/>${svgLines(card.body, 82, 930, 42, 62, 3, ink)}${labels.map((label, i) => `<rect x="${80 + i * 270}" y="1085" width="230" height="58" rx="29" fill="${photo ? '#ffffffdd' : '#fff'}" stroke="${sub}" stroke-width="2"/>${svgText(label, 108 + i * 270, 1122, 24, 30, 8, 1, { fill: photo ? '#111' : s.sub, weight: 900 })}`).join('')}${svgText(studio.label, 80, 1230, 30, 38, 28, 2, { fill: sub })}`);
}

function researchSvg(card, studio, s) {
  const labels = visualItems(card, researchFallbackLabels(card, studio));
  return base(s, `<text x="80" y="120" font-size="28" font-weight="900" fill="${s.sub}">${esc(channelName(studio))} · ${String(card.page).padStart(2, '0')}</text>${svgText(card.title, 80, 215, 72, 82, 13, 2)}<rect x="80" y="350" width="920" height="500" rx="42" fill="#f8fafc" stroke="${s.ink}" stroke-width="5" stroke-dasharray="14 12"/>${labels.slice(0, 3).map((label, i) => `<rect x="${130 + i * 250}" y="405" width="210" height="54" rx="27" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>${svgText(label, 154 + i * 250, 440, 24, 30, 7, 1, { fill: s.sub, weight: 900 })}`).join('')}${svgLines(card.body, 130, 555, 44, 68, 4)}<path d="M120 930 C270 880, 390 1030, 540 960 S830 870, 960 950" fill="none" stroke="${s.accent}" stroke-width="14" stroke-linecap="round"/>${svgText(card.emphasis || card.visualPrompt || studio.label || '확인할 포인트', 80, 1138, 34, 42, 22, 2, { fill: s.sub, weight: 900 })}`);
}

function comparisonSvg(card, studio, s) {
  const labels = visualItems(card, [studio.label, '비교 대상', '과거 기준', '독자 기준']);
  return base(s, `${svgText(card.title, 72, 120, 66, 74, 14, 2)}<text x="72" y="230" font-size="32" font-weight="900" fill="${s.accent}">${esc(card.emphasis)}</text>${labels.map((label, i) => `<rect x="${72 + (i % 2) * 468}" y="${300 + Math.floor(i / 2) * 210}" width="430" height="170" rx="18" fill="#fff" stroke="#111" stroke-width="4"/><text x="${100 + (i % 2) * 468}" y="${358 + Math.floor(i / 2) * 210}" font-size="26" font-weight="900" fill="${s.sub}">${['기준', '상대', '체크', '저장'][i] ?? '체크'}</text>${svgText(label, 100 + (i % 2) * 468, 420 + Math.floor(i / 2) * 210, 34, 43, 11, 2)}`).join('')}<rect x="72" y="790" width="936" height="250" rx="28" fill="#fff" stroke="#111" stroke-width="4"/>${svgLines(card.body, 112, 870, 38, 58, 4)}${svgText(card.emphasis || '비교 기준', 72, 1148, 30, 38, 26, 2, { fill: s.sub, weight: 900 })}`);
}

function dataChartSvg(card, studio, s) {
  const labels = visualItems(card, dataFallbackLabels(card, studio));
  const metrics = chartMetrics(card, labels.length);
  return base(s, `${svgText(card.title, 72, 120, 66, 74, 14, 2)}<text x="72" y="230" font-size="32" font-weight="900" fill="${s.accent}">${esc(card.emphasis)}</text><line x1="120" y1="710" x2="980" y2="710" stroke="#111" stroke-width="6"/><line x1="120" y1="290" x2="120" y2="710" stroke="#111" stroke-width="6"/>${metrics.map((metric, i) => `<text x="${245 + i * 180}" y="${680 - metric.height * 4.1}" text-anchor="middle" font-size="28" font-weight="900" fill="${i === 0 ? s.accent : s.sub}">${esc(metric.label)}</text><rect x="${190 + i * 180}" y="${710 - metric.height * 4}" width="110" height="${metric.height * 4}" fill="${i === 0 ? s.accent : s.sub}"/>${svgText(labels[i] ?? `지표${i + 1}`, 160 + i * 180, 760, 22, 28, 7, 2, { weight: 900 })}`).join('')}<rect x="72" y="850" width="936" height="220" rx="28" fill="#fff" stroke="#111" stroke-width="4"/>${svgLines(card.body, 112, 925, 38, 58, 4)}${svgText(card.emphasis || '숫자 하나로 보기', 72, 1168, 30, 38, 26, 2, { fill: s.sub, weight: 900 })}`);
}

function quoteSvg(card, studio, s) {
  const eyebrow = quoteEyebrow(card);
  const points = quotePoints(card, studio);
  return base(s, `<text x="80" y="120" font-size="30" font-weight="900" fill="${s.sub}">${esc(eyebrow)}</text><rect x="80" y="178" width="920" height="910" rx="44" fill="#fff" stroke="#111" stroke-width="4"/><rect x="80" y="178" width="18" height="910" rx="9" fill="${s.accent}"/>${svgText(card.title, 132, 315, 66, 78, 12, 2)}${svgLines(card.body, 132, 515, 38, 58, 3)}${points.map((point, index) => `<rect x="132" y="${755 + index * 118}" width="816" height="82" rx="24" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/><circle cx="176" cy="${796 + index * 118}" r="17" fill="${index === 0 ? s.accent : s.sub}"/>${svgText(point, 215, 806 + index * 118, 28, 34, 26, 1)}`).join('')}<text x="80" y="1160" font-size="24" font-weight="900" fill="#64748b">${esc(card.emphasis || '현실에서 막히는 지점')}</text>${svgText(quoteBottomLine(card, studio), 80, 1228, 28, 38, 31, 2, { fill: '#334155', weight: 900 })}`);
}

function checklistSvg(card, studio, s) {
  const lines = visualItems(card, cardTextLines(card.body, 20, 4));
  const items = lines.length ? lines : ['반응이 있었나', '비교가 가능한가', '숫자로 설명되나'];
  const guide = checklistGuide(card);
  return base(s, `<text x="72" y="105" font-size="28" font-weight="900" fill="${s.sub}">${esc(guide.eyebrow)}</text>${svgText(card.title, 72, 205, 76, 84, 13, 2)}<text x="72" y="315" font-size="32" font-weight="900" fill="${s.accent}">${esc(card.emphasis || guide.emphasis)}</text>${items.map((item, i) => `<rect x="90" y="${395 + i * 155}" width="900" height="112" rx="24" fill="#fff" stroke="#111" stroke-width="4"/><circle cx="145" cy="${451 + i * 155}" r="25" fill="${s.accent}"/><text x="145" y="${461 + i * 155}" text-anchor="middle" font-size="30" font-weight="900" fill="#fff">✓</text>${svgText(item, 200, 450 + i * 155, 34, 42, 22, 2)}`).join('')}<rect x="90" y="1080" width="900" height="96" rx="24" fill="#fff" stroke="#111" stroke-width="3"/>${svgText(guide.tip, 128, 1138, 28, 34, 28, 2, { fill: s.sub, weight: 900 })}${svgText(studio.label, 90, 1245, 26, 34, 34, 1, { fill: s.sub })}`);
}

function mapSvg(card, studio, s) {
  const labels = visualItems(card, mapFallbackLabels(card, studio));
  return base(s, `${svgText(card.title, 80, 135, 64, 72, 14, 2)}<text x="80" y="245" font-size="38" font-weight="900" fill="${s.accent}">${esc(card.emphasis)}</text><rect x="72" y="310" width="936" height="690" fill="#ddd" stroke="#111" stroke-dasharray="8 8"/><circle cx="340" cy="690" r="330" fill="none" stroke="${s.sub}" stroke-width="8" stroke-dasharray="12 12"/><circle cx="760" cy="560" r="300" fill="none" stroke="${s.accent}" stroke-width="8" stroke-dasharray="12 12"/>${chips(labels)}${svgText(studio.label, 600, 880, 48, 58, 10, 2, { fill: s.sub })}${svgText(card.emphasis || card.visualPrompt || '확인할 포인트', 80, 1130, 28, 36, 38, 2, { weight: 800 })}`);
}

function rankingSvg(card, s) {
  const labels = visualItems(card, dataFallbackLabels(card, {}));
  const cells = chartMetrics(card, 6).map((metric) => metric.label);
  return base(s, `${svgText(card.title, 72, 120, 66, 74, 14, 2)}<text x="72" y="230" font-size="32" font-weight="900" fill="${s.accent}">${esc(card.emphasis)}</text>${cells.map((v, i) => `<rect x="${72 + (i % 2) * 468}" y="${280 + Math.floor(i / 2) * 170}" width="430" height="140" fill="#fff" stroke="#111" stroke-width="4"/>${svgText(labels[i % labels.length], 95 + (i % 2) * 468, 335 + Math.floor(i / 2) * 170, 26, 32, 12, 1, { weight: 800 })}<text x="${95 + (i % 2) * 468}" y="${395 + Math.floor(i / 2) * 170}" font-size="52" font-weight="900" fill="${v.startsWith('-') ? s.sub : s.accent}">${v}</text>`).join('')}${svgLines(card.body, 72, 895, 36, 54, 4)}`);
}

function treeSvg(card, s) {
  const labels = visualItems(card, decisionFallbackLabels(card, {}));
  return base(s, `${svgText(card.title, 72, 130, 72, 80, 13, 2, { fill: s.accent })}${node(390, 300, card.emphasis || '판단 기준')}${line(540, 370, 540, 450)}${node(130, 470, labels[0] || '내 상황')}${node(650, 470, labels[1] || '확인 기준')}${line(280, 540, 280, 640)}${line(800, 540, 800, 640)}${node(80, 660, card.dataPoint || labels[2] || '근거 확인')}${node(600, 660, card.insight || labels[3] || '읽을 포인트')}${node(320, 890, card.action || '다음 행동')}${line(540, 800, 540, 890)}<text x="96" y="1130" font-size="30" font-weight="900">TIP ${esc(card.body).slice(0, 44)}</text>`);
}

function noteSvg(card, s) {
  return base(s, `<rect x="96" y="96" width="888" height="1120" rx="28" fill="#fff" stroke="${s.accent}" stroke-width="8"/><text x="150" y="165" font-size="28" font-weight="800" fill="${s.sub}">EP.${String(card.page).padStart(2, '0')}</text>${svgText(card.title, 150, 295, 64, 72, 13, 3)}<rect x="150" y="435" width="210" height="10" rx="5" fill="${s.accent}"/>${svgLines(card.body, 150, 555, 36, 58, 5)}${svgText(card.emphasis, 150, 1030, 42, 52, 18, 2, { fill: s.accent })}`);
}

function storySvg(card, studio, s) {
  return base(s, `<rect x="48" y="48" width="984" height="520" fill="#d7d7d7"/>${svgText(card.title, 72, 650, 54, 62, 15, 2)}${svgLines(card.body, 72, 800, 34, 56, 7)}<text x="72" y="1190" font-size="28" font-weight="800" fill="${s.sub}">${esc(channelName(studio))}</text>`);
}

function powerPhotoSvg(card, studio, s) {
  const labels = visualItems(card, [card.emphasis, studio.label, card.dataPoint]).slice(0, 3);
  return rawSvg(`<defs><linearGradient id="powerPhoto" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#52525b"/><stop offset="48%" stop-color="#18181b"/><stop offset="100%" stop-color="#000000"/></linearGradient></defs><rect width="1080" height="1350" fill="url(#powerPhoto)"/><text x="80" y="110" font-size="28" font-weight="900" fill="#ffffffcc">${esc(channelName(studio))}</text><text x="1000" y="110" text-anchor="end" font-size="26" font-weight="900" fill="#ffffffaa">${String(card.page ?? 1).padStart(2, '0')}</text><rect x="80" y="300" width="${Math.min(560, Math.max(260, `${card.emphasis ?? '믿기 어려운 신호'}`.length * 32))}" height="70" rx="35" fill="${s.accent}"/><text x="114" y="347" font-size="30" font-weight="900" fill="#111">${esc(card.emphasis || '믿기 어려운 신호')}</text>${svgText(card.title, 80, 530, 96, 106, 10, 3, { fill: '#fff' })}${svgLines(card.body, 84, 850, 42, 64, 3, '#f4f4f5')}${labels.map((label, i) => `<rect x="${80 + i * 285}" y="1030" width="250" height="62" rx="31" fill="#ffffff22" stroke="#ffffff55" stroke-width="2"/>${svgText(label, 110 + i * 285, 1070, 24, 30, 9, 1, { fill: '#fff', weight: 900 })}`).join('')}${svgText(card.emphasis || studio.label, 80, 1190, 34, 42, 24, 2, { fill: '#e5e7eb', weight: 900 })}`);
}

function quoteEyebrow(card) {
  const text = `${card?.title ?? ''} ${card?.body ?? ''} ${card?.emphasis ?? ''}`;
  if (/부모|어린이집|유치원|등원|아이|아기|육아/.test(text)) return '현실에서 막히는 순간';
  if (/성분|안전|인증|제품|구매|유해|소재/.test(text)) return '사기 전에 걸리는 질문';
  if (/댓글|반응|커뮤니티|사람들/.test(text)) return '댓글이 모인 이유';
  return '사람들이 멈춘 지점';
}

function quotePoints(card, studio) {
  const text = `${card?.title ?? ''} ${card?.body ?? ''} ${card?.emphasis ?? ''} ${studio?.label ?? ''}`;
  if (/어린이집|유치원|등원|감기|아이 컨디션/.test(text)) return ['아이 컨디션', '출근 시간', '기관 기준'];
  if (/성분|안전|인증|유해|소재|아기 욕조/.test(text)) return ['성분 확인', '사용 조건', '대체 기준'];
  if (/구매|제품|상품|쇼핑|장바구니|생활템/.test(text)) return ['쓸 장면', '가격 이유', '다시 살까'];
  return visualItems(card, ['내 상황과 맞나', '비교 기준이 있나', '반복되는 반응인가']).slice(0, 3);
}

function quoteBottomLine(card, studio) {
  const text = `${card?.title ?? ''} ${card?.body ?? ''} ${studio?.label ?? ''}`;
  if (/어린이집|유치원|등원|감기/.test(text)) return '정답보다 먼저 볼 건 우리 집 상황과 기관 기준이에요.';
  if (/성분|안전|인증|유해|소재/.test(text)) return '불안할수록 제품명보다 확인 기준을 먼저 봐야 해요.';
  if (/구매|제품|상품|쇼핑|생활템/.test(text)) return '저장되는 건 예쁜 사진보다 실제로 쓸 이유예요.';
  return '반응은 결론이 아니라 다음 카드에서 검증할 신호예요.';
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

function decisionFallbackLabels(card, studio) {
  const text = [studio?.label, studio?.keyword, card?.title, card?.body, card?.emphasis].filter(Boolean).join(' ');
  if (/등원|어린이집|유치원|감기|돌봄/.test(text)) return ['아이 상태', '기관 기준', '가족 상황', '등원 판단'];
  if (/성분|안전|유해|인증|소재|아기 욕조/.test(text)) return ['성분 기준', '사용 조건', '대체 기준', '구매 판단'];
  if (/구매|제품|쇼핑|상품|생활템|장바구니/.test(text)) return ['사용 장면', '가격 기준', '재구매 이유', '구매 판단'];
  return ['내 상황', '확인 기준', '근거 확인', '다음 행동'];
}

function mapFallbackLabels(card, studio) {
  const text = [studio?.label, studio?.keyword, card?.title, card?.body, card?.emphasis].filter(Boolean).join(' ');
  if (/장소|여행|카페|놀이터|동네|지역/.test(text)) return ['후보 지역', '방문 동선', '체크 지점', '저장 장소'];
  return decisionFallbackLabels(card, studio);
}

function rawSvg(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">${inner}</svg>`;
}

function base(s, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect width="1080" height="1350" fill="${s.bg}"/>${inner}</svg>`;
}

function chips(names) {
  return names.map((v, i) => `<rect x="${150 + (i % 4) * 185}" y="${430 + Math.floor(i / 4) * 120}" rx="18" width="130" height="54" fill="#050505"/><text x="${215 + (i % 4) * 185}" y="${468 + Math.floor(i / 4) * 120}" text-anchor="middle" font-size="28" font-weight="900" fill="#fff">${v}</text>`).join('');
}

const node = (x, y, text) => `<rect x="${x}" y="${y}" width="300" height="70" rx="18" fill="#fff" stroke="#333" stroke-width="3"/><text x="${x + 150}" y="${y + 45}" text-anchor="middle" font-size="28" font-weight="900">${esc(text)}</text>`;
const line = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111" stroke-width="6"/>`;

function svgLines(value, x, y, size, gap, max, fill = undefined) {
  const fillAttr = fill ? ` fill="${fill}"` : '';
  return cardTextLines(value, 31, max).map((lineText, i) => `<text x="${x}" y="${y + i * gap}" font-size="${size}" font-weight="800"${fillAttr}>${esc(lineText)}</text>`).join('');
}

function svgText(value, x, y, size, gap, limit, max, options = {}) {
  const fillAttr = options.fill ? ` fill="${options.fill}"` : '';
  const weight = options.weight ?? 900;
  return cardTextLines(value, limit, max).map((lineText, i) => `<text x="${x}" y="${y + i * gap}" font-size="${size}" font-weight="${weight}"${fillAttr}>${esc(lineText)}</text>`).join('');
}

function visualItems(card, fallback) {
  return (card.visualItems?.length ? card.visualItems : fallback).filter(Boolean).slice(0, 4);
}

function checklistGuide(card) {
  const text = `${card?.title ?? ''} ${card?.body ?? ''}`;
  if (/등원|어린이집|유치원|아이 컨디션/.test(text)) {
    return { eyebrow: '보내기 전 확인할 것', emphasis: '등원 판단 기준', tip: '판단이 애매할수록 상황, 제도, 아이 컨디션을 나눠보세요.' };
  }
  if (/구매|사기|성분|소재|인증|사용 연령|대체품|가격|재구매/.test(text)) {
    return { eyebrow: '사기 전 확인할 것', emphasis: '구매 판단 기준', tip: '구매 전에는 용도, 기준, 다시 쓸 장면을 먼저 확인하세요.' };
  }
  if (/실행|오늘|주의점|방법/.test(text)) {
    return { eyebrow: '바로 하기 전 확인할 것', emphasis: '실행 기준', tip: '바로 할 수 있는지, 주의점이 분명한지 먼저 확인하세요.' };
  }
  return { eyebrow: '마지막으로 확인할 것', emphasis: '확인 기준', tip: '내 상황, 비교 기준, 확인 근거를 나눠보세요.' };
}

function chartMetrics(card, count = 4) {
  const values = extractNumbers([card.dataPoint, card.sourceLine, card.body, card.emphasis].join(' '));
  const fallbackNames = dataFallbackLabels(card, {});
  const normalized = values.length ? values : [80, 62, 44, 30, 24, 18].slice(0, count).map((value, index) => ({
    value,
    label: fallbackNames[index] ?? `신호 ${index + 1}`
  }));
  const max = Math.max(...normalized.map((item) => item.value), 1);
  return normalized.slice(0, count).map((item) => ({
    label: item.label,
    height: Math.max(24, Math.round((item.value / max) * 100))
  }));
}

function channelName(studio = {}) {
  const text = `${studio?.channelName ?? studio?.manualBrief?.channelName ?? '@trlab.insight'}`.trim();
  if (!text) return '@trlab.insight';
  return text.startsWith('@') ? text : `@${text}`;
}

function extractNumbers(text) {
  return [...`${text ?? ''}`.matchAll(/(\d+(?:,\d{3})*(?:\.\d+)?)(\s*[%％]|개|명|건|회|만|억|조|배|위|원)?/g)]
    .map((match) => {
      const value = Number(match[1].replace(/,/g, ''));
      const unit = (match[2] ?? '').trim();
      return Number.isFinite(value) ? { value, label: `${match[1]}${unit}` } : null;
    })
    .filter(Boolean);
}

function roleLabel(value) {
  return {
    cover: '표지',
    why_now: '왜 지금',
    community_signal: '반응',
    comparison: '비교',
    data_scene: '데이터',
    misconception: '오해',
    content_angle: '각도',
    checklist: '체크',
    closing: '마무리'
  }[value] ?? '카드';
}

function referencePatternText(pattern) {
  return [
    pattern.deckLength,
    pattern.coverRhythm,
    pattern.bodyRhythm,
    pattern.endingRhythm
  ].filter(Boolean).join(' / ');
}

function referenceVisualGuideText(guide) {
  return [
    `유형 ${guide.account}`,
    `표지 ${guide.cover}`,
    `본문 ${guide.body}`,
    `글자 ${guide.typography}`,
    `금지 ${guide.avoid}`
  ].filter(Boolean).join(' / ');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const safeName = (value) => `${value ?? 'cardnews'}`.replace(/[\\/:*?"<>|]/g, '').slice(0, 32);
const esc = (value) => `${value ?? ''}`.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
