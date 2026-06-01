import { cardTextLines, formatCardText } from '@/lib/card-text';
import { referenceVisualGuide } from './card-news-styles';

export function makePrompt(studio, plan, card, styleName) {
  const guide = referenceVisualGuide(plan.referenceStyle);
  return [
    '프리미엄 인스타그램 정보형 카드뉴스 4:5 이미지.',
    `레퍼런스 스타일: ${plan.referenceStyle || 'handdrawn_research'}.`,
    plan.referencePattern ? `레퍼런스 리듬: ${referencePatternText(plan.referencePattern)}.` : '',
    `레퍼런스 시각 가이드: ${referenceVisualGuideText(guide)}.`,
    `카드 역할: ${card.role || 'content'} / 레이아웃: ${card.layout || 'data_chart'}.`,
    `스타일: ${styleName}. 굵은 한국어 제목, 짧은 본문, 표/그래프/비교/인용 같은 구조화된 카드뉴스.`,
    `주제: ${studio.label}. 핵심 각도: ${plan.coreAngle}.`,
    `제목: ${card.title}.`,
    `본문:\n${formatCardText(card.body)}.`,
    `강조 라벨: ${card.emphasis}.`,
    `시각 요소: ${card.visualPrompt}.`,
    '표지에는 긴 근거를 넣지 말고 큰 후크 문장 위주.',
    '본문에는 evidence, interpretation, action 같은 기획 라벨을 표시하지 말 것.',
    '랜덤 텍스트와 워터마크 금지. 상업용 SNS 계정처럼 고급스럽고 저장하고 싶은 디자인.'
  ].filter(Boolean).join('\n');
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
    `시각 계정: ${guide.account}`,
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
  return rawSvg(`${bg}<text x="80" y="110" font-size="28" font-weight="900" fill="${sub}">@trlab.insight</text><rect x="910" y="70" width="90" height="54" rx="27" fill="${photo ? '#ffffff33' : '#fff'}" stroke="${sub}" stroke-width="2"/><text x="955" y="106" text-anchor="middle" font-size="24" font-weight="900" fill="${sub}">${String(card.page ?? 1).padStart(2, '0')}</text><rect x="80" y="340" width="${Math.min(520, Math.max(230, `${card.emphasis ?? '지금 봐야 할 신호'}`.length * 34))}" height="68" rx="34" fill="${s.accent}"/><text x="112" y="385" font-size="30" font-weight="900" fill="#fff">${esc(card.emphasis || '지금 봐야 할 신호')}</text>${svgText(card.title, 80, 560, 96, 104, 10, 3, { fill: ink })}<rect x="80" y="820" width="180" height="16" rx="8" fill="${photo ? '#fff' : s.accent}"/>${svgLines(card.body, 82, 930, 42, 62, 3, ink)}${labels.map((label, i) => `<rect x="${80 + i * 270}" y="1085" width="230" height="58" rx="29" fill="${photo ? '#ffffffdd' : '#fff'}" stroke="${sub}" stroke-width="2"/>${svgText(label, 108 + i * 270, 1122, 24, 30, 8, 1, { fill: photo ? '#111' : s.sub, weight: 900 })}`).join('')}${svgText(studio.label, 80, 1230, 30, 38, 28, 2, { fill: sub })}`);
}

function researchSvg(card, studio, s) {
  const labels = visualItems(card, ['반응 신호', '비교 기준', '확인할 숫자']);
  return base(s, `<text x="80" y="120" font-size="28" font-weight="900" fill="${s.sub}">@trlab.insight · ${String(card.page).padStart(2, '0')}</text>${svgText(card.title, 80, 215, 72, 82, 13, 2)}<rect x="80" y="350" width="920" height="500" rx="42" fill="#f8fafc" stroke="${s.ink}" stroke-width="5" stroke-dasharray="14 12"/>${labels.slice(0, 3).map((label, i) => `<rect x="${130 + i * 250}" y="405" width="210" height="54" rx="27" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>${svgText(label, 154 + i * 250, 440, 24, 30, 7, 1, { fill: s.sub, weight: 900 })}`).join('')}${svgLines(card.body, 130, 555, 44, 68, 4)}<path d="M120 930 C270 880, 390 1030, 540 960 S830 870, 960 950" fill="none" stroke="${s.accent}" stroke-width="14" stroke-linecap="round"/>${svgText(card.emphasis || '핵심 포인트', 80, 1138, 34, 42, 22, 2, { fill: s.sub, weight: 900 })}`);
}

function comparisonSvg(card, studio, s) {
  const labels = visualItems(card, [studio.label, '비교 대상', '과거 기준', '독자 기준']);
  return base(s, `${svgText(card.title, 72, 120, 66, 74, 14, 2)}<text x="72" y="230" font-size="32" font-weight="900" fill="${s.accent}">${esc(card.emphasis)}</text>${labels.map((label, i) => `<rect x="${72 + (i % 2) * 468}" y="${300 + Math.floor(i / 2) * 210}" width="430" height="170" rx="18" fill="#fff" stroke="#111" stroke-width="4"/><text x="${100 + (i % 2) * 468}" y="${358 + Math.floor(i / 2) * 210}" font-size="26" font-weight="900" fill="${s.sub}">${['기준', '상대', '체크', '저장'][i] ?? '체크'}</text>${svgText(label, 100 + (i % 2) * 468, 420 + Math.floor(i / 2) * 210, 34, 43, 11, 2)}`).join('')}<rect x="72" y="790" width="936" height="250" rx="28" fill="#fff" stroke="#111" stroke-width="4"/>${svgLines(card.body, 112, 870, 38, 58, 4)}${svgText(card.emphasis || '비교 기준', 72, 1148, 30, 38, 26, 2, { fill: s.sub, weight: 900 })}`);
}

function dataChartSvg(card, studio, s) {
  const labels = visualItems(card, ['대표 지표', '검색량', '댓글 반응', '가격/비중']);
  const metrics = chartMetrics(card, labels.length);
  return base(s, `${svgText(card.title, 72, 120, 66, 74, 14, 2)}<text x="72" y="230" font-size="32" font-weight="900" fill="${s.accent}">${esc(card.emphasis)}</text><line x1="120" y1="710" x2="980" y2="710" stroke="#111" stroke-width="6"/><line x1="120" y1="290" x2="120" y2="710" stroke="#111" stroke-width="6"/>${metrics.map((metric, i) => `<text x="${245 + i * 180}" y="${680 - metric.height * 4.1}" text-anchor="middle" font-size="28" font-weight="900" fill="${i === 0 ? s.accent : s.sub}">${esc(metric.label)}</text><rect x="${190 + i * 180}" y="${710 - metric.height * 4}" width="110" height="${metric.height * 4}" fill="${i === 0 ? s.accent : s.sub}"/>${svgText(labels[i] ?? `지표${i + 1}`, 160 + i * 180, 760, 22, 28, 7, 2, { weight: 900 })}`).join('')}<rect x="72" y="850" width="936" height="220" rx="28" fill="#fff" stroke="#111" stroke-width="4"/>${svgLines(card.body, 112, 925, 38, 58, 4)}${svgText(card.emphasis || '숫자 하나로 보기', 72, 1168, 30, 38, 26, 2, { fill: s.sub, weight: 900 })}`);
}

function quoteSvg(card, studio, s) {
  return base(s, `<text x="80" y="120" font-size="30" font-weight="900" fill="${s.sub}">사람들이 반응한 지점</text><rect x="86" y="235" width="908" height="650" rx="48" fill="#fff" stroke="#111" stroke-width="5"/>${svgText(card.title, 140, 350, 72, 82, 11, 2)}${svgLines(card.body, 140, 540, 42, 66, 5)}${svgText(card.emphasis || studio.label, 140, 820, 34, 42, 24, 2, { fill: s.accent })}${svgText(card.emphasis || '반응 포인트', 80, 1130, 30, 38, 26, 2, { fill: s.sub, weight: 900 })}`);
}

function checklistSvg(card, studio, s) {
  const lines = visualItems(card, cardTextLines(card.body, 20, 4));
  const items = lines.length ? lines : ['반응이 있었나', '비교가 가능한가', '숫자로 설명되나'];
  return base(s, `<text x="72" y="105" font-size="28" font-weight="900" fill="${s.sub}">저장해두고 볼 기준</text>${svgText(card.title, 72, 205, 76, 84, 13, 2)}<text x="72" y="315" font-size="32" font-weight="900" fill="${s.accent}">${esc(card.emphasis || '다음에 다시 볼 체크리스트')}</text>${items.map((item, i) => `<rect x="90" y="${395 + i * 155}" width="900" height="112" rx="24" fill="#fff" stroke="#111" stroke-width="4"/><circle cx="145" cy="${451 + i * 155}" r="25" fill="${s.accent}"/><text x="145" y="${461 + i * 155}" text-anchor="middle" font-size="30" font-weight="900" fill="#fff">✓</text>${svgText(item, 200, 450 + i * 155, 34, 42, 22, 2)}`).join('')}<rect x="90" y="1080" width="900" height="96" rx="24" fill="#fff" stroke="#111" stroke-width="3"/>${svgText('저장할 때는 비교 기준과 숫자 하나를 같이 남겨요.', 128, 1138, 28, 34, 28, 2, { fill: s.sub, weight: 900 })}${svgText(studio.label, 90, 1245, 26, 34, 34, 1, { fill: s.sub })}`);
}

function mapSvg(card, studio, s) {
  return base(s, `${svgText(card.title, 80, 135, 64, 72, 14, 2)}<text x="80" y="245" font-size="38" font-weight="900" fill="${s.accent}">${esc(card.emphasis)}</text><rect x="72" y="310" width="936" height="690" fill="#ddd" stroke="#111" stroke-dasharray="8 8"/><circle cx="340" cy="690" r="330" fill="none" stroke="${s.sub}" stroke-width="8" stroke-dasharray="12 12"/><circle cx="760" cy="560" r="300" fill="none" stroke="${s.accent}" stroke-width="8" stroke-dasharray="12 12"/>${chips(['서울','판교','분당','광교','동탄','고덕','성수','수지'])}${svgText(studio.label, 600, 880, 48, 58, 10, 2, { fill: s.sub })}${svgText(card.emphasis || card.visualPrompt || '핵심 포인트', 80, 1130, 28, 36, 38, 2, { weight: 800 })}`);
}

function rankingSvg(card, s) {
  const cells = ['+467%', '+1021%', '+341%', '+186%', '+90%', '-10%'];
  const labels = visualItems(card, ['대표 지표', '검색량', '댓글 반응', '가격/비중']);
  return base(s, `${svgText(card.title, 72, 120, 66, 74, 14, 2)}<text x="72" y="230" font-size="32" font-weight="900" fill="${s.accent}">${esc(card.emphasis)}</text>${cells.map((v, i) => `<rect x="${72 + (i % 2) * 468}" y="${280 + Math.floor(i / 2) * 170}" width="430" height="140" fill="#fff" stroke="#111" stroke-width="4"/>${svgText(labels[i % labels.length], 95 + (i % 2) * 468, 335 + Math.floor(i / 2) * 170, 26, 32, 12, 1, { weight: 800 })}<text x="${95 + (i % 2) * 468}" y="${395 + Math.floor(i / 2) * 170}" font-size="52" font-weight="900" fill="${v.startsWith('-') ? s.sub : s.accent}">${v}</text>`).join('')}${svgLines(card.body, 72, 895, 36, 54, 4)}`);
}

function treeSvg(card, s) {
  return base(s, `${svgText(card.title, 72, 130, 72, 80, 13, 2, { fill: s.accent })}${node(390, 300, '내 기준은?')}${line(540, 370, 540, 450)}${node(130, 470, '성장성')}${node(650, 470, '안정성')}${line(280, 540, 280, 640)}${line(800, 540, 800, 640)}${node(80, 660, card.dataPoint || '확인 지표')}${node(600, 660, card.insight || '읽을 포인트')}${node(320, 890, card.action || '저장 기준')}${line(540, 800, 540, 890)}<text x="96" y="1130" font-size="30" font-weight="900">TIP ${esc(card.body).slice(0, 44)}</text>`);
}

function noteSvg(card, s) {
  return base(s, `<rect x="96" y="96" width="888" height="1120" rx="28" fill="#fff" stroke="${s.accent}" stroke-width="8"/><text x="150" y="165" font-size="28" font-weight="800" fill="${s.sub}">EP.${String(card.page).padStart(2, '0')}</text>${svgText(card.title, 150, 295, 64, 72, 13, 3)}<rect x="150" y="435" width="210" height="10" rx="5" fill="${s.accent}"/>${svgLines(card.body, 150, 555, 36, 58, 5)}${svgText(card.emphasis, 150, 1030, 42, 52, 18, 2, { fill: s.accent })}`);
}

function storySvg(card, s) {
  return base(s, `<rect x="48" y="48" width="984" height="520" fill="#d7d7d7"/>${svgText(card.title, 72, 650, 54, 62, 15, 2)}${svgLines(card.body, 72, 800, 34, 56, 7)}<text x="72" y="1190" font-size="28" font-weight="800" fill="${s.sub}">@trlab.insight</text>`);
}

function powerPhotoSvg(card, studio, s) {
  const labels = visualItems(card, [card.emphasis, studio.label, card.dataPoint]).slice(0, 3);
  return rawSvg(`<defs><linearGradient id="powerPhoto" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#52525b"/><stop offset="48%" stop-color="#18181b"/><stop offset="100%" stop-color="#000000"/></linearGradient></defs><rect width="1080" height="1350" fill="url(#powerPhoto)"/><text x="80" y="110" font-size="28" font-weight="900" fill="#ffffffcc">@trlab.insight</text><text x="1000" y="110" text-anchor="end" font-size="26" font-weight="900" fill="#ffffffaa">${String(card.page ?? 1).padStart(2, '0')}</text><rect x="80" y="300" width="${Math.min(560, Math.max(260, `${card.emphasis ?? '믿기 어려운 신호'}`.length * 32))}" height="70" rx="35" fill="${s.accent}"/><text x="114" y="347" font-size="30" font-weight="900" fill="#111">${esc(card.emphasis || '믿기 어려운 신호')}</text>${svgText(card.title, 80, 530, 96, 106, 10, 3, { fill: '#fff' })}${svgLines(card.body, 84, 850, 42, 64, 3, '#f4f4f5')}${labels.map((label, i) => `<rect x="${80 + i * 285}" y="1030" width="250" height="62" rx="31" fill="#ffffff22" stroke="#ffffff55" stroke-width="2"/>${svgText(label, 110 + i * 285, 1070, 24, 30, 9, 1, { fill: '#fff', weight: 900 })}`).join('')}${svgText(card.emphasis || studio.label, 80, 1190, 34, 42, 24, 2, { fill: '#e5e7eb', weight: 900 })}`);
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

function chartMetrics(card, count = 4) {
  const values = extractNumbers([card.dataPoint, card.sourceLine, card.body, card.emphasis].join(' '));
  const normalized = values.length ? values : [78, 46, 62, 28].slice(0, count).map((value) => ({ value, label: `${value}` }));
  const max = Math.max(...normalized.map((item) => item.value), 1);
  return normalized.slice(0, count).map((item) => ({
    label: item.label,
    height: Math.max(24, Math.round((item.value / max) * 100))
  }));
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
    guide.account,
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
