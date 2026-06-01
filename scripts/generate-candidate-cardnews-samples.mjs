import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const outRoot = path.join(process.cwd(), 'public', 'generated', 'cardnews', 'candidate-samples');
const W = 1080;
const H = 1350;
const font = 'Pretendard, Noto Sans KR, Apple SD Gothic Neo, Malgun Gothic, Arial, sans-serif';

const decks = [
  {
    slug: 'naverpay-qr',
    channel: '@trlab.insight',
    theme: 'brand',
    title: '네이버페이,\n해외 QR 결제 확장',
    subtitle: '마카오 관광청 협업으로 보는 여행 결제 전쟁',
    palette: { bg: '#f5fbf7', ink: '#101828', muted: '#52616f', accent: '#05c46b', accent2: '#2563eb', dark: '#062418' },
    cards: [
      {
        type: 'cover',
        kicker: 'BRAND SIGNAL',
        title: '네이버페이,\n해외 QR 결제 확장',
        body: '결제앱의 경쟁 무대가\n국내 매장에서 여행 동선으로 이동하고 있습니다.',
      },
      {
        type: 'story',
        kicker: 'WHY NOW',
        title: '왜 지금\n여행지 결제가 중요할까?',
        body: '해외여행 회복 이후 간편결제의 접점은\n환전보다 빠른 현장 결제로 옮겨가고 있습니다.\n브랜드는 결제 순간을 여행 경험으로 묶으려 합니다.',
        chips: ['여행 회복', '현지 QR', '첫 결제 경험'],
      },
      {
        type: 'compare',
        kicker: 'SHIFT',
        title: '캠페인의 핵심은\n광고보다 사용 동선',
        leftTitle: '기존 결제',
        leftItems: ['국내 사용 중심', '혜택 안내 위주', '사용처 탐색 필요'],
        rightTitle: '이번 흐름',
        rightItems: ['여행지 사용면 확대', '관광청 협업', '현지 QR 경험'],
      },
      {
        type: 'data',
        kicker: 'DATA SIGNAL',
        title: '신호는\n세 군데서 같이 보입니다',
        chartTitle: '확산 신호',
        bars: [
          { label: '기사 반복', value: 72 },
          { label: '관광 협업', value: 86, highlight: true },
          { label: '사용 경험', value: 64 },
        ],
        takeaway: '해외 결제는 단순 기능이 아니라\n여행 전후의 브랜드 접점을 넓히는 장치입니다.',
      },
      {
        type: 'checklist',
        kicker: 'SAVE THIS',
        title: '다음에 볼 포인트',
        body: '이 캠페인의 성패는 노출량보다\n해외에서 한 번 써보게 만드는 설계에 달려 있습니다.',
        items: ['어느 여행 동선에 들어가는가', '현지 사용처가 충분한가', '첫 사용 보상이 있는가', '국내 재사용으로 이어지는가'],
      },
    ],
  },
  {
    slug: 'ai-semiconductor',
    channel: '@trlab.insight',
    theme: 'tech',
    title: 'AI 반도체,\n10년짜리 판이 커진다',
    subtitle: 'HBM, 가속기, 장비 공급망으로 번지는 AI 수요',
    palette: { bg: '#eef6ff', ink: '#07111f', muted: '#5a6678', accent: '#2563eb', accent2: '#ef4444', dark: '#08111f' },
    cards: [
      {
        type: 'cover',
        kicker: 'TECH MARKET',
        title: 'AI 반도체,\n10년짜리 판이 커진다',
        body: 'AI 모델 경쟁은 결국\n데이터센터와 칩 공급망 경쟁으로 이어집니다.',
      },
      {
        type: 'data',
        kicker: 'MARKET SIZE',
        title: '숫자는 이미\n방향을 말하고 있습니다',
        chartTitle: '시장 확대 흐름',
        bars: [
          { label: '현재 관심', value: 42 },
          { label: '수요 가속', value: 68 },
          { label: '2031 전망', value: 100, highlight: true, valueText: '1238조' },
        ],
        takeaway: 'AI 반도체 시장은 단기 테마보다\n인프라 투자 사이클로 읽어야 합니다.',
      },
      {
        type: 'story',
        kicker: 'BOTTLENECK',
        title: '왜 공급 부족이\n계속 이야기될까?',
        body: 'AI 서비스가 커질수록 데이터센터 증설이 필요합니다.\n그 과정에서 HBM, 가속기, 장비 공급이\n동시에 압박을 받습니다.',
        chips: ['데이터센터', 'HBM', '가속기'],
      },
      {
        type: 'compare',
        kicker: 'INVESTOR VIEW',
        title: '투자자가 봐야 할\n두 개의 축',
        leftTitle: '수요 쪽',
        leftItems: ['AI 서비스 확산', '데이터센터 증설', '고성능 칩 필요'],
        rightTitle: '공급 쪽',
        rightItems: ['HBM 병목', '장비 리드타임', '패키징 경쟁'],
      },
      {
        type: 'checklist',
        kicker: 'CHECKLIST',
        title: '체크리스트',
        body: 'AI 반도체는 “좋다”가 아니라\n수요와 공급 중 어디가 더 빠른지 봐야 합니다.',
        items: ['데이터센터 CAPEX 변화', 'HBM 공급 계약', '장비사 수주 잔고', '실적 전망 상향 여부'],
      },
    ],
  },
  {
    slug: 'enterprise-ai',
    channel: '@trlab.insight',
    theme: 'business',
    title: '기업 AI 도입,\n이제 선점 경쟁이다',
    subtitle: '삼성SDS, LG CNS, 오픈AI 한국 행사까지 이어진 AX 신호',
    palette: { bg: '#f7f4ef', ink: '#151515', muted: '#61584f', accent: '#111827', accent2: '#c2410c', dark: '#18130f' },
    cards: [
      {
        type: 'cover',
        kicker: 'BUSINESS PLAYBOOK',
        title: '기업 AI 도입,\n이제 선점 경쟁이다',
        body: '기업 AI는 실험 단계를 지나\n업무 방식과 시장 선점의 언어로 바뀌고 있습니다.',
      },
      {
        type: 'story',
        kicker: 'WHY NOW',
        title: 'AI 도입 뉴스가\n동시에 많아진 이유',
        body: '대기업, SI, 글로벌 AI 기업이 같은 방향을 봅니다.\n문제는 어떤 모델을 쓰느냐보다\n어떤 업무 흐름을 먼저 바꾸느냐입니다.',
        chips: ['AX 시장', '업무 혁신', '선점 경쟁'],
      },
      {
        type: 'compare',
        kicker: 'DECISION POINT',
        title: '성공과 실패는\n질문이 다릅니다',
        leftTitle: '실패 질문',
        leftItems: ['누가 써볼까', '교육은 나중에', '성과 기준 없음'],
        rightTitle: '성공 질문',
        rightItems: ['어떤 업무를 줄일까', '반복 작업 자동화', '성과 지표 설계'],
      },
      {
        type: 'data',
        kicker: 'DATA SIGNAL',
        title: '도입 경쟁은\n세 신호로 읽습니다',
        chartTitle: 'AX 확산 신호',
        bars: [
          { label: '기업 수요', value: 82 },
          { label: '교육 필요', value: 74 },
          { label: '컨설팅 시장', value: 88, highlight: true },
        ],
        takeaway: '기업 AI 도입은 기술 뉴스가 아니라\n교육, 운영, 책임 체계까지 묶인 시장 경쟁입니다.',
      },
      {
        type: 'checklist',
        kicker: 'ACTION',
        title: '실무자가 볼 기준',
        body: '우리 회사가 AI를 “쓴다”고 말하기 전에\n업무 단위로 바뀐 것이 있는지 먼저 봐야 합니다.',
        items: ['반복 업무가 줄었는가', '현업 교육이 설계됐는가', '성과 지표가 정해졌는가', '보안과 책임 기준이 있는가'],
      },
    ],
  },
];

await mkdir(outRoot, { recursive: true });
const report = [];

for (const deck of decks) {
  const dir = path.join(outRoot, deck.slug);
  await mkdir(dir, { recursive: true });
  const files = [];

  for (const [index, card] of deck.cards.entries()) {
    const svg = renderCard(deck, card, index + 1);
    const name = String(index + 1).padStart(2, '0');
    const svgPath = path.join(dir, `${name}.svg`);
    const pngPath = path.join(dir, `${name}.png`);
    await writeFile(svgPath, svg, 'utf8');
    await sharp(Buffer.from(svg), { density: 192 }).resize(W, H, { fit: 'fill' }).png().toFile(pngPath);
    files.push(pngPath);
  }

  const contact = path.join(outRoot, `${deck.slug}-contact.png`);
  await makeContactSheet(files, contact);
  report.push({
    slug: deck.slug,
    title: deck.title.replace(/\n/g, ' '),
    rationale: deck.subtitle,
    contact,
    files,
  });
  console.log(`${deck.slug} -> ${contact}`);
}

await writeFile(path.join(outRoot, 'report.json'), JSON.stringify(report, null, 2), 'utf8');

function renderCard(deck, card, page) {
  const p = deck.palette;
  const isCover = card.type === 'cover';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="fadeBottom" x1="0" x2="0" y1="0" y2="1">
    <stop offset="0%" stop-color="#000000" stop-opacity="0"/>
    <stop offset="58%" stop-color="#000000" stop-opacity=".12"/>
    <stop offset="100%" stop-color="#000000" stop-opacity=".82"/>
  </linearGradient>
  <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#020617" flood-opacity="0.18"/>
  </filter>
</defs>
<rect width="${W}" height="${H}" fill="${p.bg}"/>
${background(deck.theme, p, isCover)}
<text x="72" y="92" font-family="${font}" font-size="24" font-weight="900" fill="${isCover ? '#ffffffcc' : '#ffffffd9'}">${esc(deck.channel)} · ${String(page).padStart(2, '0')}</text>
${contentFor(card, deck, p)}
</svg>`;
}

function contentFor(card, deck, p) {
  if (card.type === 'cover') return cover(deck, card, p);
  if (card.type === 'story') return story(card, p);
  if (card.type === 'compare') return compare(card, p);
  if (card.type === 'data') return dataChart(card, p);
  if (card.type === 'checklist') return checklist(card, p);
  return story(card, p);
}

function background(theme, p, isCover) {
  if (theme === 'brand') {
    const marks = Array.from({ length: 30 }, (_, i) => {
      const x = 60 + (i % 6) * 190 + (Math.floor(i / 6) % 2) * 42;
      const y = 120 + Math.floor(i / 6) * 150;
      const c = i % 3 === 0 ? p.accent : i % 3 === 1 ? p.accent2 : '#ffffff';
      return `<g transform="translate(${x} ${y}) rotate(${(i % 5) * 9 - 18})" opacity="${isCover ? .82 : .18}">
  <rect x="-48" y="-34" width="96" height="68" rx="18" fill="${c}" opacity=".72"/>
  <circle cx="-18" cy="0" r="13" fill="#fff" opacity=".8"/>
  <circle cx="20" cy="0" r="13" fill="#fff" opacity=".8"/>
</g>`;
    }).join('');
    return `<rect width="${W}" height="${isCover ? H : 160}" fill="${p.dark}"/>
${marks}
<path d="M0 ${isCover ? 430 : 142} C250 ${isCover ? 340 : 96} 380 ${isCover ? 520 : 172} 620 ${isCover ? 410 : 126} S900 ${isCover ? 350 : 105} 1080 ${isCover ? 450 : 150} L1080 0 L0 0 Z" fill="#ffffff18"/>
${isCover ? '<rect width="1080" height="1350" fill="url(#fadeBottom)"/>' : ''}`;
  }

  if (theme === 'tech') {
    const circuits = Array.from({ length: 12 }, (_, i) => `<path d="M${60 + i * 92} 70 V${490 + (i % 3) * 44} M${30 + i * 92} ${180 + (i % 4) * 70} H${170 + i * 92}" stroke="${i % 2 ? p.accent : '#38bdf8'}" stroke-width="2" opacity="${isCover ? .32 : .18}"/>`).join('');
    const chips = Array.from({ length: 42 }, (_, i) => `<rect x="${48 + (i % 7) * 146}" y="${120 + Math.floor(i / 7) * 108}" width="58" height="58" rx="8" fill="${i % 4 === 0 ? p.accent2 : p.accent}" opacity="${isCover ? .22 : .10}"/>`).join('');
    return `<rect width="${W}" height="${isCover ? H : 160}" fill="${p.dark}"/>
${circuits}
${chips}
${isCover ? '<rect width="1080" height="1350" fill="url(#fadeBottom)"/>' : ''}`;
  }

  const skyline = Array.from({ length: 13 }, (_, i) => {
    const h = 170 + (i % 5) * 56;
    return `<rect x="${35 + i * 82}" y="${430 - h}" width="56" height="${h}" fill="#fff" opacity="${isCover ? .16 : .08}"/>
${Array.from({ length: 5 }, (_, j) => `<rect x="${46 + i * 82}" y="${285 - h + j * 52}" width="10" height="18" fill="#f59e0b" opacity="${isCover ? .42 : .16}"/>`).join('')}`;
  }).join('');
  return `<rect width="${W}" height="${isCover ? H : 160}" fill="${p.dark}"/>
<path d="M72 ${isCover ? 430 : 150} H1008" stroke="#ffffff55" stroke-width="2"/>
${skyline}
${isCover ? '<rect width="1080" height="1350" fill="url(#fadeBottom)"/>' : ''}`;
}

function cover(deck, card, p) {
  return `<rect x="0" y="620" width="1080" height="730" fill="#000" opacity=".62"/>
<text x="72" y="170" font-family="${font}" font-size="26" font-weight="900" fill="${p.accent}">${esc(card.kicker)}</text>
${textLines(card.title, 72, 760, 88, 104, 9, 3, '#fff')}
<rect x="72" y="1045" width="170" height="10" rx="2" fill="${p.accent}"/>
${textLines(card.body, 72, 1128, 37, 50, 17, 3, '#fff')}
<text x="72" y="1300" font-family="${font}" font-size="25" font-weight="900" fill="#ffffffc7">${esc(deck.subtitle)}</text>`;
}

function story(card, p) {
  return `<text x="72" y="192" font-family="${font}" font-size="25" font-weight="900" fill="${p.accent}">${esc(card.kicker)}</text>
${textLines(card.title, 72, 330, 72, 88, 10, 3, p.ink)}
<rect x="72" y="525" width="936" height="468" rx="18" fill="#fff" stroke="#e5e7eb" stroke-width="2" filter="url(#softShadow)"/>
${textLines(card.body, 116, 635, 37, 58, 21, 6, p.ink)}
${(card.chips ?? []).map((chip, i) => `<rect x="${116 + i * 224}" y="884" width="190" height="60" rx="8" fill="${i === 0 ? p.accent : '#eef2f7'}"/>
<text x="${211 + i * 224}" y="923" font-family="${font}" font-size="21" text-anchor="middle" font-weight="900" fill="${i === 0 ? '#fff' : p.ink}">${esc(chip)}</text>`).join('')}`;
}

function compare(card, p) {
  return `<text x="72" y="192" font-family="${font}" font-size="25" font-weight="900" fill="${p.accent2}">${esc(card.kicker)}</text>
${textLines(card.title, 72, 330, 68, 84, 11, 3, p.ink)}
${compareBox(72, 545, card.leftTitle, card.leftItems, p, false)}
${compareBox(572, 545, card.rightTitle, card.rightItems, p, true)}`;
}

function compareBox(x, y, title, items, p, active) {
  return `<rect x="${x}" y="${y}" width="436" height="560" rx="18" fill="${active ? p.ink : '#fff'}" stroke="${active ? p.ink : '#d1d5db'}" stroke-width="2" filter="url(#softShadow)"/>
<text x="${x + 34}" y="${y + 78}" font-family="${font}" font-size="34" font-weight="900" fill="${active ? '#fff' : p.ink}">${esc(title)}</text>
${items.map((item, i) => `<rect x="${x + 34}" y="${y + 138 + i * 116}" width="368" height="76" rx="8" fill="${active ? '#ffffff18' : '#f8fafc'}"/>
${textLines(item, x + 62, y + 184 + i * 116, 25, 31, 12, 2, active ? '#fff' : p.ink)}`).join('')}`;
}

function dataChart(card, p) {
  const bars = card.bars ?? [];
  const max = Math.max(...bars.map(b => b.value), 1);
  const step = 230;
  const start = 216;
  return `<text x="72" y="184" font-family="${font}" font-size="25" font-weight="900" fill="${p.accent}">${esc(card.kicker)}</text>
${textLines(card.title, 72, 318, 68, 84, 11, 3, p.ink)}
<rect x="72" y="545" width="936" height="430" rx="18" fill="#fff" stroke="#e5e7eb" stroke-width="2" filter="url(#softShadow)"/>
<text x="118" y="618" font-family="${font}" font-size="30" font-weight="900" fill="${p.accent}">${esc(card.chartTitle)}</text>
<line x1="140" y1="870" x2="940" y2="870" stroke="${p.ink}" stroke-width="4"/>
${bars.map((bar, i) => {
    const width = 116;
    const x = start + i * step;
    const h = Math.max(82, Math.round((bar.value / max) * 230));
    const y = 870 - h;
    const fill = bar.highlight ? p.accent2 : p.accent;
    return `<rect x="${x}" y="${y}" width="${width}" height="${h}" rx="3" fill="${fill}"/>
<text x="${x + width / 2}" y="${y - 22}" font-family="${font}" font-size="27" text-anchor="middle" font-weight="900" fill="${fill}">${esc(bar.valueText ?? String(bar.value))}</text>
${centerLines(bar.label, x + width / 2, 922, 22, 29, 7, 2, p.ink)}`;
  }).join('')}
<rect x="72" y="1022" width="936" height="226" rx="18" fill="${p.dark}"/>
${textLines(card.takeaway, 114, 1106, 34, 50, 21, 3, '#fff')}`;
}

function checklist(card, p) {
  return `<text x="72" y="184" font-family="${font}" font-size="25" font-weight="900" fill="${p.accent2}">${esc(card.kicker)}</text>
${textLines(card.title, 72, 318, 72, 88, 10, 3, p.ink)}
${textLines(card.body, 72, 468, 34, 48, 22, 3, p.muted)}
${card.items.map((item, i) => `<rect x="72" y="${610 + i * 122}" width="936" height="88" rx="14" fill="#fff" stroke="#d1d5db" stroke-width="2"/>
<rect x="106" y="${636 + i * 122}" width="36" height="36" rx="6" fill="${p.accent2}"/>
<path d="M116 ${654 + i * 122} l8 9 l18 -20" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
${textLines(item, 174, 666 + i * 122, 29, 34, 22, 1, p.ink)}`).join('')}`;
}

async function makeContactSheet(files, out) {
  const thumbs = await Promise.all(files.map(file => sharp(file).resize(216, 270).png().toBuffer()));
  await sharp({ create: { width: 1080, height: 270, channels: 4, background: '#f1f5f9' } })
    .composite(thumbs.map((input, i) => ({ input, left: i * 216, top: 0 })))
    .png()
    .toFile(out);
}

function textLines(value, x, y, size, lineHeight, limit, maxLines, fill) {
  return splitLines(value, limit, maxLines)
    .map((line, i) => `<text x="${x}" y="${y + i * lineHeight}" font-family="${font}" font-size="${size}" font-weight="900" fill="${fill}">${esc(line)}</text>`)
    .join('');
}

function centerLines(value, x, y, size, lineHeight, limit, maxLines, fill) {
  return splitLines(value, limit, maxLines)
    .map((line, i) => `<text x="${x}" y="${y + i * lineHeight}" font-family="${font}" font-size="${size}" text-anchor="middle" font-weight="900" fill="${fill}">${esc(line)}</text>`)
    .join('');
}

function splitLines(value, limit, maxLines) {
  return `${value ?? ''}`.split('\n').flatMap(line => {
    const clean = line.trim();
    if (!clean) return [''];
    const words = clean.split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';

    for (const word of words) {
      if (word.length > limit) {
        if (current) lines.push(current);
        lines.push(...chunkWord(word, limit));
        current = '';
        continue;
      }

      const next = current ? `${current} ${word}` : word;
      if (next.length <= limit) current = next;
      else {
        if (current) lines.push(current);
        current = word;
      }
    }

    if (current) lines.push(current);
    return lines.length ? lines : [''];
  }).slice(0, maxLines);
}

function chunkWord(word, limit) {
  const chunks = [];
  for (let i = 0; i < word.length; i += limit) chunks.push(word.slice(i, i + limit));
  return chunks;
}

function esc(value) {
  return `${value ?? ''}`.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
}
