import { generateAIJson, hasAIProvider } from './ai-providers';
import { formatCardText } from './card-text';
import { repairDeep } from './text-repair';

export async function createContentPlan(input) {
  if (!hasAIProvider()) return fallbackPlan(input);
  try {
    const { provider, data } = await generateAIJson(buildPrompt(input));
    return normalizePlan(data, input, provider);
  } catch (error) {
    return { ...fallbackPlan(input), provider: 'fallback', error: error.message };
  }
}

function buildPrompt(input) {
  return JSON.stringify({
    task: '검증된 트렌드 후보를 저장 가치가 있는 카드뉴스 기획안으로 만든다.',
    editorialStandard: [
      '말투는 20대 중반~30대 초반 여성이 인스타 정보 계정에서 친구에게 설명하듯 쓴다.',
      '반말은 쓰지 말고 “봐야 해요”, “챙겨두면 좋아요”, “여기서 갈려요”처럼 자연스러운 존댓말을 쓴다.',
      '너무 애교 섞인 표현, 과한 감탄사, “대박”, “헐”, 이모지는 쓰지 않는다.',
      '유저가 AI 자동생성 문장이라고 느끼는 순간 실패다. 사람이 직접 편집한 인스타 카드뉴스처럼 쓴다.',
      '“~에 대해 알아보겠습니다”, “다음과 같습니다”, “종합하면”, “핵심입니다” 같은 생성형 AI 클리셰를 금지한다.',
      '얕은 일반론 금지. 모든 카드는 구체적 근거, 숫자, 변화 원인, 시사점 중 2개 이상을 포함한다.',
      '독자가 저장하거나 공유할 이유가 있어야 한다. “중요하다”, “주목된다” 같은 빈말만 쓰지 않는다.',
      '근거가 부족하면 “확인 필요”라고 쓰되, 왜 확인해야 하는지까지 적는다.',
      '본문은 카드당 90~150자. 한 문장짜리 설명 금지.',
      '하이픈(-)으로 이어 쓰지 말고 짧은 줄 2~4개로 나눠 카드뉴스 문장처럼 쓴다.',
      '“탐구한다”, “제시한다”, “중요하다”, “시사한다” 같은 AI 보고서 말투를 피한다.',
      '마지막 카드는 독자가 바로 써먹을 체크리스트나 판단 기준으로 끝낸다.'
    ],
    schema: {
      targetAudience: '좁힌 독자군',
      coreAngle: '한 줄 논지',
      hookTitles: ['저장/공유를 유도하는 제목 5개'],
      summary: '왜 지금 이 카드뉴스가 필요한지',
      riskNotes: ['과장 방지/확인 필요 사항'],
      sourceNotes: ['사용한 근거'],
      cards: [{ page: 1, title: '13자 안팎의 강한 제목', dataPoint: '숫자/근거', insight: '해석', action: '활용 포인트', body: '90~150자 본문', visualPrompt: '구체적 이미지 지시문', emphasis: '짧은 강조 문구' }]
    },
    candidate: input
  });
}

function normalizePlan(data, input, provider) {
  data = repairDeep(data);
  const cards = Array.isArray(data.cards) && data.cards.length ? data.cards : fallbackCards(input);
  const normalizedCards = cards.slice(0, 7).map((card, index) => normalizeCard(card, input, index));
  return {
    provider,
    targetAudience: data.targetAudience ?? '트렌드를 실용적으로 이해하고 저장해두려는 20대 후반 여성',
    coreAngle: data.coreAngle ?? input.production?.suggestedAngle ?? input.summary ?? '',
    hookTitles: ensureList(data.hookTitles, [`${input.label} 지금 봐야 할 변화`, `${input.label}에서 읽어야 할 신호`]).slice(0, 5),
    summary: data.summary ?? `${input.label}의 배경과 근거, 저장해둘 포인트를 쉽게 풀어봅니다.`,
    riskNotes: ensureList(data.riskNotes, ['출처가 부족한 수치는 확인 필요로 표시하세요.']),
    sourceNotes: ensureList(data.sourceNotes, input.searchVerification?.verification?.keyFindings ?? input.sampleTitles ?? []),
    cards: isWeakPlan(normalizedCards, input) ? evidenceBackedCards(input) : normalizedCards
  };
}

function normalizeCard(card, input, index) {
  const title = card.title ?? `${input.label} ${index + 1}`;
  const body = richBody(card, input);
  return {
    page: card.page ?? index + 1,
    title,
    body: formatCardText(cleanAiTone(body)),
    dataPoint: card.dataPoint ?? '',
    insight: card.insight ?? '',
    action: card.action ?? '',
    visualPrompt: card.visualPrompt ?? `${title}를 설명하는 인포그래픽 카드`,
    emphasis: card.emphasis ?? card.dataPoint ?? input.label
  };
}

function richBody(card, input) {
  const base = `${card.body ?? ''}`.trim();
  if (base.length >= 70) return formatCardText(base);
  const parts = [card.dataPoint, card.insight, card.action].filter(Boolean);
  if (parts.length) return formatCardText(parts.join('\n'));
  return formatCardText(`${input.label} 흐름은 그냥 지나치기엔 아까워요. 숫자와 원인을 같이 보면, 이게 단순 이슈인지 저장할 만한 변화인지 더 또렷해집니다.`);
}

function isWeakPlan(cards, input) {
  const text = cards.map((card) => `${card.title} ${card.body}`).join(' ');
  const generic = /중심으로 배경|추가 검색|신뢰도가 높아집니다|중요합니다|주목받고 있습니다|알아보겠습니다|다음과 같습니다|종합하면|핵심입니다|살펴보겠습니다/g;
  const hasEvidence = /\d|%|조|억|만|증가|감소|전망|비교|확대|개편/.test(text);
  return generic.test(text) || !hasEvidence || cards.every((card) => !card.dataPoint && !card.insight && !card.action);
}

function evidenceBackedCards(input) {
  const label = input.label ?? input.keyword;
  const evidence = getEvidence(input);
  const fact = evidence.find((item) => /\d|조|억|만|%|전망|확대|개편/.test(item)) ?? evidence[0] ?? `${label} 관련 신호가 반복 수집됨`;
  const sourceText = (input.sources ?? []).join(', ') || '수집 채널';
  return [
    makeCard(1, '왜 지금 봐야 하나', fact, `${sourceText}에서 같은 주제가 반복해서 잡혔어요. 단순 키워드보다 시장 규모, 수요 변화, 관련 기업 움직임을 같이 봐야 흐름이 보입니다.`, '반복 수집 신호'),
    makeCard(2, '핵심 동력은 무엇인가', evidence[1] ?? fact, `${label}에서 봐야 할 건 “무엇이 커지고 있나”예요. 기술, 가격, 소비 변화 중 어느 축이 움직이는지 잡아야 얕은 설명을 피할 수 있습니다.`, '성장 동력'),
    makeCard(3, '누가 영향을 받나', evidence[2] ?? fact, `기업, 소비자, 투자자 중 어디에 영향이 생기는지 나눠보면 좋아요. 이해관계자를 분리해야 독자가 내 이야기처럼 받아들입니다.`, '영향 대상'),
    makeCard(4, '과장하면 안 되는 지점', fact, `전망 수치나 커뮤니티 반응은 출처와 시점에 따라 달라져요. 확정처럼 말하기보다 “전망”, “가능성”, “확인 필요”를 같이 적어야 신뢰가 남습니다.`, '검증 필요'),
    makeCard(5, '콘텐츠로 바꾸는 기준', label, `이 주제로 만들려면 숫자 1개, 원인 1개, 독자 행동 1개가 필요해요. 이 세 가지가 들어가야 단순 이슈 소개가 아니라 저장할 만한 카드가 됩니다.`, '숫자·원인·행동')
  ];
}

function makeCard(page, title, dataPoint, body, emphasis) {
  const sourceLine = `${dataPoint ?? ''}`.trim();
  const finalBody = sourceLine && !body.includes(sourceLine) ? `근거: ${sourceLine}\n${body}` : body;
  return { page, title, dataPoint, body: finalBody, insight: body, action: emphasis, visualPrompt: `${title}를 한눈에 보여주는 카드뉴스 인포그래픽`, emphasis };
}

function cleanAiTone(value) {
  return `${value}`.replace(/에 대해 알아보겠습니다|살펴보겠습니다/g, '짚어볼게요').replace(/다음과 같습니다|종합하면/g, '정리하면').replace(/핵심입니다/g, '여기서 갈려요');
}

function getEvidence(input) {
  const verified = input.searchVerification?.verification?.keyFindings ?? input.searchVerification?.keyFindings ?? [];
  return [...verified, ...(input.sampleTitles ?? []), ...(input.evidence ?? []).map((item) => item.title)].filter(Boolean).slice(0, 6);
}

function fallbackPlan(input) {
  return {
    provider: 'fallback',
    targetAudience: '트렌드를 저장해두고 싶은 20대 후반 여성 독자',
    coreAngle: input.production?.suggestedAngle ?? input.summary ?? '',
    hookTitles: [`${input.label}, 왜 지금 뜰까?`, `${input.label} 핵심 포인트 5가지`],
    summary: `${input.label}의 배경과 근거, 저장해둘 포인트를 쉽게 풀어봅니다.`,
    riskNotes: ['단일 출처 내용은 단정하지 마세요.'],
    sourceNotes: input.sampleTitles ?? [],
    cards: fallbackCards(input)
  };
}

function fallbackCards(input) {
  const plan = input.validation?.cardPlan ?? [`${input.label} 한눈에 보기`, '왜 지금인가', '핵심 근거', '활용 포인트', '마무리 체크'];
  return plan.map((title, index) => ({
    page: index + 1,
    title,
    body: `${title}에서 봐야 할 흐름을 쉽게 정리해요. 숫자와 출처를 같이 확인하면, 그냥 이슈가 아니라 저장해둘 만한 포인트가 보입니다.`,
    visualPrompt: `${title}를 보여주는 정보형 카드뉴스`,
    emphasis: index === 0 ? input.label : title
  }));
}

function ensureList(value, fallback) {
  return Array.isArray(value) && value.length ? value : fallback;
}
