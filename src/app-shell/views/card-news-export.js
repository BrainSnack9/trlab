import { cardTextLines, formatCardText } from '@/lib/card-text';

export function makePrompt(studio, plan, card, styleName) {
  return [
    '프리미엄 인스타그램 정보형 카드뉴스 1:1 이미지.',
    `스타일: ${styleName}. 굵은 한국어 제목, 촘촘한 근거, 표/지도/트리/랭킹 같은 구조화된 인포그래픽.`,
    `주제: ${studio.label}. 핵심 각도: ${plan.coreAngle}.`,
    `제목: ${card.title}.`,
    `본문:\n${formatCardText(card.body)}.`,
    `강조 라벨: ${card.emphasis}. 근거: ${card.dataPoint || card.visualPrompt}.`,
    '랜덤 텍스트와 워터마크 금지. 상업용 SNS 계정처럼 고급스럽고 저장하고 싶은 디자인.'
  ].join('\n');
}

export function downloadCard(card, index, studio, style, format) {
  const svg = makeSvg(card, studio, style);
  const name = `${safeName(studio.label)}-${String(index + 1).padStart(2, '0')}`;
  if (format === 'svg') return downloadBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${name}.svg`);
  const image = new Image();
  image.onload = () => {
    const canvas = Object.assign(document.createElement('canvas'), { width: 1080, height: 1080 });
    canvas.getContext('2d').drawImage(image, 0, 0);
    canvas.toBlob((blob) => blob && downloadBlob(blob, `${name}.png`));
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function makeSvg(card, studio, style) {
  if (style.name.includes('지도')) return mapSvg(card, studio, style);
  if (style.name.includes('사다리')) return treeSvg(card, studio, style);
  if (style.name.includes('노트')) return noteSvg(card, studio, style);
  if (style.name.includes('스토리')) return storySvg(card, studio, style);
  return rankingSvg(card, style);
}

function mapSvg(card, studio, s) {
  return base(s, `<text x="80" y="135" font-size="64" font-weight="900">${esc(card.title)}</text><text x="80" y="205" font-size="38" font-weight="900" fill="${s.accent}">${esc(card.emphasis)}</text><rect x="72" y="245" width="936" height="650" fill="#ddd" stroke="#111" stroke-dasharray="8 8"/><circle cx="340" cy="650" r="330" fill="none" stroke="${s.sub}" stroke-width="8" stroke-dasharray="12 12"/><circle cx="760" cy="520" r="300" fill="none" stroke="${s.accent}" stroke-width="8" stroke-dasharray="12 12"/>${chips(['서울','판교','분당','광교','동탄','고덕','성수','수지'])}<text x="600" y="825" font-size="56" font-weight="900" fill="${s.sub}">${esc(studio.label)}</text><text x="80" y="960" font-size="28" font-weight="800">출처/근거: ${esc(card.dataPoint || card.visualPrompt)}</text>`);
}

function rankingSvg(card, s) {
  const cells = ['+467%', '+1021%', '+341%', '+186%', '+90%', '-10%'];
  return base(s, `<text x="72" y="120" font-size="66" font-weight="900">${esc(card.title)}</text><text x="72" y="178" font-size="32" font-weight="900" fill="${s.accent}">${esc(card.emphasis)}</text>${cells.map((v, i) => `<rect x="${72 + (i % 2) * 468}" y="${235 + Math.floor(i / 2) * 150}" width="430" height="125" fill="#fff" stroke="#111" stroke-width="4"/><text x="${95 + (i % 2) * 468}" y="${285 + Math.floor(i / 2) * 150}" font-size="28" font-weight="800">지표 ${i + 1}</text><text x="${95 + (i % 2) * 468}" y="${340 + Math.floor(i / 2) * 150}" font-size="52" font-weight="900" fill="${v.startsWith('-') ? s.sub : s.accent}">${v}</text>`).join('')}${svgLines(card.body, 72, 775, 34, 47, 3)}`);
}

function treeSvg(card, s) {
  return base(s, `<text x="72" y="130" font-size="72" font-weight="900" fill="${s.accent}">${esc(card.title)}</text>${node(390, 220, '내 기준은?')}${line(540, 280, 540, 360)}${node(130, 370, '성장성')}${node(650, 370, '안정성')}${line(280, 430, 280, 520)}${line(800, 430, 800, 520)}${node(80, 530, card.dataPoint || '근거')}${node(600, 530, card.insight || '해석')}${node(320, 720, card.action || '행동')}${line(540, 650, 540, 720)}<text x="96" y="950" font-size="30" font-weight="900">TIP ${esc(card.body).slice(0, 44)}</text>`);
}

function noteSvg(card, s) {
  return base(s, `<rect x="96" y="96" width="888" height="888" rx="28" fill="#fff" stroke="${s.accent}" stroke-width="8"/><text x="150" y="165" font-size="28" font-weight="800" fill="${s.sub}">EP.${String(card.page).padStart(2, '0')}</text><text x="150" y="310" font-size="64" font-weight="900">${esc(card.title)}</text><rect x="150" y="355" width="210" height="10" rx="5" fill="${s.accent}"/>${svgLines(card.body, 150, 475, 34, 55, 4)}<text x="150" y="820" font-size="42" font-weight="900" fill="${s.accent}">${esc(card.emphasis)}</text>`);
}

function storySvg(card, s) {
  return base(s, `<rect x="48" y="48" width="984" height="360" fill="#d7d7d7"/><text x="72" y="465" font-size="46" font-weight="900">${esc(card.title)}</text>${svgLines(card.body, 72, 545, 31, 52, 7)}<text x="72" y="960" font-size="28" font-weight="800" fill="${s.sub}">@trlab.insight</text>`);
}

function base(s, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><rect width="1080" height="1080" fill="${s.bg}"/>${inner}</svg>`;
}

function chips(names) {
  return names.map((v, i) => `<rect x="${150 + (i % 4) * 185}" y="${390 + Math.floor(i / 4) * 120}" rx="18" width="130" height="54" fill="#050505"/><text x="${215 + (i % 4) * 185}" y="${428 + Math.floor(i / 4) * 120}" text-anchor="middle" font-size="28" font-weight="900" fill="#fff">${v}</text>`).join('');
}

const node = (x, y, text) => `<rect x="${x}" y="${y}" width="300" height="70" rx="18" fill="#fff" stroke="#333" stroke-width="3"/><text x="${x + 150}" y="${y + 45}" text-anchor="middle" font-size="28" font-weight="900">${esc(text)}</text>`;
const line = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111" stroke-width="6"/>`;

function svgLines(value, x, y, size, gap, max) {
  return cardTextLines(value, 31, max).map((lineText, i) => `<text x="${x}" y="${y + i * gap}" font-size="${size}" font-weight="800">${esc(lineText)}</text>`).join('');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const safeName = (value) => `${value ?? 'cardnews'}`.replace(/[\\/:*?"<>|]/g, '').slice(0, 32);
const esc = (value) => `${value ?? ''}`.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
