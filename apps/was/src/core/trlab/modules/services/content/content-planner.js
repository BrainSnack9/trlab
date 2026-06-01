import { generateAIJson, hasAIProvider } from '#trlab/modules/services/ai/ai-providers';
import { formatCardText } from './card-text.js';
import { repairDeep } from '#trlab/modules/helpers/text-repair';

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
    task: '검증된 트렌드 후보를 인스타 카드뉴스 캐러셀 기획안으로 만든다. 최종 목표는 채널 성장과 추후 관련 상품/리포트/템플릿/서비스 판매로 이어질 신뢰 자산을 쌓는 것이다.',
    role: '당신은 커뮤니티 반응을 읽는 데이터 기반 마케팅 에디터다. 뉴스 요약이 아니라, 사람들이 저장하고 공유할 만한 “근거 있는 바이럴 카드뉴스”를 설계한다.',
    referenceStyle: [
      '@twojob_angel: 흰 배경, 손글씨 느낌, 앱/비즈니스 사례, 10장 안팎, 창업자/제품 스토리와 참고자료 박스',
      '@power_biolife: 사진 풀블리드 표지, 큰 반전 문장, 7~20장, 뒤 카드에서 사실을 한 장씩 공개',
      '@1page_secret: 평균 9장, 첫 줄 20자 안팎, 개인 기록처럼 시작해 저장/CTA로 끝나는 원페이지 리듬',
      '@artart.today: 매거진형 사진 표지, 짧고 굵은 제목, 문화/브랜드 트렌드에 적합',
      '@koreanmedicalmemed: 짧은 키워드, 밈/말풍선, 팩트체크형 전개'
    ],
    referenceCarouselRules: {
      cover: [
        '표지는 결론을 설명하지 않는다. “착시”, “비교하면 달라지는 것”, “사람들이 눌러본 이유”처럼 멈추게 하는 한 문장만 둔다.',
        '레퍼런스 기준 첫 줄은 짧다. 12~31자 사이의 질문/반전/비교 약속을 우선한다.',
        '표지 본문은 0~2줄만 허용한다. 긴 근거 문장은 표지에 쓰지 않는다.'
      ],
      bodyCard: [
        '본문 카드는 자료 캡션이 아니라 카드 한 장짜리 주장이다. 첫 줄은 “무엇을 봐야 하는지”로 시작한다.',
        '근거 원문 제목은 body에 복붙하지 않는다. sourceLine에만 두고, body에서는 “댓글이 이 지점에 몰렸어요”처럼 해석된 문장으로 바꾼다.',
        '비교 카드에는 최소 2개 비교 축을 둔다. 예: 코스피 전체/반도체 제외, 강남/홍콩, 제품A/제품B.',
        '숫자 카드에는 숫자가 하나라도 있으면 크게 쓰고, 없으면 “확인할 지표”를 시각 라벨로 만든다.',
        '오해 방지 카드는 단정 대신 확인 조건을 보여준다. 예: 시점, 표본, 비교 기준.'
      ],
      ending: [
        '마지막 카드는 저장할 기준 3개로 끝낸다. 감상평이나 요약 문단으로 끝내지 않는다.',
        '향후 상품/리포트/템플릿 판매를 염두에 두고, 독자가 “이 계정은 판단 기준을 준다”고 느끼게 한다.'
      ],
      badPatterns: [
        '“근거: 원문 제목”으로 시작하는 카드',
        '검색 결과 제목을 그대로 본문에 붙이는 카드',
        '모든 카드가 같은 배경의 설명문으로만 구성되는 카드',
        '“중요합니다/주목됩니다/시사합니다”로 끝나는 보고서 문장'
      ]
    },
    planningRule: [
      '원신호를 그대로 요약하지 않는다. “왜 사람들이 반응했는지”, “무엇과 비교해야 하는지”, “어떤 숫자를 봐야 하는지”로 바꾼다.',
      '전체 카드 수는 기본 8~12장으로 잡는다. 근거가 부족하면 최소 7장까지 허용한다. 한 카드에는 하나의 역할만 둔다.',
      '1장은 긴 설명 금지. 강한 질문, 반전, 비교 약속 중 하나로 손을 멈추게 한다.',
      '2~7장은 커뮤니티 반응 → 왜 지금 → 비교 프레임 → 숫자/그래프 → 오해/리스크 → 콘텐츠 각도로 이어간다.',
      '마지막 카드는 저장용 체크리스트, 판단 기준, 실행 순서 중 하나로 끝낸다.',
      '근거는 candidate.evidence, candidate.searchVerification.verification.keyFindings, candidate.searchVerification.results, candidate.aiAnalysis.dataPoints를 우선 사용한다.',
      '검색 결과에 없는 숫자를 새로 만들지 않는다. 숫자가 없으면 “확인할 지표”로 표현한다.',
      '비교 콘텐츠로 풀 수 있으면 비교 축을 제시한다. 예: 반도체 포함/제외 코스피, 강남/홍콩/도쿄/뉴욕, 제품 A/B, 세대별 반응, 가격대별 차이.',
      '카드 제목은 짧고 구체적이어야 한다. “영향 분석”, “전망 정리” 같은 보고서 제목만 쓰지 않는다.',
      '카드 본문은 1~3줄로 나누고, 첫 줄은 구체 사실/질문/반전으로 시작한다.',
      '카드 본문에는 “근거:”, “해석:”, “실행:”, “데이터:” 같은 기획 라벨을 절대 쓰지 않는다. 해당 정보는 dataPoint, insight, action, sourceLine 필드에만 넣는다.'
    ],
    editorialStandard: [
      '말투는 20대 중반~30대 초반 여성이 인스타 정보 계정에서 친구에게 설명하듯 쓴다.',
      '반말은 쓰지 말고 “봐야 해요”, “챙겨두면 좋아요”, “여기서 갈려요”처럼 자연스러운 존댓말을 쓴다.',
      '너무 애교 섞인 표현, 과한 감탄사, “대박”, “헐”, 이모지는 쓰지 않는다.',
      '유저가 AI 자동생성 문장이라고 느끼는 순간 실패다. 사람이 직접 편집한 인스타 카드뉴스처럼 쓴다.',
      '“~에 대해 알아보겠습니다”, “다음과 같습니다”, “종합하면”, “핵심입니다” 같은 생성형 AI 클리셰를 금지한다.',
      '얕은 일반론 금지. 모든 카드는 구체적 근거, 숫자, 변화 원인, 시사점 중 2개 이상을 포함한다.',
      '독자가 저장하거나 공유할 이유가 있어야 한다. “중요하다”, “주목된다” 같은 빈말만 쓰지 않는다.',
      '근거가 부족하면 “확인 필요”라고 쓰되, 왜 확인해야 하는지까지 적는다.',
      '본문은 카드당 45~110자. 표지 카드는 35자 이내도 가능하다.',
      '하이픈(-)으로 이어 쓰지 말고 짧은 줄 2~4개로 나눠 카드뉴스 문장처럼 쓴다.',
      '“탐구한다”, “제시한다”, “중요하다”, “시사한다” 같은 AI 보고서 말투를 피한다.',
      '마지막 카드는 독자가 바로 써먹을 체크리스트나 판단 기준으로 끝낸다.'
    ],
    schema: {
      targetAudience: '좁힌 독자군',
      coreAngle: '증명 가능한 한 줄 논지. 비교 축 또는 숫자 기준을 포함',
      referenceStyle: 'handdrawn_research | photo_hook | magazine_story | meme_factcheck 중 하나',
      referencePattern: {
        deckLength: '권장 카드 수. 예: 9~11장',
        coverRhythm: '표지에서 따라 할 레퍼런스 리듬',
        bodyRhythm: '본문 카드 전개 리듬',
        proofRhythm: '검증 정보를 내부 판단에만 쓰는 방식',
        endingRhythm: '마지막 저장/CTA 방식'
      },
      carouselBlueprint: ['카드별 흐름을 7~12개 단계로 요약'],
      hookTitles: ['저장/공유를 유도하는 제목 5개. 각 제목은 22자 이내'],
      captionFirstLine: '게시물 첫 줄. 35자 이내. 저장/공유를 유도하는 짧은 후크',
      captionBody: '게시물 캡션 본문. 350~700자. 카드에서 다 못한 맥락, 근거, 저장 이유를 자연스럽게 설명',
      captionCTA: '댓글/저장/공유를 유도하는 한 문장',
      hashtags: ['5~8개. 너무 넓은 태그보다 주제/독자/형식 태그 중심'],
      summary: '왜 지금 이 카드뉴스가 필요한지. 근거와 독자 효용 포함',
      riskNotes: ['과장 방지/확인 필요 사항'],
      sourceNotes: ['사용한 근거. 원문 제목 중심'],
      cards: [{
        page: 1,
        role: 'cover | why_now | community_signal | comparison | data_scene | misconception | content_angle | checklist | closing',
        layout: 'cover_photo | cover_text | handwritten_research | comparison_board | data_chart | quote_card | checklist',
        visualType: 'photo | chart | table | screenshot | quote | checklist | meme',
        title: '13자 안팎의 강한 제목',
        dataPoint: '이 카드에서 쓰는 숫자/근거/확인 지표',
        insight: '그 근거가 의미하는 해석',
        action: '독자가 저장하거나 실행할 포인트',
        body: '45~110자 본문. 1~3줄. 라벨 없이 독자에게 보일 최종 문장만 작성',
        visualPrompt: '실제 카드에 들어갈 사진/그래프/표/비교 구도',
        visualItems: ['그래프 축/비교표 칸/체크리스트 항목에 들어갈 짧은 라벨 2~4개'],
        sourceLine: '내부 검증 메모. 최종 카드에는 직접 노출하지 않음',
        emphasis: '짧은 강조 문구'
      }]
    },
    candidate: compactCandidate(input)
  });
}

function compactCandidate(input) {
  return {
    label: input.label ?? input.keyword,
    category: input.category,
    production: input.production,
    validation: input.validation,
    aiAnalysis: input.aiAnalysis,
    sources: input.sources,
    evidence: (input.evidence ?? []).slice(0, 5),
    sampleTitles: (input.sampleTitles ?? []).slice(0, 5),
    searchVerification: input.searchVerification ? {
      query: input.searchVerification.query,
      verification: input.searchVerification.verification,
      results: (input.searchVerification.results ?? []).slice(0, 5)
    } : undefined
  };
}

function normalizePlan(data, input, provider) {
  data = repairDeep(data);
  const cards = Array.isArray(data.cards) && data.cards.length ? data.cards : fallbackCards(input);
  const referenceStyle = data.referenceStyle ?? chooseReferenceStyle(input);
  const rawCards = ensureCarouselCards(cards, input).slice(0, 12);
  const normalizedCards = rawCards.map((card, index) => normalizeCard(card, input, index, rawCards.length, referenceStyle));
  return {
    provider,
    targetAudience: data.targetAudience ?? '트렌드를 실용적으로 이해하고 저장해두려는 20대 후반 여성',
    coreAngle: data.coreAngle ?? input.production?.suggestedAngle ?? input.summary ?? '',
    referenceStyle,
    referencePattern: normalizeReferencePattern(data.referencePattern, referenceStyle),
    carouselBlueprint: ensureList(data.carouselBlueprint, defaultBlueprint(input)),
    hookTitles: ensureList(data.hookTitles, [`${input.label} 지금 봐야 할 변화`, `${input.label}에서 읽어야 할 신호`]).map((title) => compactTitle(title, input, 22)).slice(0, 5),
    captionFirstLine: normalizeCaptionFirstLine(data.captionFirstLine, input),
    captionBody: normalizeCaptionBody(data.captionBody, input),
    captionCTA: normalizeCaptionCTA(data.captionCTA),
    hashtags: normalizeHashtags(data.hashtags, input),
    summary: data.summary ?? `${input.label}의 배경과 근거, 저장해둘 포인트를 쉽게 풀어봅니다.`,
    riskNotes: ensureList(data.riskNotes, ['근거가 부족한 수치는 단정하지 마세요.']),
    sourceNotes: ensureList(data.sourceNotes, input.searchVerification?.verification?.keyFindings ?? input.sampleTitles ?? []),
    cards: isWeakPlan(normalizedCards, input) ? evidenceBackedCards(input) : normalizedCards.map((card, index) => strengthenCard(card, input, index))
  };
}

function ensureCarouselCards(cards, input) {
  const base = Array.isArray(cards) ? cards.filter(Boolean) : [];
  if (base.length >= 7) return base;
  const fallback = evidenceBackedCards(input);
  const filled = [...base];
  for (let index = base.length; index < 7; index += 1) {
    const fallbackCard = fallback[index] ?? fallback[fallback.length - 1];
    filled.push({ ...fallbackCard, page: index + 1 });
  }
  return filled;
}

export function normalizeContentPlanForTest(data, input, provider = 'test') {
  return normalizePlan(data, input, provider);
}

function normalizeCard(card, input, index, total, referenceStyle) {
  const role = canonicalRole(index, total);
  const layout = normalizeLayout(card.layout, role, index, referenceStyle);
  const title = normalizeCardTitle(card.title, input, index, role);
  const body = normalizeCardBody(richBody(card, input), role, card);
  const sourceLine = normalizeSourceLine(card, input, index, role);
  return {
    page: card.page ?? index + 1,
    role,
    layout,
    visualType: card.visualType ?? visualTypeForLayout(layout),
    title,
    body: formatCardText(cleanCardBody(cleanAiTone(body))),
    dataPoint: card.dataPoint ?? (role === 'data_scene' ? sourceLine : ''),
    insight: card.insight ?? '',
    action: card.action ?? '',
    visualPrompt: card.visualPrompt ?? `${title}를 설명하는 인포그래픽 카드`,
    visualItems: normalizeVisualItems(card.visualItems, input, role, card),
    sourceLine,
    emphasis: card.emphasis ?? card.dataPoint ?? input.label
  };
}

function normalizeSourceLine(card, input, index, role) {
  const evidence = getEvidence(input);
  const fallback = role === 'cover'
    ? ''
    : evidence[index] ?? evidence.find((item) => /\d/.test(item)) ?? evidence[0] ?? '확인 필요';
  return cleanCardBody(card.sourceLine ?? card.dataPoint ?? fallback);
}

function richBody(card, input) {
  const base = `${card.body ?? ''}`.trim();
  if (base.length >= 70) return formatCardText(base);
  const parts = [card.insight, card.action].filter(Boolean);
  if (parts.length) return formatCardText(parts.join('\n'));
  return formatCardText(`${input.label} 흐름은 그냥 지나치기엔 아까워요. 숫자와 원인을 같이 보면, 이게 단순 이슈인지 저장할 만한 변화인지 더 또렷해집니다.`);
}

function normalizeCardTitle(value, input, index, role) {
  const fallback = defaultTitleForRole(input, role, index);
  const cleaned = cleanAiTone(cleanTitle(value || fallback));
  if (!cleaned || isGenericTitle(cleaned)) return fallback;
  if (role === 'cover' && !hasCoverHookTitle(cleaned)) return fallback;
  const limit = role === 'cover' ? 16 : 18;
  return compactTitle(cleaned, input, limit);
}

function normalizeCardBody(value, role, card = {}) {
  const cleaned = removePlanningEchoes(cleanCardBody(cleanAiTone(value)), card);
  const lines = formatCardText(cleaned).split('\n').filter(Boolean);
  const maxLines = role === 'cover' ? 2 : 3;
  const limit = role === 'cover' ? 22 : 32;
  const normalized = [];
  for (const line of lines) {
    for (let index = 0; index < line.length && normalized.length < maxLines; index += limit) {
      normalized.push(line.slice(index, index + limit).trim());
    }
  }
  return normalized.join('\n');
}

function removePlanningEchoes(value, card = {}) {
  const sourceLike = [card.sourceLine, card.dataPoint]
    .filter(Boolean)
    .map((item) => compactForCompare(item));
  return `${value ?? ''}`
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      const comparable = compactForCompare(line);
      if (!comparable) return false;
      if (/^(원문|검색 결과|출처|근거|자료)\s*[:：]/.test(line)) return false;
      return !sourceLike.some((source) => isCopiedSourceLine(comparable, source));
    })
    .join('\n');
}

function isCopiedSourceLine(comparable, source) {
  if (!source) return false;
  if (comparable === source) return true;
  if (source.length < 12) return false;
  return comparable.length <= source.length + 8 && (comparable.includes(source) || source.includes(comparable));
}

function compactForCompare(value) {
  return `${value ?? ''}`
    .replace(/[“”"'`|·ㆍ,.\s]/g, '')
    .replace(/^\s*(근거|해석|실행|데이터|출처|원문|자료)\s*[:：]\s*/g, '')
    .trim();
}

function cleanTitle(value) {
  return `${value ?? ''}`
    .replace(/콘텐츠\s*설계|카드뉴스\s*기획안|카드뉴스|분석\s*콘텐츠|영향\s*분석|전망\s*정리|핵심\s*정리/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function compactTitle(value, input, limit) {
  const text = cleanTitle(value);
  if (text.length <= limit) return text;
  const shortLabel = `${input.label ?? input.keyword ?? ''}`.replace(/\s+/g, ' ').trim();
  if (shortLabel && shortLabel.length <= limit && text.includes(shortLabel)) return shortLabel;
  return text.slice(0, limit).trim();
}

function isGenericTitle(value) {
  return /^(영향|분석|정리|전망|핵심|포인트|콘텐츠|카드|주제)\s*\d*$/.test(value) || value.length < 2;
}

function hasCoverHookTitle(value) {
  return /왜|진짜|믿기|착시|비교|놓쳐|달라|반전|한 줄|이게|요즘|갑자기|모르면|전에/.test(`${value ?? ''}`);
}

function defaultTitleForRole(input, role, index) {
  const label = input.label ?? input.keyword ?? '이 주제';
  return {
    cover: '이게 왜 떴을까',
    why_now: '왜 지금일까',
    community_signal: '댓글이 말한 것',
    comparison: '비교해야 보여요',
    data_scene: '숫자는 하나면 돼요',
    misconception: '오해하면 망해요',
    content_angle: '콘텐츠 각도',
    checklist: '이렇게 만들기',
    closing: '저장 기준'
  }[role] ?? compactTitle(label, input, 16) ?? `카드 ${index + 1}`;
}

function strengthenCard(card, input, index) {
  if (hasConcreteBody(card.body)) return card;
  const evidence = getEvidence(input);
  const fact = evidence[index] ?? evidence[0] ?? input.label ?? input.keyword;
  const body = [
    sentenceFromEvidence(fact, input),
    card.insight || `${input.label ?? input.keyword}를 볼 때는 단순 화제보다 어떤 숫자가 움직였는지 확인해야 해요.`,
    card.action || '저장할 때는 비교 기준, 적용 대상, 숫자 하나를 같이 적어두면 좋아요.'
  ].filter(Boolean).join('\n');
  return { ...card, body: normalizeCardBody(body, card.role), dataPoint: card.dataPoint || fact };
}

function hasConcreteBody(value) {
  const text = `${value ?? ''}`;
  const hasEvidenceWord = /댓글|조회|추천|비중|지수|영업이익|가격|비교|확인|체크|검색|보도|수치|커뮤니티|반응|\d/.test(text);
  const hasAction = /봐야|확인|비교|나눠|저장|체크|주의|분리|적용|담아/.test(text);
  return text.length >= 45 && hasEvidenceWord && hasAction;
}

function isWeakPlan(cards, input) {
  const text = cards.map((card) => `${card.title} ${card.body}`).join(' ');
  const generic = /중심으로 배경|추가 검색|신뢰도가 높아집니다|중요합니다|주목받고 있습니다|알아보겠습니다|다음과 같습니다|종합하면|핵심입니다|살펴보겠습니다|영향을 미칩니다|필수적입니다|가능성이 있습니다/g;
  const hasEvidence = /\d|%|조|억|만|증가|감소|전망|비교|확대|개편/.test(text);
  const concreteCount = cards.filter((card) => hasConcreteBody(card.body)).length;
  if (cards.length >= 8 && hasEvidence && cards.some((card) => card.dataPoint || card.insight || card.action)) return false;
  if (cards.length >= 8 && hasEvidence && concreteCount >= Math.min(5, cards.length)) return false;
  return generic.test(text) || !hasEvidence || concreteCount < Math.min(3, cards.length) || cards.every((card) => !card.dataPoint && !card.insight && !card.action);
}

function evidenceBackedCards(input) {
  const label = input.label ?? input.keyword;
  const evidence = getEvidence(input);
  const fact = evidence.find((item) => /\d|%/.test(item))
    ?? evidence.find((item) => /조|억|만|전망|확대|개편/.test(item))
    ?? evidence[0]
    ?? `${label} 관련 신호가 반복 수집됨`;
  const sourceText = (input.sources ?? []).join(', ') || '수집 채널';
  return [
    makeCard(1, '이게 왜 떴을까', fact, `${label}은 그냥 뉴스보다\n커뮤니티 반응이 먼저 잡힌 주제예요.\n그래서 “사람들이 왜 눌렀는지”부터 봐야 해요.`, 'cover', 'cover_text', '반응 먼저'),
    makeCard(2, '댓글이 말한 것', evidence[1] ?? fact, `${sourceText}에서 반복된 말은\n사실 하나의 불안이나 욕망에 가까워요.\n제목보다 반응의 방향을 먼저 잡아야 해요.`, 'community_signal', 'quote_card', '커뮤니티 반응'),
    makeCard(3, '비교해야 보여요', evidence[2] ?? fact, `${label}만 보면 커 보이지만\n비슷한 대상과 나란히 놓으면 달라져요.\n지역, 제품, 세대, 가격대를 꼭 비교해요.`, 'comparison', 'comparison_board', '비교 프레임'),
    makeCard(4, '숫자는 하나면 돼요', fact, `그래프는 많이 넣을수록 흐려져요.\n조회수, 가격, 성장률, 검색량 중\n가장 설득력 있는 숫자 하나를 크게 보여줘요.`, 'data_scene', 'data_chart', '대표 지표'),
    makeCard(5, '오해하면 망해요', evidence[3] ?? fact, `커뮤니티 반응은 사실이 아니라 신호예요.\n시점과 비교 기준을 같이 봐야\n자극적이면서도 믿을 만해져요.`, 'misconception', 'quote_card', '과장 방지'),
    makeCard(6, '콘텐츠 각도', label, `이 주제는 “무슨 일이냐”보다\n“나한테 어떤 변화냐”로 바꾸면 좋아요.\n그래야 저장하고 공유할 이유가 생겨요.`, 'content_angle', 'handwritten_research', '내 이야기화'),
    makeCard(7, '이렇게 만들기', label, `저장용 기준은 세 가지예요.\n반응이 있었나, 비교가 가능한가,\n숫자 하나로 설명되나.`, 'checklist', 'checklist', '저장 기준')
  ];
}

function makeCard(page, title, dataPoint, body, role, layout, emphasis) {
  return {
    page,
    role,
    layout,
    visualType: visualTypeForLayout(layout),
    title,
    dataPoint,
    body: cleanCardBody(body),
    insight: body,
    action: emphasis,
    visualPrompt: `${title}를 한눈에 보여주는 ${layout} 카드`,
    visualItems: normalizeVisualItems([], { label: title, sources: [] }, role, { body, dataPoint }),
    sourceLine: dataPoint,
    emphasis
  };
}

function cleanAiTone(value) {
  return `${value}`.replace(/에 대해 알아보겠습니다|살펴보겠습니다/g, '짚어볼게요').replace(/다음과 같습니다|종합하면/g, '정리하면').replace(/핵심입니다/g, '여기서 갈려요');
}

function cleanCardBody(value) {
  return `${value ?? ''}`
    .split('\n')
    .map((line) => line.replace(/^\s*(근거|해석|실행|데이터|출처)\s*[:：]\s*/g, '').trim())
    .filter(Boolean)
    .join('\n');
}

function sentenceFromEvidence(fact, input) {
  const cleanFact = `${fact ?? ''}`.replace(/^\s*(근거|해석|실행|데이터|출처)\s*[:：]\s*/g, '').trim();
  if (!cleanFact) return `${input.label ?? input.keyword}는 지금 반응이 먼저 잡힌 주제예요.`;
  if (/\d|댓글|조회|추천|HOT|실베|베스트/.test(cleanFact)) return `${cleanFact}처럼 반응이 숫자로 잡힌 지점부터 봐야 해요.`;
  return `${cleanFact}라는 원문 맥락에서 사람들이 반응한 이유를 먼저 짚어야 해요.`;
}

function getEvidence(input) {
  const verified = input.searchVerification?.verification?.keyFindings ?? input.searchVerification?.keyFindings ?? [];
  const evidenceItems = (input.evidence ?? []).map(formatEvidenceItem);
  const dataPoints = ensureList(input.aiAnalysis?.dataPoints, []);
  return [...verified, ...dataPoints, ...(input.sampleTitles ?? []), ...evidenceItems].filter(Boolean).slice(0, 8);
}

function formatEvidenceItem(item) {
  if (!item) return '';
  if (typeof item === 'string') return item;
  const title = item.title ?? item.text ?? item.label ?? '';
  const metrics = [
    metricText(item.comments, '댓글'),
    metricText(item.votes ?? item.recommendations ?? item.likes, '추천'),
    metricText(item.views ?? item.viewCount, '조회'),
    metricText(item.shares, '공유')
  ].filter(Boolean);
  return [title, metrics.length ? `(${metrics.join(', ')})` : ''].filter(Boolean).join(' ');
}

function metricText(value, label) {
  const number = Number(`${value ?? ''}`.replace(/,/g, ''));
  return Number.isFinite(number) && number > 0 ? `${label} ${number.toLocaleString('ko-KR')}개` : '';
}

function fallbackPlan(input) {
  return {
    provider: 'fallback',
    targetAudience: '트렌드를 저장해두고 싶은 20대 후반 여성 독자',
    coreAngle: input.production?.suggestedAngle ?? input.summary ?? '',
    referenceStyle: chooseReferenceStyle(input),
    referencePattern: normalizeReferencePattern(undefined, chooseReferenceStyle(input)),
    carouselBlueprint: defaultBlueprint(input),
    hookTitles: [`${input.label}, 왜 지금 뜰까?`, `${input.label} 핵심 포인트 5가지`],
    captionFirstLine: normalizeCaptionFirstLine('', input),
    captionBody: normalizeCaptionBody('', input),
    captionCTA: normalizeCaptionCTA(''),
    hashtags: normalizeHashtags([], input),
    summary: `${input.label}의 배경과 근거, 저장해둘 포인트를 쉽게 풀어봅니다.`,
    riskNotes: ['단일 근거 내용은 단정하지 마세요.'],
    sourceNotes: input.sampleTitles ?? [],
    cards: fallbackCards(input)
  };
}

function normalizeCaptionFirstLine(value, input) {
  const fallback = `${input.label ?? input.keyword}, 그냥 넘기기 아까워요`;
  return cleanAiTone(`${value || fallback}`)
    .replace(/[#＃][^\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 35);
}

function normalizeCaptionBody(value, input) {
  const evidence = getEvidence(input).slice(0, 3);
  const fallback = [
    `${input.label ?? input.keyword}은 단순히 많이 언급된 이슈가 아니라, 사람들이 어떤 기준으로 판단하고 싶어 하는지 보여주는 신호예요.`,
    evidence.length ? `이번 카드에서는 ${evidence[0]} 같은 근거를 바탕으로, 비교할 대상과 확인할 숫자를 나눠봤어요.` : '이번 카드에서는 비교할 대상과 확인할 숫자를 나눠봤어요.',
    '저장해두고 비슷한 이슈를 볼 때 반응, 비교 기준, 숫자 하나를 같이 확인해보면 좋아요.'
  ].join('\n\n');
  const cleaned = cleanCardBody(cleanAiTone(value || fallback))
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 700);
  if (cleaned.length < 120 || !/(반응|비교|근거|저장|숫자)/.test(cleaned)) return fallback.slice(0, 700);
  return cleaned;
}

function normalizeCaptionCTA(value) {
  const fallback = '나중에 다시 볼 수 있게 저장해두고, 비교해보고 싶은 주제가 있으면 댓글로 남겨주세요.';
  return cleanCardBody(cleanAiTone(value || fallback)).replace(/\s+/g, ' ').trim().slice(0, 90);
}

function normalizeHashtags(value, input) {
  const base = Array.isArray(value) ? value : [];
  const labelWords = `${input.label ?? input.keyword ?? ''}`
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}_]/gu, ''))
    .filter((word) => word.length >= 2)
    .slice(0, 3);
  const defaults = ['카드뉴스', '트렌드분석', '정보계정', '저장각', ...labelWords];
  return [...new Set([...base, ...defaults].map((tag) => normalizeHashtag(tag)).filter(Boolean))].slice(0, 8);
}

function normalizeHashtag(value) {
  const tag = `${value ?? ''}`.replace(/^#+/, '').replace(/[^\p{L}\p{N}_]/gu, '').trim();
  return tag ? `#${tag}` : '';
}

function normalizeReferencePattern(value, referenceStyle) {
  const fallback = referencePatterns()[referenceStyle] ?? referencePatterns().photo_hook;
  const pattern = value && typeof value === 'object' ? value : {};
  return {
    deckLength: pattern.deckLength || fallback.deckLength,
    coverRhythm: pattern.coverRhythm || fallback.coverRhythm,
    bodyRhythm: pattern.bodyRhythm || fallback.bodyRhythm,
    proofRhythm: pattern.proofRhythm || fallback.proofRhythm,
    endingRhythm: pattern.endingRhythm || fallback.endingRhythm
  };
}

function referencePatterns() {
  return {
    handdrawn_research: {
      deckLength: '9~11장 권장, 근거가 적으면 7장',
      coverRhythm: '@twojob_angel처럼 짧은 주제명과 편집자의 한 줄 관찰로 시작',
      bodyRhythm: '자료를 그대로 요약하지 말고 사례, 비교, 숫자, 메모 주석을 한 장씩 분리',
      proofRhythm: '검증 정보는 내부 판단에만 쓰고 본문에는 해석된 문장만 노출',
      endingRhythm: '다음에 써먹을 비교 기준이나 체크리스트로 저장 유도'
    },
    photo_hook: {
      deckLength: '8~12장 권장, 강한 표지 뒤 팩트 전개',
      coverRhythm: '@power_biolife처럼 사진 위에 믿기 어려운 반전 한 문장',
      bodyRhythm: '한 장에 사실 하나씩 공개하고 마지막에 왜 중요한지 연결',
      proofRhythm: '수치/검색 검증은 내부 판단에만 사용',
      endingRhythm: '오해 방지 조건과 저장 기준 3개로 종료'
    },
    magazine_story: {
      deckLength: '8~10장 권장',
      coverRhythm: '@artart.today처럼 매거진 표지형 제목과 짧은 부제',
      bodyRhythm: '브랜드/문화 맥락을 장면처럼 나누고 비교 포인트를 뒤에 배치',
      proofRhythm: '검증 정보는 내부 판단에만 쓰고 본문은 감도 있는 해석 중심',
      endingRhythm: '독자가 공유할 만한 관찰 포인트로 종료'
    },
    meme_factcheck: {
      deckLength: '7~10장 권장',
      coverRhythm: '@koreanmedicalmemed처럼 짧은 키워드와 말풍선식 문제 제기',
      bodyRhythm: '주장, 확인, 오해, 기준을 밈처럼 짧게 교차',
      proofRhythm: '검증 정보는 내부 판단에만 사용',
      endingRhythm: '믿기 전 확인할 3가지 기준으로 종료'
    }
  };
}

function fallbackCards(input) {
  return evidenceBackedCards(input);
}

function ensureList(value, fallback) {
  return Array.isArray(value) && value.length ? value : fallback;
}

function normalizeVisualItems(value, input, role, card = {}) {
  const items = ensureList(value, defaultVisualItems(input, role, card))
    .map((item) => compactVisualLabel(item))
    .filter(Boolean);
  return [...new Set(items)].slice(0, 4);
}

function compactVisualLabel(value) {
  return `${value ?? ''}`
    .replace(/^\s*(근거|해석|실행|데이터|출처)\s*[:：]\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 18);
}

function defaultVisualItems(input, role, card = {}) {
  const label = input.label ?? input.keyword ?? '주제';
  const source = (input.sources ?? []).find(Boolean) ?? '커뮤니티';
  const dataPoint = `${card.dataPoint ?? ''}`.trim();
  if (role === 'comparison') return [label, '비교 대상', '과거 기준', '독자 기준'];
  if (role === 'data_scene') return [dataPoint || '대표 지표', '검색량', '댓글 반응', '가격/비중'];
  if (role === 'community_signal') return [source, '댓글 반응', '반복 언급'];
  if (role === 'why_now') return ['타이밍', '반응 증가', '지금 볼 이유'];
  if (role === 'misconception') return ['커뮤니티 반응', '확인된 사실', '확인 필요'];
  if (role === 'checklist') {
    const bodyItems = formatCardText(card.body).split('\n').filter(Boolean);
    return bodyItems.length ? bodyItems : ['반응이 있었나', '비교가 가능한가', '숫자로 설명되나'];
  }
  if (role === 'content_angle') return ['내 이야기화', '비교 프레임', '저장 포인트'];
  return [label, source];
}

function chooseReferenceStyle(input) {
  const text = `${input.label ?? ''} ${input.category ?? ''} ${input.summary ?? ''}`;
  if (/부동산|주식|투자|기업|앱|서비스|시장|가격|검색량|지표|코스피|코스닥|반도체|수급|금리|환율/.test(text)) return 'handdrawn_research';
  if (/연예|영화|음악|브랜드|문화|전시|인물/.test(text)) return 'magazine_story';
  if (/건강|의학|식품|다이어트|피부|운동/.test(text)) return 'meme_factcheck';
  return 'photo_hook';
}

function defaultBlueprint(input) {
  const label = input.label ?? input.keyword ?? '이 주제';
  return [
    `${label}이 왜 지금 반응을 얻었는지 표지에서 약속`,
    '커뮤니티에서 반복된 반응을 짧게 요약',
    '지금 이 타이밍에 봐야 하는 이유 제시',
    '비교해야 할 대상이나 축 제시',
    '그래프나 숫자로 볼 대표 지표 1개 선택',
    '과장하면 안 되는 지점 표시',
    '콘텐츠로 바꿀 관점 제안',
    '저장용 체크리스트로 마무리'
  ];
}

function canonicalRole(index, total) {
  if (index === 0) return 'cover';
  if (index === total - 1) return 'checklist';
  if (total <= 7) {
    return ['community_signal', 'comparison', 'data_scene', 'misconception', 'content_angle', 'closing'][index - 1] ?? 'content_angle';
  }
  return ['community_signal', 'why_now', 'comparison', 'data_scene', 'misconception', 'content_angle', 'community_signal', 'content_angle', 'data_scene', 'misconception'][index - 1] ?? 'content_angle';
}

function normalizeLayout(value, role, index, referenceStyle) {
  const allowed = ['cover_photo', 'cover_text', 'handwritten_research', 'comparison_board', 'data_chart', 'quote_card', 'checklist'];
  const compatible = compatibleLayouts(role, referenceStyle);
  if (allowed.includes(value) && compatible.includes(value)) return value;
  if (role === 'cover') return compatible[0] ?? (index === 0 ? 'cover_text' : 'cover_photo');
  if (role === 'comparison') return 'comparison_board';
  if (role === 'data_scene') return 'data_chart';
  if (role === 'checklist' || role === 'closing') return 'checklist';
  if (role === 'community_signal' || role === 'misconception') return 'quote_card';
  return 'handwritten_research';
}

function compatibleLayouts(role, referenceStyle) {
  if (role === 'cover') {
    if (referenceStyle === 'magazine_story' || referenceStyle === 'photo_hook') return ['cover_photo', 'cover_text'];
    return ['cover_text', 'cover_photo'];
  }
  return {
    community_signal: ['quote_card'],
    why_now: ['handwritten_research', 'quote_card'],
    comparison: ['comparison_board'],
    data_scene: ['data_chart'],
    misconception: ['quote_card'],
    content_angle: ['handwritten_research', 'quote_card'],
    closing: ['checklist'],
    checklist: ['checklist']
  }[role] ?? ['handwritten_research'];
}

function visualTypeForLayout(layout) {
  return {
    cover_photo: 'photo',
    cover_text: 'quote',
    handwritten_research: 'screenshot',
    comparison_board: 'table',
    data_chart: 'chart',
    quote_card: 'quote',
    checklist: 'checklist'
  }[layout] ?? 'chart';
}
