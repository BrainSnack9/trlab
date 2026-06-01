import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import sharp from 'sharp';
import { generateCardNewsImage, makeImagePrompt } from '../apps/was/src/core/trlab/modules/services/content/card-image-generator.js';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), 'apps/was/.env.local') });

const outDir = path.join(process.cwd(), 'public', 'generated', 'cardnews', 'final');
const generatedDir = path.join(process.cwd(), 'public');

const studio = {
  id: 'manual-gangnam-realestate-final',
  label: '강남 부동산',
  keyword: '강남 집값 고점 홍콩 부동산 비교',
  channelName: '@trlab.insight',
  sourceMode: 'manual',
  manualBrief: {
    topic: '강남 부동산',
    prompt: '강남 집값이 지금 고점인지 홍콩, 도쿄, 뉴욕 등 글로벌 도시와 비교해 카드뉴스로 설명한다.',
    channelName: '@trlab.insight'
  }
};

const plan = {
  referenceStyle: 'magazine_story',
  coreAngle: '강남 집값이 고점인지 판단하기 위해 홍콩식 급등, 글로벌 도시 비교, 대출·전세·공급 신호를 나눠 보는 카드뉴스',
  summary: '강남 부동산을 감정이 아니라 비교 지표와 리스크 신호로 읽는다.',
  referencePattern: {
    deckLength: '8장',
    coverRhythm: '도시 야경 배경 위 강한 질문',
    bodyRhythm: '도시 배경, 그래프, 비교표, 체크리스트를 한 장씩 분리',
    endingRhythm: '저장할 판단 기준으로 마무리'
  }
};

const style = {
  name: '글로벌 부동산 비교',
  desc: '강남/홍콩/도쿄처럼 지역이나 시장을 비교해 보여줄 때',
  bg: '#f8fafc',
  ink: '#0f172a',
  accent: '#dc2626',
  sub: '#2563eb'
};

const cards = [
  {
    page: 2,
    role: 'data_scene',
    layout: 'data_chart',
    title: '홍콩의 부동산 상승 속도',
    body: '홍콩은 짧은 기간에 집값이 가파르게 뛰며 부담이 커졌습니다.\n강남도 같은 속도인지 비교해서 봐야 합니다.',
    emphasis: '마지막 막대가 현재 평균 집값',
    dataPoint: '2010년 8억, 2015년 13억, 2020년 18억, 현재 평균 집값 24억',
    visualPrompt: '홍콩 야경 고층 아파트 배경 위 집값 상승 막대그래프',
    visualItems: ['2010', '2015', '2020', '현재 평균 집값']
  },
  {
    page: 3,
    role: 'comparison',
    layout: 'comparison_board',
    title: '강남은 홍콩을 닮았을까?',
    body: '둘 다 토지가 부족하고 핵심지 선호가 강합니다.\n하지만 금리, 임대수익률, 정책 리스크는 다르게 움직입니다.',
    emphasis: '닮은 점과 다른 점을 분리',
    dataPoint: '강남/홍콩/도쿄/뉴욕 가격 부담 비교',
    visualPrompt: '홍콩과 서울 강남 스카이라인을 좌우로 비교하는 프리미엄 도시 배경',
    visualItems: ['강남', '홍콩', '공급 제약', '정책 리스크']
  },
  {
    page: 4,
    role: 'data_scene',
    layout: 'data_chart',
    title: '상승을 만든 세 가지 압력',
    body: '핵심지 선호, 공급 부족, 현금 보유 수요가 겹치면 가격은 쉽게 식지 않습니다.\n한 가지 신호만 보면 고점 판단이 흔들립니다.',
    emphasis: '수요·공급·유동성',
    dataPoint: '핵심지 선호 82, 공급 부족 74, 현금 수요 68, 현재 압력 91',
    visualPrompt: '강남 대단지 아파트 야경 배경 위 세 가지 상승 압력 그래프',
    visualItems: ['핵심지 선호', '공급 부족', '현금 수요', '현재 압력']
  },
  {
    page: 5,
    role: 'data_scene',
    layout: 'data_chart',
    title: '고점 신호는 가격보다 거래량',
    body: '가격이 버티더라도 거래량이 먼저 줄면 매수 체력이 약해진 신호일 수 있습니다.\n호가와 실거래의 간격을 같이 봐야 합니다.',
    emphasis: '거래량 둔화 체크',
    dataPoint: '거래량 100, 매물 128, 호가 112, 실거래 체감 71',
    visualPrompt: '강남 부동산 중개업소 불빛과 아파트 야경, 거래량 둔화 그래프',
    visualItems: ['거래량', '매물', '호가', '실거래 체감']
  },
  {
    page: 6,
    role: 'data_scene',
    layout: 'data_chart',
    title: '금리와 전세가율이 버팀목',
    body: '대출금리가 높고 전세가율이 낮으면 매수 부담은 커집니다.\n반대로 전세 수요가 회복되면 하방 압력은 줄어듭니다.',
    emphasis: '금리·전세가율 동시 확인',
    dataPoint: '대출금리 4.2%, 전세가율 52%, 월부담 640만, 현재 부담 88',
    visualPrompt: '강남 아파트 단지와 은행 금리 그래프가 겹쳐 보이는 야간 도시 배경',
    visualItems: ['대출금리', '전세가율', '월부담', '현재 부담']
  },
  {
    page: 7,
    role: 'comparison',
    layout: 'comparison_board',
    title: '앞으로는 두 갈래입니다',
    body: '거래량이 살아나면 신고가 재도전 가능성이 생깁니다.\n거래 없이 호가만 버티면 조정 구간이 길어질 수 있습니다.',
    emphasis: '재상승 vs 긴 조정',
    dataPoint: '거래량 회복 여부가 분기점',
    visualPrompt: '강남 도로가 두 갈래로 갈라지는 야경, 상승과 조정의 분기점',
    visualItems: ['거래량 회복', '신고가 재도전', '거래 절벽', '긴 조정']
  },
  {
    page: 8,
    role: 'checklist',
    layout: 'checklist',
    title: '저장할 고점 체크리스트',
    body: '거래량이 줄었나\n호가와 실거래가 벌어졌나\n전세가율이 받쳐주나\n금리 부담이 낮아졌나',
    emphasis: '네 가지 중 2개 이상이면 신중',
    dataPoint: '',
    visualPrompt: '강남 아파트 야경 위 투자 체크리스트 노트와 펜',
    visualItems: ['거래량', '호가/실거래', '전세가율', '금리 부담']
  }
];

await mkdir(outDir, { recursive: true });

const report = [];
for (const [index, card] of cards.entries()) {
  const prompt = makeImagePrompt({ studio, plan, card, style });
  const checks = promptChecks(card, prompt);
  report.push({ page: card.page, title: card.title, checks, prompt });
  if (checks.some((check) => !check.ok)) {
    throw new Error(`Prompt check failed for card ${card.page}: ${checks.filter((check) => !check.ok).map((check) => check.label).join(', ')}`);
  }

  const { url, provider, model, warnings } = await generateCardNewsImage({ studio, plan, card, style, index: card.page - 1 });
  const sourcePath = path.join(generatedDir, url.replace(/^\//, ''));
  const finalPng = path.join(outDir, `gangnam-${String(card.page).padStart(2, '0')}.png`);
  const buffer = await readFile(sourcePath);
  await sharp(buffer, { density: 192 }).resize(1080, 1350, { fit: 'fill' }).png().toFile(finalPng);
  report.at(-1).image = {
    source: sourcePath,
    finalPng,
    provider,
    model,
    warnings
  };
  console.log(`card ${card.page} -> ${finalPng}`);
}

await writeFile(path.join(outDir, 'gangnam-prompt-report.json'), JSON.stringify(report, null, 2));

function promptChecks(card, prompt) {
  const text = [card.title, card.body, card.emphasis, card.visualPrompt, ...(card.visualItems ?? [])].join(' ');
  return [
    { label: 'topic-in-prompt', ok: /강남|홍콩|부동산|집값|아파트/.test(prompt) },
    { label: 'no-model-text', ok: /Do not render any Korean text/.test(prompt) },
    { label: 'card-title', ok: prompt.includes(card.title) },
    { label: 'visual-direction', ok: prompt.includes(card.visualPrompt) },
    { label: 'card-topic-specific', ok: /강남|홍콩|도쿄|뉴욕|금리|전세|거래량|집값|부동산|아파트/.test(text) }
  ];
}
