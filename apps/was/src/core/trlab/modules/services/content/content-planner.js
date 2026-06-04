import { generateAIJson, hasAIProvider } from '#trlab/modules/services/ai/ai-providers';
import { formatCardText } from './card-text.js';
import { repairDeep } from '#trlab/modules/helpers/text-repair';
import { searchExternalProviders } from '#trlab/modules/services/search/search-providers';

const DEFAULT_TREND_CARD_COUNT = 5;

export async function createContentPlan(input) {
  if (!hasAIProvider()) {
    return withGenerationMeta(fallbackPlan(input), {
      source: 'fallback',
      reason: 'no_provider',
      message: 'AI provider 설정이 없어 로컬 대체 문구를 표시 중입니다. 카드 문구는 AI 재생성이 필요합니다.'
    });
  }
  try {
    const { provider, data, meta } = await generateAIJson(buildPrompt(input), {
      systemPrompt: contentPlannerSystemPrompt()
    });
    const normalized = normalizePlan(data, input, provider);
    const enriched = await enrichPlanVisualDataWithAI(normalized, input);
    return withGenerationMeta(enriched, {
      model: meta?.model,
      usage: meta?.usage
    });
  } catch (error) {
    return withGenerationMeta({ ...fallbackPlan(input), provider: 'fallback', error: error.message }, {
      source: 'fallback',
      reason: 'provider_failed',
      message: `AI 생성에 실패해 로컬 대체 문구를 표시 중입니다. 다시 작성이 필요합니다. (${error.message})`
    });
  }
}

function contentPlannerSystemPrompt() {
  return [
    '한국어 인스타그램 카드뉴스 편집장.',
    '말투는 20대 중반 여성 정보계정처럼 다정하고 감각적인 해요체로 쓴다.',
    '과한 애교, 밈, 유행어, 느낌표 남발은 피하고 차분하지만 예쁜 문장으로 쓴다.',
    '주어진 트렌드 후보와 근거를 바탕으로 실제 카드에 그대로 들어갈 제목과 본문을 작성한다.',
    '본문은 기사 요약, 출처 설명, 제작 지시가 아니라 독자가 가져갈 데이터, 기준, 비교 포인트, 주의 조건이 담긴 완성 문구여야 한다.',
    '표지를 제외한 각 카드는 읽고 난 뒤 남는 정보가 달라야 한다.',
    '상품/소비 트렌드는 구매 이유, 비교 기준, 안 살 이유, 체크리스트로 바꾼다.',
    '인기 있다, 뜨고 있다, 저장 목록에 올라왔다처럼 정보가 없는 문장은 쓰지 않는다.',
    '근거에 없는 숫자와 가짜 후기는 만들지 않는다.',
    '반드시 JSON만 반환한다.'
  ].join(' ');
}

function withGenerationMeta(plan, meta = {}) {
  return {
    ...plan,
    generation: {
      ...(plan.generation ?? {}),
      ...meta
    }
  };
}

function buildPrompt(input) {
  const manual = normalizeManualBrief(input);
  if (manual) return buildManualPrompt(input, manual);
  const desiredCardCount = getDesiredCardCount(input);
  const intent = classifyContentIntent(input);
  return JSON.stringify({
    task: '아래 주제와 컷 수만 중심으로 인스타 카드뉴스 기획안 JSON을 완성한다.',
    request: {
      cardCount: desiredCardCount,
      topic: primaryTopic(input),
      coverTitle: cleanManualText(input.selectedHookTitle) || primaryTopic(input),
      intent: intent.id,
      titlePattern: intent.titlePattern,
      angle: intent.angle,
      suggestedCardFlow: cardFlowForPrompt(input, intent, desiredCardCount)
    },
    rules: [
      `${desiredCardCount}장 정확히 작성한다. 1장은 표지, 2장부터는 주제에 가장 좋은 전개를 직접 설계한다.`,
      'request.suggestedCardFlow의 role과 mission을 우선 따른다. 더 좋은 흐름이 있으면 바꿀 수 있지만 각 카드의 역할은 서로 달라야 한다.',
      '각 cards 항목의 body는 해당 카드 mission에 대한 답이어야 한다. 앞 카드와 같은 문장, 같은 결론, 같은 표현을 반복하지 않는다.',
      '말투는 20대 중반 여성 인스타 정보계정처럼 부드러운 해요체로 쓴다. 너무 딱딱한 보고서체, 과한 광고체, 애교체는 금지.',
      '문장은 짧고 예쁘게 쓴다. 단, 감성만 남기지 말고 정보와 기준이 함께 남아야 한다.',
      '표지를 제외한 모든 body에는 독자가 얻어갈 정보 1개 이상을 넣는다. 예: 구매 판단 기준, 비교 축, 확인할 근거, 피해야 할 조건, 실제 적용 기준.',
      '인기/화제/강세를 말하는 데서 끝내지 말고 왜 그런지, 무엇을 봐야 하는지, 어떤 기준으로 판단할지까지 쓴다.',
      '반응/비교/데이터/체크 같은 순서를 억지로 맞추지 않는다. 필요 없는 role은 쓰지 않는다.',
      '각 cards 항목의 title과 body는 실제 카드에 그대로 들어갈 완성 문구다. 설명문이나 제작 지시문이 아니다.',
      '각 cards 항목의 visualPrompt와 visualItems는 이미지/표/그래프/배경 제작용 지시다. 카드 문구와 섞지 않는다.',
      '검증 가능한 표/그래프/비교표가 필요한 카드는 visualData에 실제 값, 단위, 행, 출처명을 구조화한다. 근거가 없으면 visualData를 비운다.',
      'visualData 숫자와 비교 항목은 candidate.evidence, searchVerification, 또는 널리 알려진 공식 기준처럼 출처를 설명할 수 있는 것만 쓴다.',
      'body에는 출처명, Search SERP, 네이트판, 기사 제목, URL, 기획 메모, 근거 라벨을 넣지 않는다.',
      `표지 제목은 request.coverTitle을 최우선으로 사용한다. 다른 후보는 hookTitles에만 넣는다.`,
      `${intent.rule}`,
      '숫자는 근거에 있는 것만 쓴다. 근거 숫자가 없으면 숫자를 만들지 말고 상황/반복 언급/비교 기준으로 설계한다.'
    ],
    jsonStructure: {
      targetAudience: '',
      coreAngle: '',
      referenceStyle: 'handdrawn_research|photo_hook|magazine_story|meme_factcheck',
      carouselBlueprint: [''],
      hookTitles: [''],
      captionFirstLine: '',
      captionBody: '',
      captionCTA: '',
      hashtags: [''],
      summary: '',
      riskNotes: [''],
      sourceNotes: ['내부 참고용. 카드에는 직접 노출하지 않음'],
      cards: [{
        page: 1,
        role: 'cover|why_now|community_signal|comparison|data_scene|misconception|content_angle|checklist|closing 중 자연스럽게 선택',
        layout: 'cover_photo|cover_text|handwritten_research|comparison_board|data_chart|quote_card|checklist 중 선택',
        visualType: 'photo|illustration|chart|table|quote|checklist 중 선택',
        title: '카드에 보일 제목',
        body: '카드에 보일 본문 1~3줄',
        visualPrompt: '배경/장면/이미지/표/그래프/포인트 연출. 글자 삽입 지시 금지',
        visualItems: ['시각 요소나 표/그래프 라벨 2~4개'],
        visualData: {
          type: 'bar_chart|evidence_table|comparison_table 중 하나. 없으면 생략',
          title: '검증 데이터 제목',
          subtitle: '단위/기준 설명',
          unit: '선택 단위',
          items: [{ label: '그래프 라벨', value: 0, display: '표시값', note: '출처 기준' }],
          columns: ['표 열 이름'],
          rows: [['표 셀']],
          callouts: ['주의/해석 문장'],
          sources: [{ label: '출처명', url: 'URL 또는 빈 문자열' }]
        },
        dataPoint: '내부 참고 데이터. 카드에 그대로 노출하지 않음',
        insight: '내부 기획 판단',
        action: '독자가 저장하거나 실행할 포인트',
        sourceLine: '내부 출처 메모. 카드에 그대로 노출하지 않음',
        emphasis: '강조 문구'
      }]
    },
    candidate: compactCandidate(input)
  });
}

function cardFlowForPrompt(input, intent, desiredCardCount) {
  const label = primaryTopic(input) ?? '이 주제';
  const base = flowRolesForIntent(intent).map((role) => ({
    role,
    mission: flowMission(role, input, intent),
    bodyGuidance: flowBodyGuidance(role, label, intent)
  }));
  const cards = fitFlowRoles(base, desiredCardCount, input, intent);
  return cards.map((item, index) => ({
    page: index + 1,
    ...item
  }));
}

function flowRolesForIntent(intent = {}) {
  if (intent.id === 'consumer_product_marketing' || intent.id === 'pet_consumer_product') {
    return ['cover', 'why_now', 'community_signal', 'comparison', 'misconception', 'content_angle', 'data_scene', 'checklist'];
  }
  if (intent.id === 'parent_social_issue') {
    return ['cover', 'community_signal', 'why_now', 'comparison', 'misconception', 'data_scene', 'content_angle', 'checklist'];
  }
  if (intent.id === 'parent_safety_issue') {
    return ['cover', 'community_signal', 'why_now', 'comparison', 'data_scene', 'misconception', 'content_angle', 'checklist'];
  }
  return ['cover', 'community_signal', 'why_now', 'comparison', 'data_scene', 'misconception', 'content_angle', 'checklist'];
}

function fitFlowRoles(base, desiredCardCount, input = {}, intent = {}) {
  const count = Math.max(3, desiredCardCount);
  if (count <= base.length) {
    const middleCount = count - 2;
    return [base[0], ...base.slice(1, 1 + middleCount), base.at(-1)];
  }
  const label = primaryTopic(input) ?? '이 주제';
  const extras = ['comparison', 'data_scene', 'misconception', 'content_angle']
    .map((role) => ({ role, mission: flowMission(role, input, intent), bodyGuidance: flowBodyGuidance(role, label, intent) }));
  const cards = [...base];
  let cursor = 0;
  while (cards.length < count) {
    cards.splice(cards.length - 1, 0, extras[cursor % extras.length]);
    cursor += 1;
  }
  return cards;
}

function flowMission(role, input = {}, intent = {}) {
  const label = primaryTopic(input) ?? '이 주제';
  if (role === 'cover') return '독자가 넘기고 싶게 만드는 표지 질문 또는 한 줄 약속';
  if (role === 'why_now') return intent.id === 'consumer_product_marketing' || intent.id === 'pet_consumer_product'
    ? '왜 지금 이 제품/브랜드를 사려는지 구매 판단 기준 제시'
    : '왜 지금 이 이슈를 봐야 하는지 타이밍과 변화 기준 제시';
  if (role === 'community_signal') return '사람들이 실제로 궁금해하거나 저장한 이유를 기준/고민 형태로 요약';
  if (role === 'comparison') return '혼자 보면 안 보이는 비교 축과 판단 기준 제시';
  if (role === 'data_scene') return '근거에 있는 숫자나 반복 신호를 하나만 골라 독자가 해석할 기준으로 전환';
  if (role === 'misconception') return '과장하거나 오해하기 쉬운 지점과 피해야 할 조건 분리';
  if (role === 'content_angle') return `${label}을 독자 입장에서 적용할 수 있는 기준으로 전환`;
  if (role === 'checklist') return '마지막에 저장할 판단 기준 3개 제시';
  return '앞 카드와 겹치지 않는 새 관점 제시';
}

function flowBodyGuidance(role, label, intent = {}) {
  if (role === 'cover') return '1~2줄. 제목 반복 금지. 부드러운 해요체로 무엇을 알게 되는지 약속한다.';
  if (role === 'checklist') return '짧은 체크 항목 3줄. 각 줄은 서로 다른 기준이어야 하며 말투는 간결하고 예쁘게 쓴다.';
  if (intent.id === 'consumer_product_marketing' || intent.id === 'pet_consumer_product') {
    return ({
      why_now: '구매 이유를 부드럽게 쓴다. 유행/인기라는 말만 쓰지 말고 성분, 가격, 후기, 사용감 중 판단 기준을 제시한다.',
      community_signal: '후기, 사용감, 망설임, 저장 이유 중 하나를 구체화하고 독자가 확인할 포인트를 자연스럽게 남긴다.',
      comparison: '가격, 성분, 용도, 리뷰, 재구매 중 2~4개 비교 기준을 예쁘고 짧게 제시한다.',
      data_scene: '근거 숫자가 있으면 하나만 해석하고, 없으면 반복 언급을 수치처럼 단정하지 말고 확인 기준으로 바꾼다.',
      misconception: '사지 말아야 할 조건이나 광고 문구와 실제 기준의 차이를 부드럽게 짚는다.',
      content_angle: '제품 소개가 아니라 왜 장바구니에 들어갔는지, 독자가 무엇을 확인해야 하는지로 바꾼다.'
    })[role] ?? `${label}을 구매 판단 기준으로 바꾼다.`;
  }
  return ({
    why_now: '타이밍과 변화 이유를 쓴다. 그냥 뜬다는 말 금지.',
    community_signal: '반복된 질문이나 망설임을 요약한다.',
    comparison: '비교해야 이해되는 축을 제시한다.',
    data_scene: '확인 가능한 수치나 반복 신호를 과장 없이 해석한다.',
    misconception: '오해하기 쉬운 단정과 확인된 사실을 분리한다.',
    content_angle: '독자에게 어떤 변화나 판단 기준이 생기는지 쓴다.'
  })[role] ?? `${label}의 새 관점을 쓴다.`;
}

function compactCandidate(input) {
  const manual = normalizeManualBrief(input);
  const intent = manual ? null : classifyContentIntent(input);
  return {
    label: primaryTopic(input),
    originalLabel: input.label ?? input.keyword,
    sourceMode: input.sourceMode,
    contentIntent: intent?.id,
    manualBrief: manual,
    category: input.category,
    production: input.production,
    validation: input.validation,
    aiAnalysis: input.aiAnalysis,
    selectedHookTitle: input.selectedHookTitle,
    sources: input.sources,
    evidence: (input.evidence ?? []).slice(0, 3),
    sampleTitles: (input.sampleTitles ?? []).slice(0, 3),
    searchVerification: input.searchVerification ? {
      query: input.searchVerification.query,
      verification: input.searchVerification.verification,
      results: (input.searchVerification.results ?? []).slice(0, 3)
    } : undefined
  };
}

function buildManualPrompt(input, manual) {
  return JSON.stringify({
    task: '사용자 직접 입력 주제와 컷 수만 중심으로 인스타 카드뉴스 기획안 JSON을 완성한다.',
    manualRequest: {
      topic: manual.topic,
      prompt: manual.prompt,
      audience: manual.audience || '저장할 만한 실용 정보를 찾는 독자',
      tone: manual.tone || '친근하지만 근거 있는 말투',
      cardCount: manual.cardCount
    },
    rules: [
      `${manual.cardCount}컷 정확히. 첫 장은 표지, 이후 흐름은 주제에 가장 자연스럽게 직접 설계한다.`,
      '반응/비교/데이터/체크 같은 고정 순서에 맞추지 않는다.',
      'title과 body는 실제 카드에 그대로 들어갈 완성 문구다.',
      'visualPrompt와 visualItems는 배경/이미지/표/그래프 제작용 지시로 분리한다.',
      '검증 가능한 표/그래프/비교표가 필요한 카드는 visualData에 실제 값, 단위, 행, 출처명을 구조화한다. 근거가 없으면 visualData를 비운다.',
      'body에는 작성하세요/넣어주세요/보여줘요/확인해야 해요 같은 제작 지시문 금지.',
      '트렌드 감지/검색 신호/커뮤니티 반응을 임의로 넣지 말고 사용자 입력에만 맞춘다.',
      'captionFirstLine, captionBody, captionCTA, hashtags 포함.'
    ],
    jsonStructure: {
      targetAudience: '',
      coreAngle: '',
      referenceStyle: '',
      carouselBlueprint: [''],
      hookTitles: [''],
      captionFirstLine: '',
      captionBody: '',
      captionCTA: '',
      hashtags: [''],
      summary: '',
      riskNotes: [''],
      sourceNotes: ['사용자 입력 기반'],
      cards: [{
        page: 1,
        role: '',
        layout: '',
        visualType: '',
        title: '',
        body: '',
        visualPrompt: '',
        visualItems: [''],
        visualData: { type: '', title: '', items: [], columns: [], rows: [], callouts: [], sources: [] },
        emphasis: ''
      }]
    },
    candidate: compactCandidate(input)
  });
}

function normalizeManualBrief(input = {}) {
  if (input.sourceMode !== 'manual' && !input.manualBrief) return null;
  const raw = input.manualBrief && typeof input.manualBrief === 'object' ? input.manualBrief : {};
  const topic = cleanManualText(raw.topic ?? input.topic ?? input.label ?? input.keyword);
  const prompt = cleanManualText(raw.prompt ?? input.prompt ?? input.summary);
  if (!topic && !prompt) return null;
  return {
    topic: topic || cleanManualText(input.label ?? input.keyword) || '사용자 입력 주제',
    prompt,
    audience: cleanManualText(raw.audience ?? input.targetAudience),
    tone: cleanManualText(raw.tone),
    cardCount: clampCardCount(raw.cardCount ?? input.cardCount)
  };
}

function getDesiredCardCount(input = {}) {
  const manual = normalizeManualBrief(input);
  if (manual) return manual.cardCount;
  return input.cardCount ? clampCardCount(input.cardCount) : DEFAULT_TREND_CARD_COUNT;
}

function clampCardCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 8;
  return Math.min(12, Math.max(3, Math.round(number)));
}

function cleanManualText(value) {
  return `${value ?? ''}`.replace(/\s+/g, ' ').trim().slice(0, 2000);
}

function normalizePlan(data, input, provider) {
  data = repairDeep(data);
  const manual = normalizeManualBrief(input);
  return manual
    ? normalizeManualPlan(data, input, provider, manual)
    : normalizeTrendPlan(data, input, provider);
}

async function enrichPlanVisualDataWithAI(plan, input) {
  const targets = visualDataResearchTargets(plan, input);
  if (!targets.length) return plan;
  const sourcePack = await collectVisualDataSourcePack(input, plan, targets);
  if (!sourcePack.items.length) {
    return updatePlanVisualDataEnrichment(plan, {
      mode: plan.generation?.visualDataEnrichment?.mode ?? 'none',
      aiStatus: 'skipped_no_source_material',
      aiTargetCount: targets.length,
      searchStatus: sourcePack.searchStatus,
      searchQueryCount: sourcePack.searchQueries.length,
      searchResultCount: sourcePack.searchResultCount
    });
  }
  try {
    const { provider, data, meta } = await generateAIJson(buildVisualDataResearchPrompt({ plan, input, targets, sourcePack }), {
      systemPrompt: visualDataResearchSystemPrompt(),
      promptCacheKey: 'trlab_visual_data_research_v1'
    });
    const { cards, applied } = applyAIVisualData(plan.cards ?? [], data);
    return updatePlanVisualDataEnrichment({ ...plan, cards }, {
      mode: applied.length ? 'ai_researched_visualData' : plan.generation?.visualDataEnrichment?.mode ?? 'none',
      aiStatus: applied.length ? 'applied' : 'no_verified_data_returned',
      aiProvider: provider,
      aiModel: meta?.model,
      aiUsage: summarizeVisualDataUsage(meta?.usage),
      aiTargetCount: targets.length,
      aiAppliedCount: applied.length,
      aiCards: applied,
      searchStatus: sourcePack.searchStatus,
      searchQueryCount: sourcePack.searchQueries.length,
      searchResultCount: sourcePack.searchResultCount,
      searchQueries: sourcePack.searchQueries
    });
  } catch (error) {
    return updatePlanVisualDataEnrichment(plan, {
      aiStatus: 'failed',
      aiTargetCount: targets.length,
      aiError: error instanceof Error ? error.message : 'visualData enrichment failed',
      searchStatus: sourcePack.searchStatus,
      searchQueryCount: sourcePack.searchQueries.length,
      searchResultCount: sourcePack.searchResultCount
    });
  }
}

function visualDataResearchTargets(plan = {}, input = {}) {
  if (isOmega3Topic(`${primaryTopic(input)} ${input?.manualBrief?.topic ?? ''} ${input?.manualBrief?.prompt ?? ''}`)) return [];
  return (plan.cards ?? [])
    .filter((card) => needsVisualDataResearch(card))
    .slice(0, 2)
    .map((card) => ({
      page: card.page,
      role: card.role,
      layout: card.layout,
      title: card.title,
      body: card.body,
      visualPrompt: card.visualPrompt,
      visualItems: card.visualItems ?? []
    }));
}

function needsVisualDataResearch(card = {}) {
  if (card.visualData) return false;
  if (card.role === 'cover' || card.layout === 'cover_text' || card.layout === 'cover_photo') return false;
  const text = [card.role, card.layout, card.visualType, card.title, card.body, card.visualPrompt, ...(card.visualItems ?? [])].filter(Boolean).join(' ');
  return card.role === 'data_scene'
    || card.role === 'comparison'
    || card.layout === 'data_chart'
    || card.layout === 'comparison_board'
    || /표|그래프|차트|비교표|수치|rank|ranking|chart|graph|table|compare/i.test(text);
}

function visualDataSourcePack(input = {}, plan = {}) {
  const items = [
    ...(input.searchVerification?.verification?.keyFindings ?? []).map((text) => ({ source: 'search_key_finding', text })),
    ...(input.searchVerification?.results ?? []).map((item) => ({ source: item.source || 'search_result', title: item.title, text: item.snippet, url: item.url })),
    ...(input.evidence ?? []).map((item) => ({ source: item.source || 'candidate_evidence', title: item.title, text: item.metric, url: item.url })),
    ...(plan.sourceNotes ?? []).map((text) => ({ source: 'plan_source_note', text }))
  ]
    .map((item) => ({
      source: cleanManualText(item.source).slice(0, 60),
      title: cleanManualText(item.title).slice(0, 100),
      text: cleanCardBody(item.text ?? item.title ?? '').slice(0, 260),
      url: cleanManualText(item.url).slice(0, 220)
    }))
    .filter((item) => item.title || item.text)
    .slice(0, 8);
  return { items };
}

async function collectVisualDataSourcePack(input = {}, plan = {}, targets = [], searcher = searchExternalProviders) {
  const base = visualDataSourcePack(input, plan);
  const searchQueries = visualDataSearchQueries(input, plan, targets);
  if (!searchQueries.length) {
    return { ...base, searchQueries, searchStatus: 'skipped_no_queries', searchResultCount: 0 };
  }
  const settled = await Promise.allSettled(searchQueries.map((query) => searcher(query)));
  const searchItems = settled.flatMap((result, index) => {
    if (result.status !== 'fulfilled') return [];
    return flattenExternalSearchResults(result.value, searchQueries[index]);
  });
  const mergedItems = dedupeVisualDataSources([...base.items, ...searchItems]).slice(0, 14);
  const fulfilled = settled.filter((result) => result.status === 'fulfilled').length;
  return {
    items: mergedItems,
    searchQueries,
    searchStatus: searchItems.length ? 'searched' : fulfilled ? 'searched_no_results' : 'failed',
    searchResultCount: searchItems.length
  };
}

function visualDataSearchQueries(input = {}, plan = {}, targets = []) {
  const topic = primaryTopic(input) || plan.primaryTopic || input.label || input.keyword || '';
  return targets
    .map((target) => cleanManualText([
      topic,
      target.title,
      target.visualPrompt,
      dataQueryHint(target)
    ].filter(Boolean).join(' ')).slice(0, 180))
    .filter(Boolean)
    .filter((query, index, all) => all.indexOf(query) === index)
    .slice(0, 2);
}

function dataQueryHint(target = {}) {
  const text = [target.role, target.layout, target.title, target.body, target.visualPrompt, ...(target.visualItems ?? [])].filter(Boolean).join(' ');
  if (/비교표|표|table|comparison/i.test(text)) return '공식 통계 기준 비교표 데이터 출처';
  if (/그래프|차트|수치|chart|graph|rank/i.test(text)) return '공식 통계 수치 그래프 데이터 출처';
  return '공식 통계 검증 데이터 출처';
}

function flattenExternalSearchResults(providerGroups = [], query = '') {
  return providerGroups.flatMap((group) => (group.results ?? []).slice(0, 4).map((result) => ({
    source: group.source || 'external_search',
    title: cleanManualText(result.title).slice(0, 100),
    text: cleanCardBody(result.snippet ?? '').slice(0, 260),
    url: cleanManualText(result.url).slice(0, 220),
    query
  }))).filter((item) => item.title || item.text);
}

function dedupeVisualDataSources(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.url || item.title || item.text}`.replace(/[?#].*$/, '').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildVisualDataResearchPrompt({ plan, input, targets, sourcePack }) {
  return JSON.stringify({
    task: '카드뉴스의 표/그래프 카드에 넣을 검증 visualData만 JSON으로 보강한다.',
    topic: primaryTopic(input) || plan.primaryTopic,
    rules: [
      'sourceMaterial에 직접 있거나 출처명과 URL로 설명 가능한 값만 사용한다.',
      '근거가 부족하면 해당 card는 생략한다. 추정값, 가짜 순위, 가짜 표, 출처 없는 수치는 금지.',
      '카드 문구는 다시 쓰지 않는다. visualData만 만든다.',
      'bar_chart는 같은 단위로 비교 가능한 숫자만 items에 넣는다.',
      'evidence_table/comparison_table은 출처에 근거한 조건, 기준, 해석만 rows에 넣는다.',
      'sources에는 실제로 사용한 출처명과 URL을 넣는다.'
    ],
    outputShape: {
      cards: [{
        page: 3,
        visualData: {
          type: 'bar_chart|evidence_table|comparison_table',
          title: '',
          subtitle: '',
          unit: '',
          items: [{ label: '', value: 0, display: '', note: '' }],
          columns: [''],
          rows: [['']],
          callouts: [''],
          sources: [{ label: '', url: '' }],
          sourceSummary: ''
        }
      }]
    },
    targets,
    sourceMaterial: sourcePack.items
  });
}

function visualDataResearchSystemPrompt() {
  return [
    '검증 데이터 리서처.',
    '반드시 JSON만 반환한다.',
    '출처에 없는 숫자, 순위, 효능, 퍼센트, 비교값은 만들지 않는다.',
    '정보가 부족하면 빈 cards 배열을 반환한다.',
    '카드뉴스 이미지에는 나중에 SVG로 렌더링될 데이터 구조만 만든다.'
  ].join(' ');
}

function applyAIVisualData(cards = [], data = {}) {
  const patches = Array.isArray(data.cards) ? data.cards : [];
  const applied = [];
  const nextCards = cards.map((card) => {
    const patch = patches.find((item) => Number(item?.page) === Number(card.page));
    const visualData = normalizeVisualData(patch?.visualData);
    if (!visualData?.sources?.length) return card;
    applied.push({
      page: card.page,
      type: visualData.type,
      title: visualData.title,
      sources: visualData.sources.map((source) => source.label).filter(Boolean).slice(0, 3)
    });
    return {
      ...card,
      visualData,
      dataPoint: card.dataPoint || visualData.sourceSummary || '',
      visualPrompt: dataCardVisualPrompt({ ...card, visualData }, {}, card.dataStory || '')
    };
  });
  return { cards: nextCards, applied };
}

function updatePlanVisualDataEnrichment(plan, patch = {}) {
  return {
    ...plan,
    generation: {
      ...(plan.generation ?? {}),
      visualDataEnrichment: {
        ...(plan.generation?.visualDataEnrichment ?? visualDataEnrichmentMeta(plan.cards ?? [], {})),
        ...patch
      }
    }
  };
}

function summarizeVisualDataUsage(usage = {}) {
  if (!usage || typeof usage !== 'object') return undefined;
  return {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    cachedTokens: usage.prompt_tokens_details?.cached_tokens
  };
}

function normalizeTrendPlan(data, input, provider) {
  const aiCardCount = Array.isArray(data.cards) ? data.cards.length : 0;
  const desiredCardCount = input.cardCount
    ? getDesiredCardCount(input)
    : Math.min(12, Math.max(DEFAULT_TREND_CARD_COUNT, aiCardCount || DEFAULT_TREND_CARD_COUNT));
  const cards = Array.isArray(data.cards) && data.cards.length ? data.cards : fallbackCards(input);
  const intent = classifyContentIntent(input);
  const referenceStyle = data.referenceStyle ?? chooseReferenceStyle(input);
  const rawCards = ensureTrendCarouselCards(cards, input, desiredCardCount).slice(0, desiredCardCount);
  const normalizedCards = rawCards.map((card, index) => normalizeTrendCard(card, input, index, rawCards.length, referenceStyle));
  const hasCompleteAiCards = aiCardCount >= desiredCardCount;
  const intentMismatch = hasIntentMismatch(normalizedCards, input, intent);
  const weakPlan = !hasCompleteAiCards && isWeakPlan(normalizedCards, input);
  const shouldReplaceAiCards = intentMismatch || weakPlan;
  const baseFinalCards = (shouldReplaceAiCards
    ? ensureTrendCarouselCards(evidenceBackedCards(input), input, desiredCardCount).slice(0, desiredCardCount)
    : normalizedCards.map((card, index) => strengthenCard(card, input, index)))
    .map(enforceCardLength)
    .map((card, index) => enforceIntentCard(card, input, intent, index));
  const finalCards = (hasCompleteAiCards ? normalizeChecklistCards(baseFinalCards, input) : ensureFinalChecklist(baseFinalCards, input))
    .map((card, index) => (index === 0 && input.selectedHookTitle ? { ...card, title: compactTitle(input.selectedHookTitle, input, 32) } : card));
  const cardsWithVisualData = enforceOmega3VisualDataCards(finalCards, input);
  const hookTitles = normalizeHookTitles(data.hookTitles, input, intent);
  const selectedHookTitle = cleanManualText(input.selectedHookTitle);
  return {
    provider,
    generation: {
      source: shouldReplaceAiCards ? 'ai_with_local_rewrite' : 'ai',
      provider,
      aiCardCount,
      requestedCardCount: desiredCardCount,
      replacedCards: shouldReplaceAiCards,
      reason: intentMismatch ? 'intent_mismatch' : weakPlan ? 'weak_or_incomplete_cards' : 'ai_cards_used',
      visualDataEnrichment: visualDataEnrichmentMeta(cardsWithVisualData, input)
    },
    primaryTopic: primaryTopic(input),
    selectedHookTitle,
    targetAudience: data.targetAudience ?? intent.audience,
    coreAngle: data.coreAngle ?? input.production?.suggestedAngle ?? intent.angle ?? input.summary ?? '',
    referenceStyle,
    referencePattern: normalizeReferencePattern(data.referencePattern, referenceStyle),
    carouselBlueprint: ensureList(data.carouselBlueprint, defaultBlueprint(input, intent)).slice(0, desiredCardCount),
    hookTitles: selectedHookTitle ? [selectedHookTitle, ...hookTitles.filter((title) => title !== selectedHookTitle)].slice(0, 5) : hookTitles,
    captionFirstLine: normalizeCaptionFirstLine(data.captionFirstLine, input),
    captionBody: normalizeCaptionBody(data.captionBody, input),
    captionCTA: normalizeCaptionCTA(data.captionCTA),
    hashtags: normalizeHashtags(data.hashtags, input),
    summary: data.summary ?? `${primaryTopic(input)}의 배경과 근거, 저장해둘 포인트를 쉽게 풀어봅니다.`,
    riskNotes: ensureList(data.riskNotes, ['근거가 부족한 수치는 단정하지 마세요.']),
    sourceNotes: filterSourceNotes(ensureList(data.sourceNotes, getEvidence(input, intent)), intent, input),
    cards: cardsWithVisualData
  };
}

function enforceCardLength(card) {
  const maxLines = card.role === 'cover' ? 2 : 3;
  const { _hadExplicitRole, ...cleanCard } = card;
  return {
    ...cleanCard,
    body: `${card.body ?? ''}`.split('\n').filter(Boolean).slice(0, maxLines).join('\n')
  };
}

function normalizeChecklistCards(cards, input) {
  return cards.map((card) => (card.role === 'checklist' || card.layout === 'checklist' ? normalizeChecklistCard(card, input) : card));
}

function ensureFinalChecklist(cards, input) {
  if (!cards.length) return cards;
  const last = cards[cards.length - 1];
  const looksLikeChecklist = /체크|저장|기준/.test(`${last.title} ${last.body} ${last.visualPrompt}`);
  if (last.role === 'checklist' && last.layout === 'checklist' && looksLikeChecklist) {
    return normalizeChecklistCards(cards, input);
  }
  const fallback = evidenceBackedCards(input).find((card) => card.role === 'checklist') ?? {
    role: 'checklist',
    layout: 'checklist',
    visualType: 'checklist',
    title: '저장 기준 3개',
    body: '지금 볼 이유가 있나\n비교 기준이 있나\n다시 확인할 수 있나',
    sourceLine: primaryTopic(input),
    dataPoint: primaryTopic(input),
    emphasis: '저장 기준'
  };
  return cards.map((card, index) => (index === cards.length - 1 ? normalizeChecklistCard({ ...fallback, page: index + 1 }, input) : card));
}

function normalizeChecklistCard(card, input) {
  if (card.role !== 'checklist' && card.layout !== 'checklist') return card;
  const intent = classifyContentIntent(input);
  const title = isGenericChecklistTitle(card.title) ? checklistTitleForIntent(input, intent) : card.title;
  const emphasis = isGenericChecklistEmphasis(card.emphasis) ? checklistEmphasisForIntent(intent) : card.emphasis;
  return {
    ...card,
    title,
    emphasis
  };
}

function enforceOmega3VisualDataCards(cards = [], input = {}) {
  const topic = [
    primaryTopic(input),
    input?.selectedHookTitle,
    input?.summary,
    input?.manualBrief?.topic,
    input?.manualBrief?.prompt,
    ...cards.flatMap((card) => [card.title, card.body, card.visualPrompt, ...(Array.isArray(card.visualItems) ? card.visualItems : [])])
  ].filter(Boolean).join(' ');
  if (!isOmega3Topic(topic)) return cards;
  return cards.map((card, index) => {
    if (index === 2 && cards.length >= 3) {
      return {
        ...card,
        role: 'data_scene',
        layout: 'data_chart',
        visualType: 'chart',
        visualData: card.visualData?.type === 'bar_chart' ? card.visualData : omega3FoodComparisonChartData(),
        dataPoint: card.dataPoint || omega3FoodComparisonChartData().sourceSummary,
        visualPrompt: /빈 중앙 패널|SVG|권장 섭취량|그래프|식단|식품/.test(`${card.visualPrompt ?? ''}`)
          ? card.visualPrompt
          : '오메가3 식품/보충제 함량 비교 그래프가 들어갈 빈 중앙 패널. 실제 숫자와 막대는 TrLab SVG 레이어로 자동 렌더링.',
        visualItems: ['연어', '청어', '정어리', '피쉬오일']
      };
    }
    if (index === 3 && cards.length >= 4) {
      return {
        ...card,
        role: 'comparison',
        layout: 'comparison_board',
        visualType: 'table',
        visualData: card.visualData?.type === 'evidence_table' ? card.visualData : omega3SupplementEvidenceTableData(),
        dataPoint: card.dataPoint || omega3SupplementEvidenceTableData().sourceSummary,
        visualPrompt: /빈 중앙 패널|SVG|표|비교/.test(`${card.visualPrompt ?? ''}`)
          ? card.visualPrompt
          : '오메가3 식품, 피쉬오일, 알갈오일, 처방 오메가3 비교표가 들어갈 빈 중앙 패널. 실제 표는 TrLab SVG 레이어로 자동 렌더링.',
        visualItems: ['식품', '피쉬오일', '알갈오일', '처방 오메가3']
      };
    }
    return card;
  });
}

function visualDataEnrichmentMeta(cards = [], input = {}) {
  const topic = [
    primaryTopic(input),
    input?.selectedHookTitle,
    input?.summary,
    input?.manualBrief?.topic,
    input?.manualBrief?.prompt
  ].filter(Boolean).join(' ');
  const dataCards = cards
    .filter((card) => card?.visualData && typeof card.visualData === 'object')
    .map((card) => ({
      page: card.page,
      role: card.role,
      layout: card.layout,
      type: card.visualData.type,
      title: card.visualData.title,
      sources: (card.visualData.sources ?? []).map((source) => source.label).filter(Boolean).slice(0, 3)
    }));
  const profiles = [];
  if (isOmega3Topic(topic)) profiles.push('omega3_official_sources');
  return {
    enabled: true,
    mode: profiles.length ? 'curated_verified_profile' : dataCards.length ? 'ai_or_input_visualData' : 'none',
    profiles,
    cardCount: dataCards.length,
    cards: dataCards,
    sourcePolicy: 'visualData는 출처가 있는 값만 SVG 오버레이로 렌더링하고, 이미지 모델에는 빈 데이터 영역만 전달합니다.'
  };
}

function isGenericChecklistTitle(value) {
  return /^(저장\s*기준|저장\s*전\s*체크|저장\s*체크|체크리스트|마지막\s*체크|이렇게\s*만들기)(\s*\d+개?)?$/.test(`${value ?? ''}`.trim());
}

function isGenericChecklistEmphasis(value) {
  return !value || /저장\s*기준|저장\s*체크|체크리스트|다시\s*볼/.test(`${value ?? ''}`);
}

function checklistTitleForIntent(input, intent = classifyContentIntent(input)) {
  if (intent.id === 'parent_social_issue') return '등원 전 체크 3개';
  if (intent.id === 'parent_safety_issue') return '구매 전 체크 3개';
  if (intent.id === 'consumer_product_marketing' || intent.id === 'pet_consumer_product') return '사기 전 체크 3개';
  if (normalizeManualBrief(input)) return '실행 전 체크 3개';
  return '확인할 기준 3개';
}

function checklistEmphasisForIntent(intent = {}) {
  if (intent.id === 'parent_social_issue') return '등원 판단 기준';
  if (intent.id === 'parent_safety_issue') return '구매 판단 기준';
  if (intent.id === 'consumer_product_marketing' || intent.id === 'pet_consumer_product') return '구매 판단 기준';
  return '확인 기준';
}

function normalizeManualPlan(data, input, provider, manual) {
  const desiredCardCount = manual.cardCount;
  const cards = Array.isArray(data.cards) && data.cards.length ? data.cards : manualFallbackCards(input, desiredCardCount);
  const referenceStyle = data.referenceStyle ?? chooseReferenceStyle(input);
  const rawCards = ensureManualCarouselCards(cards, input, desiredCardCount).slice(0, desiredCardCount);
  const normalizedCards = rawCards.map((card, index) => normalizeManualCard(card, input, index, rawCards.length, referenceStyle));
  const cardsWithVisualData = enforceOmega3VisualDataCards(normalizedCards, input);
  return {
    provider,
    generation: {
      source: Array.isArray(data.cards) && data.cards.length ? 'ai' : 'fallback',
      provider,
      aiCardCount: Array.isArray(data.cards) ? data.cards.length : 0,
      requestedCardCount: desiredCardCount,
      visualDataEnrichment: visualDataEnrichmentMeta(cardsWithVisualData, input)
    },
    targetAudience: data.targetAudience ?? manual.audience ?? '저장할 만한 실용 정보를 찾는 독자',
    coreAngle: data.coreAngle ?? manual.prompt ?? manual.topic,
    referenceStyle,
    referencePattern: normalizeReferencePattern(data.referencePattern, referenceStyle),
    carouselBlueprint: ensureList(data.carouselBlueprint, defaultBlueprint(input)).slice(0, desiredCardCount),
    hookTitles: ensureList(data.hookTitles, [manual.topic]).map((title) => compactTitle(title, input, 28)).slice(0, 5),
    captionFirstLine: normalizeCaptionFirstLine(data.captionFirstLine, input),
    captionBody: normalizeCaptionBody(data.captionBody, input),
    captionCTA: normalizeCaptionCTA(data.captionCTA),
    hashtags: normalizeHashtags(data.hashtags, input),
    summary: data.summary ?? manual.prompt ?? `${manual.topic} 카드뉴스 기획안`,
    riskNotes: ensureList(data.riskNotes, ['과장된 단정 표현은 피하세요.']),
    sourceNotes: ensureList(data.sourceNotes, ['사용자 입력 기반']),
    cards: cardsWithVisualData
  };
}

function ensureCarouselCards(cards, input, desiredCardCount = getDesiredCardCount(input)) {
  const base = Array.isArray(cards) ? cards.filter(Boolean) : [];
  if (base.length >= desiredCardCount) return base;
  const fallback = normalizeManualBrief(input) ? manualFallbackCards(input, desiredCardCount) : evidenceBackedCards(input);
  const filled = [...base];
  for (let index = base.length; index < desiredCardCount; index += 1) {
    const fallbackCard = fallback[index] ?? fallback[fallback.length - 1];
    filled.push({ ...fallbackCard, page: index + 1 });
  }
  return filled;
}

function ensureTrendCarouselCards(cards, input, desiredCardCount) {
  const base = Array.isArray(cards) ? cards.filter(Boolean) : [];
  if (base.length >= desiredCardCount) return base;
  return ensureCarouselCards(base, input, desiredCardCount);
}

function ensureManualCarouselCards(cards, input, desiredCardCount) {
  const base = Array.isArray(cards) ? cards.filter(Boolean) : [];
  if (base.length >= desiredCardCount) return base;
  const fallback = manualFallbackCards(input, desiredCardCount);
  const filled = [...base];
  for (let index = base.length; index < desiredCardCount; index += 1) {
    const fallbackCard = fallback[index] ?? fallback[fallback.length - 1];
    filled.push({ ...fallbackCard, page: index + 1 });
  }
  return filled;
}

export function normalizeContentPlanForTest(data, input, provider = 'test') {
  return normalizePlan(data, input, provider);
}

export const __contentPlannerTestUtils = {
  visualDataResearchTargets,
  visualDataSourcePack,
  collectVisualDataSourcePack,
  visualDataSearchQueries,
  flattenExternalSearchResults,
  dedupeVisualDataSources,
  applyAIVisualData,
  updatePlanVisualDataEnrichment
};

function normalizeTrendCard(card, input, index, total, referenceStyle) {
  const intent = classifyContentIntent(input);
  const role = normalizeTrendRole(card.role, index, total);
  const layout = normalizeLayout(card.layout, role, index, referenceStyle);
  const title = normalizeTrendCardTitle(card.title, input, index, role);
  const body = finalizeCardBody(normalizeTrendCardBody(richBody(card, input), role, card), role, card, input);
  const sourceLine = normalizeSourceLine(card, input, index, role);
  return normalizeDataCardContract({
    page: card.page ?? index + 1,
    _hadExplicitRole: Boolean(card.role || card.layout),
    role,
    layout,
    visualType: card.visualType ?? visualTypeForLayout(layout),
    title,
    body: formatCardText(cleanCardBody(cleanAiTone(body))),
    dataPoint: card.dataPoint ?? (role === 'data_scene' ? sourceLine : ''),
    insight: card.insight ?? '',
    action: card.action ?? '',
    visualPrompt: normalizeVisualPrompt(card.visualPrompt, input, role, layout, title, body, sourceLine, intent),
    visualItems: normalizeVisualItems(card.visualItems, input, role, card),
    visualData: normalizeVisualData(card.visualData),
    sourceLine,
    emphasis: card.emphasis ?? card.dataPoint ?? primaryTopic(input)
  }, input);
}

function normalizeManualCard(card, input, index, total, referenceStyle) {
  const role = canonicalManualRole(index, total, card.role);
  const layout = normalizeLayout(card.layout, role, index, referenceStyle);
  const title = normalizeManualCardTitle(card.title, input, index, role);
  const body = finalizeCardBody(normalizeManualCardBodyFromValue(richManualBody(card), role, card), role, card, input, true);
  return normalizeDataCardContract({
    page: card.page ?? index + 1,
    role,
    layout,
    visualType: card.visualType ?? visualTypeForLayout(layout),
    title,
    body: formatCardText(cleanCardBody(cleanAiTone(body))),
    dataPoint: card.dataPoint ?? '',
    insight: card.insight ?? '',
    action: card.action ?? '',
    visualPrompt: normalizeVisualPrompt(card.visualPrompt, input, role, layout, title, body, card.sourceLine ?? '', null),
    visualItems: normalizeVisualItems(card.visualItems, input, role, card),
    visualData: normalizeVisualData(card.visualData),
    sourceLine: cleanCardBody(card.sourceLine ?? ''),
    emphasis: card.emphasis ?? card.dataPoint ?? title
  }, input);
}

function normalizeDataCardContract(card, input) {
  const omega3Data = omega3VisualDataForCard(card, input);
  const omega3DataLike = omega3Data && omega3Data.type === 'bar_chart';
  if (omega3Data && (card.role === 'comparison' || card.layout === 'comparison_board')) {
    return { ...card, visualData: omega3Data, dataPoint: card.dataPoint || omega3Data.sourceSummary };
  }
  if (omega3DataLike) {
    return {
      ...card,
      role: card.role === 'cover' ? card.role : 'data_scene',
      layout: card.role === 'cover' ? card.layout : 'data_chart',
      visualType: card.role === 'cover' ? card.visualType : 'chart',
      visualData: omega3Data,
      dataPoint: card.dataPoint || omega3Data.sourceSummary,
      visualPrompt: dataCardVisualPrompt({ ...card, visualData: omega3Data }, input, card.dataStory || '')
    };
  }
  if (card.role !== 'data_scene' && card.layout !== 'data_chart') return card;
  const dataText = [card.dataPoint, card.sourceLine, card.body, card.emphasis].filter(Boolean).join(', ');
  const labels = normalizeVisualItems(card.visualItems, input, 'data_scene', card);
  const metrics = extractDataCardMetrics(dataText, labels);
  const story = dataCardStory({ ...card, visualItems: labels }, metrics, input);
  const visualData = omega3Data || normalizeVisualData(card.visualData);
  return {
    ...card,
    layout: 'data_chart',
    visualType: 'chart',
    dataStory: story || card.dataStory || '',
    body: story ? normalizeDataStoryBody(story) : card.body,
    visualPrompt: dataCardVisualPrompt(card, input, story),
    visualItems: labels.length ? labels : metrics.map((metric) => metric.label).slice(0, 4),
    visualData,
    dataPoint: card.dataPoint || visualData?.sourceSummary || ''
  };
}

function normalizeVisualData(value) {
  if (!value || typeof value !== 'object') return undefined;
  const type = `${value.type ?? ''}`.trim();
  if (!['bar_chart', 'evidence_table', 'comparison_table'].includes(type)) return undefined;
  const sources = Array.isArray(value.sources)
    ? value.sources.map((source) => ({
      label: cleanManualText(source?.label ?? source?.name).slice(0, 80),
      url: cleanManualText(source?.url).slice(0, 220)
    })).filter((source) => source.label)
    : [];
  const base = {
    type,
    title: cleanManualText(value.title).slice(0, 80),
    subtitle: cleanManualText(value.subtitle).slice(0, 120),
    unit: cleanManualText(value.unit).slice(0, 24),
    sourceSummary: cleanCardBody(value.sourceSummary ?? '').slice(0, 500),
    callouts: Array.isArray(value.callouts) ? value.callouts.map((item) => cleanCardBody(item).slice(0, 120)).filter(Boolean).slice(0, 3) : [],
    sources
  };
  if (type === 'bar_chart') {
    const items = Array.isArray(value.items)
      ? value.items.map((item) => ({
        label: cleanManualText(item?.label).slice(0, 30),
        value: Number(item?.value),
        display: cleanManualText(item?.display ?? item?.value).slice(0, 40),
        note: cleanManualText(item?.note).slice(0, 60),
        segments: Array.isArray(item?.segments)
          ? item.segments.map((segment) => ({
            label: cleanManualText(segment?.label).slice(0, 18),
            value: Number(segment?.value),
            display: cleanManualText(segment?.display ?? segment?.value).slice(0, 28)
          })).filter((segment) => segment.label && Number.isFinite(segment.value)).slice(0, 3)
          : []
      })).filter((item) => item.label && Number.isFinite(item.value) && item.display).slice(0, 7)
      : [];
    const referenceLines = Array.isArray(value.referenceLines)
      ? value.referenceLines.map((line) => ({
        label: cleanManualText(line?.label).slice(0, 40),
        value: Number(line?.value),
        display: cleanManualText(line?.display ?? line?.value).slice(0, 28)
      })).filter((line) => line.label && Number.isFinite(line.value)).slice(0, 3)
      : [];
    return items.length ? { ...base, items, referenceLines } : undefined;
  }
  const columns = Array.isArray(value.columns) ? value.columns.map((item) => cleanManualText(item).slice(0, 24)).filter(Boolean).slice(0, 4) : [];
  const rows = Array.isArray(value.rows)
    ? value.rows.map((row) => Array.isArray(row)
      ? row.map((cell) => cleanCardBody(cell).replace(/\n+/g, ' ').slice(0, 80)).filter(Boolean).slice(0, 4)
      : [cleanCardBody(row).replace(/\n+/g, ' ').slice(0, 80)]
    ).filter((row) => row.length).slice(0, 6)
    : [];
  return rows.length ? { ...base, columns, rows } : undefined;
}

function omega3VisualDataForCard(card = {}, input = {}) {
  const text = [
    primaryTopic(input),
    input?.selectedHookTitle,
    input?.manualBrief?.topic,
    input?.manualBrief?.prompt,
    input?.summary,
    card.title,
    card.body,
    card.visualPrompt,
    card.emphasis,
    card.dataPoint
  ].filter(Boolean).join(' ');
  if (!/오메가\s*3|omega-?3|EPA|DHA|ALA|피쉬\s*오일|fish\s*oil/i.test(text)) return null;
  const comparisonLike = card.role === 'comparison'
    || card.layout === 'comparison_board'
    || /기타\s*영양제|비타민|철분|효능\s*비교|비교.*효능|표\s*형식|비교표|vs|VS/.test(text);
  if (comparisonLike) return omega3SupplementEvidenceTableData();
  if (/권장|섭취량|그래프|차트|식단|식품|부족|표시|수치/.test(text)) return omega3FoodComparisonChartData();
  if (card.role !== 'data_scene' && card.layout !== 'data_chart') return null;
  return omega3FoodComparisonChartData();
}

function omega3FoodComparisonChartData() {
  return {
    type: 'bar_chart',
    title: '식단으로 채우는 오메가3',
    subtitle: '1회 제공량 기준 g. 식물성은 ALA, 생선/보충제는 DHA+EPA',
    unit: 'g/serving',
    sourceSummary: 'NIH ODS Table 2: 아마씨유 1tbsp ALA 7.26g, 치아씨드 1oz ALA 5.06g, 호두 1oz ALA 2.57g, 연어 3oz DHA 1.24g+EPA 0.59g, 청어 0.94g+0.77g, 정어리 0.74g+0.45g. 일반 피쉬오일 1,000mg은 EPA 180mg+DHA 120mg 예시. 성인 ALA AI는 남 1.6g/day, 여 1.1g/day이고 EPA/DHA는 공식 권장섭취량이 정해지지 않음.',
    items: [
      { label: '아마씨유 1T', value: 7.26, display: 'ALA 7.26g', note: 'NIH ODS Table 2', segments: [{ label: 'ALA', value: 7.26, display: '7.26g' }] },
      { label: '치아씨드 1oz', value: 5.06, display: 'ALA 5.06g', note: 'NIH ODS Table 2', segments: [{ label: 'ALA', value: 5.06, display: '5.06g' }] },
      { label: '호두 1oz', value: 2.57, display: 'ALA 2.57g', note: 'NIH ODS Table 2', segments: [{ label: 'ALA', value: 2.57, display: '2.57g' }] },
      { label: '연어 3oz', value: 1.83, display: 'DHA 1.24+EPA 0.59g', note: 'NIH ODS Table 2', segments: [{ label: 'DHA', value: 1.24, display: '1.24g' }, { label: 'EPA', value: 0.59, display: '0.59g' }] },
      { label: '청어 3oz', value: 1.71, display: 'DHA 0.94+EPA 0.77g', note: 'NIH ODS Table 2', segments: [{ label: 'DHA', value: 0.94, display: '0.94g' }, { label: 'EPA', value: 0.77, display: '0.77g' }] },
      { label: '정어리 3oz', value: 1.19, display: 'DHA 0.74+EPA 0.45g', note: 'NIH ODS Table 2', segments: [{ label: 'DHA', value: 0.74, display: '0.74g' }, { label: 'EPA', value: 0.45, display: '0.45g' }] },
      { label: '피쉬오일', value: 0.3, display: 'EPA 0.18+DHA 0.12g', note: '일반 1,000mg 예시', segments: [{ label: 'EPA', value: 0.18, display: '0.18g' }, { label: 'DHA', value: 0.12, display: '0.12g' }] }
    ],
    referenceLines: [
      { label: '성인 남성 ALA AI', value: 1.6, display: '1.6g/일' },
      { label: '성인 여성 ALA AI', value: 1.1, display: '1.1g/일' }
    ],
    callouts: [
      'EPA·DHA는 공식 권장량이 없어 식품/제품 함량을 따로 봐야 해요.',
      'AHA는 지방 많은 생선 2회/주 섭취를 권고해요.'
    ],
    sources: [
      { label: 'NIH ODS Omega-3 Health Professional Fact Sheet', url: 'https://ods.od.nih.gov/factsheets/Omega3FattyAcids-HealthProfessional/' },
      { label: 'American Heart Association Fish and Omega-3', url: 'https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/fish-and-omega-3-fatty-acids' }
    ]
  };
}

function omega3SupplementEvidenceTableData() {
  return {
    type: 'evidence_table',
    title: '보충제별 효능 근거',
    subtitle: '효능보다 성분 형태와 필요한 상황 먼저 보기',
    sourceSummary: 'NIH ODS: 일반 피쉬오일 1,000mg은 EPA 180mg+DHA 120mg 예시, 알갈오일은 보통 DHA 100~300mg 제공. NCCIH: 해산물의 근거가 보충제보다 강하고, 심장질환 또는 고중성지방이 있는 사람은 보충제 이득 가능성이 있음. AHA는 생선 2회/주 섭취를 권고.',
    columns: ['형태', '근거/효능', '카드 해석'],
    rows: [
      ['식품 섭취', '해산물 근거가 보충제보다 강함', '우선은 식단에서 EPA·DHA 확보'],
      ['일반 피쉬오일', 'EPA 180mg+DHA 120mg 예시', '함량 차이가 커 제품 라벨 확인'],
      ['알갈오일', 'DHA 100~300mg, 일부 EPA 포함', '비건/해산물 회피 시 대안'],
      ['처방 오메가3', '고중성지방 이득 가능성', '치료 목적은 의료진 영역']
    ],
    callouts: [
      '일반 저위험군은 보충제보다 식단 근거가 더 단단해요.',
      '고용량·약물 복용 중이면 의료진 상담이 필요해요.'
    ],
    sources: [
      { label: 'NIH ODS Omega-3 Health Professional Fact Sheet', url: 'https://ods.od.nih.gov/factsheets/Omega3FattyAcids-HealthProfessional/' },
      { label: 'NCCIH Omega-3 Supplements', url: 'https://www.nccih.nih.gov/health/omega3-supplements-what-you-need-to-know' }
    ]
  };
}

function normalizeDataStoryBody(value) {
  return `${value ?? ''}`
    .split('\n')
    .flatMap((line) => splitReadableLines(line, 40))
    .filter(Boolean)
    .slice(0, 3)
    .join('\n');
}

function dataCardVisualPrompt(card, input, story) {
  const topic = [primaryTopic(input), card.title].filter(Boolean).join(' ');
  const base = `${topic} 데이터를 보여주는 카드`;
  const hasStory = Boolean(story);
  const background = /홍콩|hong kong/i.test(`${topic} ${card.body} ${card.dataPoint} ${card.visualPrompt}`)
    ? '홍콩 야경 고층 아파트와 빅토리아 하버가 보이는 배경'
    : /강남|서울|아파트|부동산|집값/i.test(`${topic} ${card.body} ${card.dataPoint} ${card.visualPrompt}`)
      ? '도심 아파트와 야간 스카이라인 배경'
      : '주제와 직접 연결되는 실제적인 배경';
  const center = hasStory
    ? '중앙에는 상승/하락 흐름을 한눈에 볼 수 있는 차트 영역, 하단에는 핵심 데이터 스토리 문장이 들어갈 여백'
    : '중앙에는 반복 신호 3개와 사례 요약 영역, 하단에는 핵심 문장이 들어갈 여백';
  return `${card.visualPrompt || base}. ${background}. ${center}. ${story || ''}`.trim();
}

function dataCardStory(card, metrics, input) {
  const text = [card.title, card.body, card.dataPoint, card.sourceLine, primaryTopic(input)].filter(Boolean).join(' ');
  const years = [...text.matchAll(/\b(19\d{2}|20\d{2})\b/g)].map((match) => match[1]);
  const values = metrics.filter((metric) => /\d/.test(metric.valueLabel));
  const current = values.find((metric) => /현재|최근|평균|current|latest/i.test(metric.label)) ?? values.at(-1);
  const firstYear = years[0];
  const lastYear = years.length > 1 ? years.at(-1) : '';
  const subject = /홍콩/.test(text) ? '홍콩 부동산' : /강남/.test(text) ? '강남 부동산' : (primaryTopic(input) || '이 지표');
  const valueName = /집값|부동산|아파트|평균/.test(text) ? '평균 집값' : '현재값';
  if (firstYear && lastYear && current?.valueLabel) {
    return `${subject}은 ${firstYear}년부터 ${lastYear}년까지 상승 흐름이 이어졌습니다.\n현재 ${valueName}은 ${current.valueLabel}입니다.`;
  }
  if (current?.valueLabel && values.length >= 2) {
    return `${subject}은 앞선 구간보다 최근 값이 더 중요합니다.\n지금 확인할 기준값은 ${current.valueLabel}입니다.`;
  }
  return '';
}

function extractDataCardMetrics(text, labels = []) {
  const source = `${text ?? ''}`;
  const fromLabels = labels.map((label) => {
    const escaped = escapeRegExp(label);
    const match = new RegExp(`${escaped}[^\\d-]*(-?\\d+(?:,\\d{3})*(?:\\.\\d+)?)(\\s*[%억조만명건개]?)`, 'i').exec(source);
    return match ? { label, valueLabel: `${match[1]}${(match[2] ?? '').trim()}` } : null;
  }).filter(Boolean);
  if (fromLabels.length >= 2) return fromLabels;
  return [...source.matchAll(/((?:19|20)\d{2}|현재|최근|평균|마지막|지금)?[^\d-]{0,12}(-?\d+(?:,\d{3})*(?:\.\d+)?)(\s*[%억조만명건개]?)/g)]
    .map((match, index) => ({ label: `${match[1] || `지표 ${index + 1}`}`.trim(), valueLabel: `${match[2]}${(match[3] ?? '').trim()}` }))
    .filter((metric) => metric.valueLabel)
    .slice(0, 4);
}

function escapeRegExp(value) {
  return `${value ?? ''}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeTrendCardTitle(value, input, index, role) {
  return normalizeCardTitle(value, input, index, role, false);
}

function normalizeManualCardTitle(value, input, index, role) {
  return normalizeCardTitle(value, input, index, role, true);
}

function normalizeTrendCardBody(value, role, card = {}) {
  return normalizeCardBody(value, role, card, false);
}

function normalizeManualCardBodyFromValue(value, role, card = {}) {
  return normalizeCardBody(value, role, card, true);
}

function richManualBody(card) {
  const base = `${card.body ?? ''}`.trim();
  if (base) return formatCardText(base);
  const parts = [card.insight, card.action].filter(Boolean);
  return formatCardText(parts.join('\n'));
}

function normalizeSourceLine(card, input, index, role) {
  const intent = classifyContentIntent(input);
  const evidence = getEvidence(input, intent);
  const fallback = role === 'cover'
    ? ''
    : evidence[index] ?? evidence.find((item) => /\d/.test(item)) ?? evidence[0] ?? '확인 필요';
  const source = card.sourceLine ?? card.dataPoint;
  return cleanCardBody(isEvidenceRelevant(source, intent, input) ? source : fallback);
}

function richBody(card, input) {
  const base = `${card.body ?? ''}`.trim();
  if (base) return formatCardText(base);
  const parts = [card.insight, card.action].filter(Boolean);
  if (parts.length) return formatCardText(parts.join('\n'));
  return formatCardText(`${primaryTopic(input)}은 많이 보인다는 말보다 이유가 더 중요해요. 비교할 기준이 보이면 훨씬 오래 남아요.`);
}

function normalizeCardTitle(value, input, index, role, manual = false) {
  const intent = manual ? null : classifyContentIntent(input);
  const fallback = defaultTitleForRole(input, role, index, intent);
  const cleaned = cleanAiTone(cleanTitle(value || fallback));
  if (!cleaned || isGenericTitle(cleaned) || isInstructionalTitle(cleaned)) return fallback;
  if (role === 'cover' && !manual && !hasCoverHookTitle(cleaned)) return fallback;
  const limit = manual ? (role === 'cover' ? 32 : 24) : (role === 'cover' ? 32 : 18);
  return compactTitle(cleaned, input, limit);
}

function normalizeCardBody(value, role, card = {}, manual = false) {
  const cleaned = removePlanningEchoes(cleanCardBody(cleanAiTone(value)), card);
  const lines = formatCardText(cleaned).split('\n').filter(Boolean);
  const maxLines = role === 'cover' ? 2 : 3;
  if (manual) return normalizeManualCardBody(lines, maxLines);
  const limit = role === 'cover' ? 22 : 32;
  const normalized = lines
    .flatMap((line) => splitReadableLines(line, limit))
    .filter(Boolean)
    .slice(0, maxLines);
  return normalized.join('\n');
}

function normalizeManualCardBody(lines, maxLines) {
  const normalized = lines
    .flatMap((line) => splitReadableLines(line, 42))
    .filter(Boolean)
    .slice(0, maxLines);
  return normalized.join('\n');
}

function finalizeCardBody(value, role, card = {}, input = {}, manual = false) {
  const body = cleanCardBody(cleanAiTone(value));
  if (body && !isInstructionalBody(body) && !isBadCardCopy(body) && hasFinishedCardCopy(body)) return body;
  const topic = cleanShort(primaryTopic(input) ?? input.manualBrief?.topic ?? card.title ?? '이 주제');
  const intent = manual ? null : classifyContentIntent(input);
  const fact = cleanShort(card.dataPoint || card.sourceLine || getEvidence(input, intent)[0] || topic);
  const title = cleanShort(card.title || defaultTitleForRole(input, role, 0));
  if (manual) return manualFinishedBody(role, topic, title, fact);
  return trendFinishedBody(role, topic, title, fact);
}

function isInstructionalBody(value) {
  return /(작성|구성|넣어|보여줘|보여주|정리해야|잡아야|제시|설명해야|만들어야|활용할|나누는 거|기준.*잡|어떻게 할|무엇을|해야 합니다|해주세요|합니다\.|비교해야 할 대상|확인해야 할 지표|봐야 하는 이유)/.test(`${value ?? ''}`);
}

function hasFinishedCardCopy(value) {
  const text = `${value ?? ''}`.trim();
  if (text.length < 24) return false;
  if (/핵심 내용을 입력|카드 \d+ 제목|확인할 지표/.test(text)) return false;
  return true;
}

function isBadCardCopy(value) {
  return /(Search SERP|Naver|Google|Brave|SERP|네이트판|출처명|수집 채널|불안이나 욕망|욕망에 가까워|반복된 말|단순 화제보다 반응의 방향|저장 목록에 올라왔어요|원문 맥락|사람들의 반응이 붙었어요|라는 원문|v\.\s*daum|daum\.\s*net|믿을 수 있는 성분으로 최고|다양한 소비자 후기|K뷰티의 미래|카드뉴스 문구)/i.test(`${value ?? ''}`);
}

function trendFinishedBody(role, topic, title, fact) {
  const intent = classifyContentIntent({ label: topic, keyword: topic, evidence: [{ title: fact }], sampleTitles: [title] });
  if (intent.id === 'parent_social_issue') return parentSocialTrendBody(role, topic, fact);
  if (intent.id === 'parent_safety_issue') return parentSafetyTrendBody(role, topic, fact);
  const productLike = isProductTopic(`${topic} ${title} ${fact}`);
  if (productLike) return productTrendBody(role, topic, fact);
  return ({
    cover: `${topic}이 갑자기 보이기 시작했어요.\n이건 단순 유행보다 반응의 방향이 더 중요해요.`,
    why_now: `지금 눈여겨볼 건 속도예요.\n${fact}에서 반응이 먼저 움직였어요.`,
    community_signal: `댓글은 제품보다 이유에 몰렸어요.\n사람들이 궁금해한 건 “왜 갑자기 떴나”였어요.`,
    comparison: `혼자 보면 그냥 화제예요.\n가격, 세대, 국가를 나란히 놓으면 진짜 포인트가 보여요.`,
    data_scene: `${fact}\n숫자는 하나만 크게 잡아도 흐름이 선명해져요.`,
    misconception: `많이 보인다고 바로 대세는 아니에요.\n시점과 출처가 같이 있어야 과장이 줄어요.`,
    content_angle: `이 주제는 뉴스보다 저장형 정보에 가까워요.\n“나한테 뭐가 달라지나”로 바꾸면 힘이 생겨요.`,
    checklist: `반응이 반복됐나\n비교 기준이 있나\n숫자로 확인되나`,
    closing: `다음 이슈도 이 기준으로 보면 돼요.\n반응, 비교, 숫자만 남겨두세요.`
  })[role] ?? `${title}에서 중요한 건 맥락이에요.\n${topic}은 반응과 비교 기준이 같이 움직여요.`;
}

function parentSocialTrendBody(role, topic, fact) {
  const topicSubject = withSubjectJosa(topic);
  return ({
    cover: `${topicSubject} 부모에게 바로 닿는 문제예요.\n괜찮다/안 된다보다 기준이 먼저 필요해요.`,
    why_now: `지금 반응이 붙은 이유는 현실감이에요.\n${shortFact(fact)}처럼 등원과 돌봄의 빈틈이 같이 보였어요.`,
    community_signal: `아이는 콧물이 나고, 출근 시간은 다가와요.\n기관 기준과 회사 눈치 사이에서 부모가 먼저 멈춰요.`,
    comparison: `맞벌이, 전업, 어린이집 기준을 따로 봐야 해요.\n같은 등원 문제도 상황에 따라 답이 달라져요.`,
    data_scene: `확인된 수치가 없다면 사례를 숫자처럼 쓰면 안 돼요.\n반복된 등원 고민을 대표 신호로만 봐야 해요.`,
    misconception: `부모 탓으로 몰면 콘텐츠가 약해져요.\n제도, 회사, 아이 컨디션을 함께 봐야 해요.`,
    content_angle: `이 주제는 사건보다 “부모가 실제로 막히는 순간”이 핵심이에요.\n그 순간을 제목으로 잡아야 저장돼요.`,
    checklist: `우리 집 상황과 맞나\n기관 기준이 있나\n아이 컨디션을 봤나`,
    closing: `저장할 기준은 단정이 아니에요.\n상황, 기관 기준, 아이 컨디션을 나눠보는 거예요.`
  })[role] ?? `${topic}은 부모 현실과 기관 기준을 같이 봐야 해요.\n한쪽 탓으로 단정하면 중요한 맥락이 사라져요.`;
}

function parentSafetyTrendBody(role, topic, fact) {
  return ({
    cover: `${topic}, 정말 괜찮을까요?\n부모가 먼저 봐야 할 건 불안보다 기준이에요.`,
    why_now: `반응이 붙은 이유는 안전 기준이에요.\n${shortFact(fact)}처럼 아이 물건은 작은 의심도 크게 번져요.`,
    community_signal: `댓글은 “살까 말까”보다\n“우리 아이한테 괜찮나”에 가까워요.`,
    comparison: `제품명보다 성분, 사용 시기, 대체품을 나눠봐야 해요.\n비교 축이 있어야 불안이 줄어요.`,
    data_scene: `확인된 수치가 없다면 논란을 숫자처럼 쓰면 안 돼요.\n성분, 인증, 사용 조건만 따로 확인해야 해요.`,
    misconception: `논란이 있다고 모두 위험한 건 아니에요.\n확인된 기준과 의심되는 부분을 분리해야 해요.`,
    content_angle: `이 주제는 공포보다 체크리스트가 좋아요.\n부모가 구매 전 확인할 기준으로 바꾸면 저장돼요.`,
    checklist: `성분 기준이 확인됐나\n사용 연령이 맞나\n대체품이 있나`,
    closing: `불안할수록 기준이 필요해요.\n성분, 연령, 대체품만 먼저 확인하세요.`
  })[role] ?? `${topic}은 제품 논란보다 부모가 확인할 기준이 중요해요.\n성분과 사용 조건을 나눠봐야 해요.`;
}

function productTrendBody(role, topic, fact) {
  const insightLine = productInsightLine(topic, fact);
  const checklist = productChecklist(topic, fact);
  return ({
    cover: `많이 보인다는 말만으로는 아쉬워요.\n사람들이 어디서 마음이 움직였는지 볼게요.`,
    why_now: `${insightLine}\n결국 손이 가는 건 내 상황에 맞는 이유가 보일 때예요.`,
    community_signal: `후기는 칭찬보다 필터에 가까워요.\n사용감, 자극감, 가격에서 마음이 갈려요.`,
    comparison: productComparisonBody(topic, fact),
    data_scene: `${productFactLine(fact)}\n숫자보다 먼저 볼 건 사람들이 비교한 기준이에요.`,
    misconception: `유행템이라고 다 내 장바구니템은 아니에요.\n광고 문구와 실제 기준은 따로 봐야 해요.`,
    content_angle: `이 주제는 “뭐가 떴나”보다\n“왜 장바구니에 들어갔나”로 풀 때 힘이 생겨요.`,
    checklist,
    closing: `저장할 포인트는 세 가지예요.\n구매 이유, 비교 기준, 다시 살 이유만 남겨도 충분해요.`
  })[role] ?? `${topic}은 유행보다 구매 이유가 중요해요.\n내 생활에 들어올 이유가 보일 때 저장돼요.`;
}

function manualFinishedBody(role, topic, title, fact) {
  return ({
    cover: `${topic}은 어렵게 시작하지 않아도 돼요.\n오늘 바로 써먹을 기준만 남겨볼게요.`,
    why_now: `지금 필요한 건 많은 정보가 아니에요.\n헷갈리는 순서를 줄이는 기준이에요.`,
    comparison: `좋은 방법과 헷갈리는 방법을 나란히 두면\n선택이 훨씬 빨라져요.`,
    data_scene: `시간, 횟수, 비용 중 하나만 잡아도\n실천 기준이 훨씬 선명해져요.`,
    misconception: `처음부터 완벽하게 하려 하면 오래 못 가요.\n작게 반복되는 기준이 더 오래 남아요.`,
    content_angle: `${title}은 정보보다 적용 순서가 중요해요.\n읽고 바로 따라 할 수 있어야 저장돼요.`,
    checklist: `오늘 바로 할 수 있나\n주의점이 분명한가\n다시 볼 이유가 있나`,
    closing: `${topic}은 저장해두고 다시 볼 때 힘이 생겨요.\n필요한 순간에 기준만 꺼내면 돼요.`
  })[role] ?? `${topic}에서 중요한 건 실행 순서예요.\n복잡한 설명보다 바로 쓸 기준을 남겨두세요.`;
}

function cleanShort(value) {
  return `${value ?? ''}`
    .replace(/\s+/g, ' ')
    .replace(/\bhttps?:\/\/\S+|\bwww\.\S+/gi, '')
    .replace(/\bv\.\s*daum\.\s*net\b/gi, '')
    .replace(/\b(?:m|news|v)\.\s*(?:daum|naver)\.\s*(?:net|com)\b/gi, '')
    .replace(/\b(Search SERP|Naver News|Naver Blog|Google News|Brave Search|SERP)\b/gi, '')
    .replace(/네이트판|더쿠|인스티즈|FMKOREA|에펨코리아/g, '')
    .replace(/["“”]/g, '')
    .trim()
    .slice(0, 80);
}

function shortFact(value) {
  const text = cleanShort(value);
  if (!text) return '반복 언급';
  return text.length > 42 ? `${text.slice(0, 42).trim()}...` : text;
}

function splitReadableLines(line, limit) {
  const text = `${line ?? ''}`.replace(/\s+/g, ' ').trim();
  if (!text) return [];
  if (text.length <= limit) return [text];
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]?/g)?.map((item) => item.trim()).filter(Boolean) ?? [text];
  const lines = [];
  let current = '';
  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length <= limit) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = sentence;
    }
  }
  if (current) lines.push(current);
  return lines.flatMap((item) => item.length <= limit + 10 ? [item] : splitByWords(item, limit));
}

function splitByWords(text, limit) {
  const words = `${text ?? ''}`.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [text];
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= limit) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
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
  const shortLabel = `${primaryTopic(input) ?? ''}`.replace(/\s+/g, ' ').trim();
  if (shortLabel && shortLabel.length <= limit && text.includes(shortLabel)) return shortLabel;
  return text.slice(0, limit).trim();
}

function isGenericTitle(value) {
  return /^(영향|분석|정리|전망|핵심|포인트|콘텐츠|카드|주제)\s*\d*$/.test(value) || value.length < 2;
}

function isInstructionalTitle(value) {
  return /(해야|확인|작성|구성|보여줘|넣어|비교해야|만들기)/.test(`${value ?? ''}`);
}

function hasCoverHookTitle(value) {
  return /왜|진짜|정말|괜찮|보내면|사도|써도|믿기|착시|비교|놓쳐|달라|반전|한 줄|이게|요즘|갑자기|모르면|전에/.test(`${value ?? ''}`);
}

function defaultTitleForRole(input, role, index, intent = classifyContentIntent(input)) {
  const label = primaryTopic(input);
  if (intent?.id === 'parent_social_issue') {
    return {
      cover: parentQuestionTitle(input, '정말 괜찮을까'),
      why_now: '왜 지금 부모들이 반응할까',
      community_signal: '부모들이 막힌 지점',
      comparison: '상황마다 답이 달라요',
      data_scene: '숫자보다 먼저 볼 것',
      misconception: '부모 탓으로 끝내면 안 돼요',
      content_angle: '내 얘기가 되는 순간',
      checklist: '등원 전 체크 3개',
      closing: '저장 기준'
    }[role] ?? compactTitle(label, input, 18);
  }
  if (intent?.id === 'parent_safety_issue') {
    return {
      cover: parentQuestionTitle(input, '정말 괜찮을까'),
      why_now: '왜 갑자기 불안해졌을까',
      community_signal: '부모들이 물은 것',
      comparison: '성분부터 나눠봐요',
      data_scene: '확인된 기준만 보기',
      misconception: '논란과 위험은 달라요',
      content_angle: '공포보다 체크리스트',
      checklist: '구매 전 체크 3개',
      closing: '저장 기준'
    }[role] ?? compactTitle(label, input, 18);
  }
  if (intent?.id === 'consumer_product_marketing') {
    return {
      cover: '왜 이걸 사갈까',
      why_now: '왜 지금 팔릴까',
      community_signal: '사람들이 저장한 이유',
      comparison: '예쁜 것보다 쓸모',
      data_scene: '반응이 붙은 이유',
      misconception: '사지 말아야 할 때',
      content_angle: '장바구니에 들어간 순간',
      checklist: '구매 전 체크 3개',
      closing: '저장 기준'
    }[role] ?? compactTitle(label, input, 18);
  }
  return {
    cover: '이게 왜 떴을까',
    why_now: '왜 지금일까',
    community_signal: '댓글이 말한 것',
    comparison: '혼자 보면 착시',
    data_scene: '숫자는 하나면 돼요',
    misconception: '오해하면 망해요',
    content_angle: '내 얘기로 바뀌는 순간',
    checklist: '확인할 기준 3개',
    closing: '저장 기준'
  }[role] ?? compactTitle(label, input, 16) ?? `카드 ${index + 1}`;
}

function strengthenCard(card, input, index) {
  if (hasConcreteBody(card.body)) return card;
  const topic = primaryTopic(input);
  const intent = classifyContentIntent(input);
  const evidence = getEvidence(input, intent);
  const fact = evidence[index] ?? evidence[0] ?? topic;
  const title = cleanShort(card.title || defaultTitleForRole(input, card.role, index, intent));
  const roleBody = trendFinishedBody(card.role, topic, title, fact);
  if (card.role === 'checklist' || card.role === 'closing') {
    return { ...card, body: roleBody };
  }
  const body = roleBody || [
    sentenceFromEvidence(fact, input),
    card.insight || `${topic}에서 확인할 건 사건 요약보다 비교 기준이에요.`,
    card.action || '비교 기준, 적용 대상, 숫자 하나가 저장 포인트예요.'
  ].filter(Boolean).join('\n');
  return { ...card, body: normalizeCardBody(body, card.role), dataPoint: card.dataPoint || fact };
}

function hasConcreteBody(value) {
  const text = `${value ?? ''}`;
  if (isInstructionalBody(text) || isBadCardCopy(text)) return false;
  const hasEvidenceWord = /댓글|조회|추천|비중|지수|영업이익|가격|비교|확인|체크|검색|보도|수치|커뮤니티|반응|성분|효능|리뷰|사용감|구매 기준|재구매|장바구니|용도|\d/.test(text);
  const hasAction = /봐야|확인|비교|나눠|저장|체크|주의|분리|적용|담아|보여|갈려|빼야/.test(text);
  return text.length >= 45 && hasEvidenceWord && hasAction;
}

function isWeakPlan(cards, input) {
  const text = cards.map((card) => `${card.title} ${card.body}`).join(' ');
  const generic = /중심으로 배경|추가 검색|신뢰도가 높아집니다|중요합니다|주목받고 있습니다|알아보겠습니다|다음과 같습니다|종합하면|핵심입니다|살펴보겠습니다|영향을 미칩니다|필수적입니다|가능성이 있습니다/;
  const hasGenericCopy = generic.test(text);
  const hasEvidence = /\d|%|조|억|만|증가|감소|전망|비교|확대|개편/.test(text);
  const concreteCount = cards.filter((card) => hasConcreteBody(card.body)).length;
  const structuredCount = cards.filter((card) => card.dataPoint || card.sourceLine || card.insight || card.action || card.visualItems?.length).length;
  const explicitRoleCount = cards.filter((card) => card._hadExplicitRole).length;
  if (explicitRoleCount >= Math.ceil(cards.length * 0.8) && hasEvidence && !hasGenericCopy) return false;
  if (!explicitRoleCount && cards.length >= 7 && structuredCount >= Math.ceil(cards.length * 0.7) && hasEvidence) return false;
  if (cards.length >= 8 && hasEvidence && cards.some((card) => card.dataPoint || card.insight || card.action)) return false;
  if (cards.length >= 8 && hasEvidence && concreteCount >= Math.min(5, cards.length)) return false;
  return hasGenericCopy || !hasEvidence || concreteCount < Math.min(3, cards.length) || cards.every((card) => !card.dataPoint && !card.insight && !card.action);
}

function hasIntentMismatch(cards, input, intent = classifyContentIntent(input)) {
  const text = cards.map((card) => `${card.title} ${card.body} ${card.dataPoint} ${card.sourceLine}`).join(' ');
  if (intent.id === 'parent_safety_issue') {
    return hasParentSocialTerms(text) || cards.some((card) => card.role === 'checklist' && !/성분|연령|월령|대체품|소재|인증/.test(`${card.title} ${card.body}`));
  }
  if (intent.id === 'parent_social_issue') {
    return /환경호르몬|유해성분|소재|인증|대체품/.test(text) && !hasParentSocialTerms(text);
  }
  return false;
}

function enforceIntentCard(card, input, intent = classifyContentIntent(input), index = 0) {
  if (intent.id !== 'parent_safety_issue' && intent.id !== 'parent_social_issue') return card;
  const fallback = evidenceBackedCards(input)[index];
  const text = `${card.title} ${card.body} ${card.dataPoint} ${card.sourceLine}`;
  const mismatched = intent.id === 'parent_safety_issue'
    ? hasParentSocialTerms(text) || (card.role === 'checklist' && !/성분|연령|월령|대체품|소재|인증/.test(text))
    : /환경호르몬|유해성분|소재|인증|대체품/.test(text) && !hasParentSocialTerms(text);
  if (!mismatched) {
    return {
      ...card,
      sourceLine: isEvidenceRelevant(card.sourceLine, intent, input) ? card.sourceLine : fallback?.sourceLine ?? '',
      dataPoint: isEvidenceRelevant(card.dataPoint, intent, input) ? card.dataPoint : fallback?.dataPoint ?? ''
    };
  }
  return fallback ? { ...fallback, page: card.page ?? index + 1 } : card;
}

function evidenceBackedCards(input) {
  const label = primaryTopic(input);
  const intent = classifyContentIntent(input);
  const evidence = getEvidence(input, intent);
  const fact = evidence.find((item) => /\d|%/.test(item))
    ?? evidence.find((item) => /조|억|만|전망|확대|개편/.test(item))
    ?? evidence[0]
    ?? `${label} 관련 신호가 반복 수집됨`;
  if (intent.id === 'parent_social_issue') return parentSocialEvidenceCards(input, fact);
  if (intent.id === 'parent_safety_issue') return parentSafetyEvidenceCards(input, fact);
  if (intent.id === 'consumer_product_marketing' || intent.id === 'pet_consumer_product' || isProductTopic(`${label} ${fact}`)) return productEvidenceCards(input, fact);
  return [
    makeCard(1, '이게 왜 떴을까', fact, `${label}은 뉴스보다 반응이 먼저 잡혔어요.\n사람들이 눌러본 이유가 이 흐름의 시작이에요.`, 'cover', 'cover_text', '반응 먼저', input),
    makeCard(2, '사람들이 멈춘 이유', evidence[1] ?? fact, `${label}에서 먼저 보이는 건 반응의 방향이에요.\n사람들이 왜 저장했는지가 카드의 중심이에요.`, 'community_signal', 'quote_card', '커뮤니티 반응', input),
    makeCard(3, '혼자 보면 착시', evidence[2] ?? fact, `${label}만 보면 그냥 화제예요.\n가격, 세대, 국가를 나란히 놓을 때\n진짜 차이가 드러나요.`, 'comparison', 'comparison_board', '비교 프레임', input),
    makeCard(4, '숫자 하나만', fact, `조회수, 가격, 성장률, 검색량 중\n하나만 커져도 흐름이 달라 보여요.\n대표 지표가 카드의 중심이에요.`, 'data_scene', 'data_chart', '대표 지표', input),
    makeCard(5, '오해 포인트', evidence[3] ?? fact, `커뮤니티 반응은 사실이 아니라 신호예요.\n시점과 비교 기준이 붙을 때\n자극보다 설득력이 생겨요.`, 'misconception', 'quote_card', '과장 방지', input),
    makeCard(6, '내 얘기로 바뀌는 순간', label, `이 주제는 “무슨 일이냐”보다\n“나한테 어떤 변화냐”에서 힘이 생겨요.\n그 지점이 저장되는 이유예요.`, 'content_angle', 'handwritten_research', '내 이야기화', input),
    makeCard(7, '확인할 기준 3개', label, `반응이 반복됐나\n비교할 대상이 있나\n숫자로 설명되나`, 'checklist', 'checklist', '확인 기준', input)
  ];
}

function parentSocialEvidenceCards(input, fact) {
  const label = primaryTopic(input) ?? '어린이집 등원 이슈';
  const labelSubject = withSubjectJosa(label);
  const questionTitle = parentQuestionTitle(input, '정말 괜찮을까');
  return [
    makeCard(1, questionTitle, fact, `${labelSubject} 부모에게 바로 닿는 문제예요.\n괜찮다/안 된다보다 기준이 먼저 필요해요.`, 'cover', 'cover_photo', '부모 현실', input),
    makeCard(2, '부모들이 막힌 순간', fact, `아이는 콧물이 나고, 출근 시간은 다가와요.\n기관 기준과 회사 눈치 사이에서 부모가 먼저 멈춰요.`, 'community_signal', 'quote_card', '현실 압박', input),
    makeCard(3, '왜 지금 반응할까', fact, `지금 반응이 붙은 이유는 현실감이에요.\n등원 시간, 아이 컨디션, 회사 눈치가 한 번에 겹쳐요.`, 'why_now', 'handwritten_research', '지금 보는 이유', input),
    makeCard(4, '상황마다 답이 달라요', fact, `맞벌이, 전업, 첫돌 전후, 감기 증상을 나눠봐야 해요.\n같은 등원 문제도 집마다 기준이 달라져요.`, 'comparison', 'comparison_board', '비교 축', input),
    makeCard(5, '숫자보다 먼저 볼 것', fact, `확인된 수치가 없다면 사례를 숫자처럼 쓰면 안 돼요.\n반복된 등원 고민을 대표 신호로만 봐야 해요.`, 'data_scene', 'data_chart', '대표 신호', input),
    makeCard(6, '부모 탓으로 끝내면 안 돼요', fact, `이 이슈는 개인 선택만의 문제가 아니에요.\n제도, 회사, 아이 컨디션을 함께 봐야 해요.`, 'misconception', 'quote_card', '과장 방지', input),
    makeCard(7, '등원 전 체크 3개', label, `우리 집 상황과 맞나\n기관 기준이 있나\n아이 컨디션을 봤나`, 'checklist', 'checklist', '등원 판단 기준', input)
  ];
}

function parentSafetyEvidenceCards(input, fact) {
  const label = parentProductSubject(input);
  const labelSubject = withSubjectJosa(label);
  const questionTitle = parentQuestionTitle(input, '정말 괜찮을까');
  return [
    makeCard(1, questionTitle, fact, `${labelSubject} 부모가 먼저 멈추는 주제예요.\n불안보다 확인 기준이 먼저 필요해요.`, 'cover', 'cover_photo', '안전 기준', input),
    makeCard(2, '부모들이 물은 것', fact, `반응은 “유행템이냐”가 아니에요.\n“우리 아이한테 괜찮나”에 가까워요.`, 'community_signal', 'quote_card', '부모 질문', input),
    makeCard(3, '왜 갑자기 불안해졌을까', fact, `아이 몸에 닿는 제품은 작은 의심도 크게 번져요.\n그래서 성분과 사용 조건이 먼저 보여야 해요.`, 'why_now', 'handwritten_research', '지금 보는 이유', input),
    makeCard(4, '성분부터 나눠봐요', fact, `제품명보다 성분, 사용 연령, 대체품을 나눠봐야 해요.\n비교 축이 있어야 불안이 줄어요.`, 'comparison', 'comparison_board', '비교 축', input),
    makeCard(5, '확인된 기준만 보기', fact, `확인된 수치가 없다면 논란을 숫자처럼 쓰면 안 돼요.\n성분, 인증, 사용 조건만 따로 확인해야 해요.`, 'data_scene', 'data_chart', '확인 기준', input),
    makeCard(6, '논란과 위험은 달라요', fact, `논란이 있다고 모두 위험한 건 아니에요.\n확인된 기준과 의심되는 부분을 분리해야 해요.`, 'misconception', 'quote_card', '과장 방지', input),
    makeCard(7, '구매 전 체크 3개', label, `성분 기준이 확인됐나\n사용 연령이 맞나\n대체품이 있나`, 'checklist', 'checklist', '구매 판단 기준', input)
  ];
}

function productEvidenceCards(input, fact) {
  const label = primaryTopic(input) ?? '쇼핑 추천템';
  const labelSubject = withSubjectJosa(label);
  const factLine = productFactLine(fact);
  const checklist = productChecklist(label, fact);
  return [
    makeCard(1, '왜 이걸 사갈까', fact, `${labelSubject} 유행보다 구매 기준이 먼저 보여요.\n살 이유가 분명할수록 저장돼요.`, 'cover', 'cover_text', '살 이유', input),
    makeCard(2, '사람들이 저장한 이유', fact, `후기는 칭찬보다 필터 역할을 해요.\n성분, 사용감, 가격에서 망설이는 지점이 먼저 보여야 해요.`, 'community_signal', 'quote_card', '구매 이유', input),
    makeCard(3, '예쁜 것보다 기준', fact, productComparisonBody(label, fact), 'comparison', 'comparison_board', '비교 기준', input),
    makeCard(4, '반응이 붙은 이유', fact, `${factLine}\n숫자보다 먼저 볼 건 구매 이유와 비교 기준이에요.`, 'data_scene', 'data_chart', '반복 언급', input),
    makeCard(5, '사지 말아야 할 때', fact, `유행만 보고 고르면 금방 잊혀요.\n가격, 사용감, 재구매 이유가 흐리면 후보에서 빼야 해요.`, 'misconception', 'quote_card', '구매 기준', input),
    makeCard(6, '콘텐츠로 풀 포인트', label, `제품 소개보다 “왜 장바구니에 들어갔나”가 좋아요.\n구매 기준이 보여야 저장돼요.`, 'content_angle', 'handwritten_research', '장바구니 이유', input),
    makeCard(7, '사기 전 체크 3개', label, checklist, 'checklist', 'checklist', '구매 판단 기준', input)
  ];
}

function productFactLine(value) {
  const text = shortFact(value);
  if (/\d|댓글|조회|판매|품절|억|만|%/.test(text)) return text;
  if (isRawSourceTitle(text)) return '여러 결과에서 구매 이유와 비교 기준이 반복됐어요.';
  return '여러 결과에서 구매 이유와 비교 기준이 반복됐어요.';
}

function productInsightLine(topic, fact) {
  const text = `${topic ?? ''} ${fact ?? ''}`;
  if (isBeautyTopic(text) && /미국|美|아마존|Amazon|본토|수출|유통/.test(text)) {
    return '미국 소비자는 K뷰티를 브랜드명보다 성분, 효능, 리뷰로 고르는 쪽에 가까워요.';
  }
  if (isBeautyTopic(text)) {
    return '뷰티 제품은 예쁜 패키지보다 성분, 효능, 사용감에서 마음이 갈려요.';
  }
  if (/반려|강아지|고양이|펫/.test(text)) {
    return '반려동물 제품은 귀여움보다 안전, 사용 장면, 다시 살 이유가 먼저예요.';
  }
  if (/아마존|Amazon|미국|美/.test(text)) {
    return '해외 소비자는 낯선 브랜드일수록 가격, 리뷰, 쓰는 장면을 먼저 봐요.';
  }
  if (/\d|댓글|조회|판매|품절|억|만|%/.test(`${fact ?? ''}`) && !isRawSourceTitle(fact)) {
    return `${shortFact(fact)}에서 반복 신호가 잡혔어요.`;
  }
  return '반복 언급보다 중요한 건 사람들이 납득한 구매 이유예요.';
}

function productComparisonBody(topic, fact) {
  const text = `${topic ?? ''} ${fact ?? ''}`;
  if (isBeautyTopic(text)) {
    return `브랜드명만 보면 이유가 흐려져요.\n성분, 효능, 가격, 리뷰를 나눠봐야 선택 기준이 보여요.`;
  }
  if (/반려|강아지|고양이|펫/.test(text)) {
    return `귀여운 사진만 보면 판단이 흔들려요.\n안전성, 사용 빈도, 관리 난이도까지 같이 봐야 해요.`;
  }
  return `예쁜 사진만 보면 이유가 흐려져요.\n가격, 용도, 다시 살 이유를 나눠봐야 해요.`;
}

function productChecklist(topic, fact) {
  const text = `${topic ?? ''} ${fact ?? ''}`;
  if (isBeautyTopic(text)) return `성분이 바로 보이나\n효능이 과하지 않나\n리뷰와 가격이 납득되나`;
  if (/반려|강아지|고양이|펫/.test(text)) return `안전 기준이 보이나\n매일 쓰는 장면이 있나\n관리하기 편한가`;
  return `살 이유가 분명한가\n가격이 납득되나\n다시 사고 싶은가`;
}

function isBeautyTopic(value) {
  return /K뷰티|뷰티|화장품|스킨케어|세럼|선케어|선크림|토너|크림|성분|피부|효능|사용감|올리브영/.test(`${value ?? ''}`);
}

function isRawSourceTitle(value) {
  return /\[.*기자.*\]|기자의 눈|일보|신문|뉴스|보도|헤럴드|중앙일보|동아|조선|한국경제|매일경제|연합뉴스|뉴시스|daum|naver|https?:\/\/|www\.|\.com|\.net|美 본토|상륙|수출|유통 주도권/.test(`${value ?? ''}`);
}

function withSubjectJosa(value) {
  const text = cleanShort(value || '이 주제');
  return `${text}${hasFinalConsonant(text) ? '은' : '는'}`;
}

function hasFinalConsonant(value) {
  const char = `${value ?? ''}`.trim().at(-1);
  if (!char) return false;
  const code = char.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 > 0;
}

function isProductTopic(value) {
  return /쇼핑|추천템|생활|상품|제품|브랜드|아마존|틱톡|품절|구매|소비|템|장바구니|편의점|육아템|펫|용품|K뷰티|뷰티|화장품|스킨케어|세럼|선케어|사용감|재구매/.test(`${value ?? ''}`);
}

function classifyContentIntent(input = {}) {
  const coverTitle = cleanManualText(input.selectedHookTitle);
  const text = coverTitle || collectIntentText(input);
  const parenting = /육아|부모|엄마|아빠|맘|워킹맘|아이|아기|신생아|유아|어린이|어린이집|유치원|등원|하원|돌봄|첫돌|소아|키즈/.test(text);
  const safety = /환경호르몬|유해|성분|안전|독성|검출|리콜|욕조|젖병|기저귀|카시트|유모차|아기용품/.test(text);
  const social = /등원|하원|어린이집|유치원|돌봄|지원|급여|제도|정부|기업|명단|워킹맘|일·가정|양립|감기|아픈|맘충|첫돌|출근|육아휴직/.test(text);
  const product = isProductTopic(text) || /장난감|간식|자동|급식기|텀블러|브랜드|아마존|틱톡|라이브커머스|품절|매출|판매|구매|장바구니|화장품|스킨케어|세럼|선케어/.test(text);
  const pet = /반려|강아지|고양이|펫|집사|산책|사료|간식|동물병원/.test(text);
  if (parenting && safety) {
    return {
      id: 'parent_safety_issue',
      audience: '아이 제품을 살 때 안전 기준을 먼저 확인하려는 부모',
      angle: '부모가 불안해하는 제품 안전 이슈를 성분, 사용 조건, 대체 기준으로 풀어내는 카드뉴스',
      titlePattern: '“아기 욕조 유해성분 괜찮을까?”처럼 부모가 실제로 묻는 질문형',
      rule: '부모 안전 이슈로 쓴다. 공포 조장 금지, 성분/사용 연령/대체품 기준을 먼저 제시한다.'
    };
  }
  if (parenting && social) {
    return {
      id: 'parent_social_issue',
      audience: '육아 현실을 실용적으로 이해하고 저장해두려는 부모',
      angle: '어린이집, 등원, 돌봄처럼 부모가 실제로 겪는 문제를 공감과 기준으로 풀어내는 카드뉴스',
      titlePattern: '“첫돌 전 어린이집 정말 괜찮을까?”, “감기 걸리면 어린이집 보내면 안 될까?” 같은 현실 질문형',
      rule: '사회 이슈+부모 공감형으로 쓴다. 부모 탓 단정 금지, 제도/회사/아이 컨디션을 함께 나눈다.'
    };
  }
  if (pet && product) {
    return {
      id: 'pet_consumer_product',
      audience: '반려동물 소비 기준을 저장해두려는 반려인',
      angle: '반려동물 제품을 감정 소비와 실제 사용 기준으로 풀어내는 카드뉴스',
      titlePattern: '“왜 이 장난감이 뜰까?”처럼 반려인이 구매 전에 묻는 질문형',
      rule: '반려동물 소비형으로 쓴다. 귀여움보다 안전, 사용 장면, 재구매 이유를 먼저 보여준다.'
    };
  }
  if (product) {
    return {
      id: 'consumer_product_marketing',
      audience: '새로운 제품과 브랜드를 실용적으로 저장해두려는 소비자',
      angle: '제품 유행을 구매 이유, 사용 장면, 비교 기준으로 풀어내는 카드뉴스',
      titlePattern: '“왜 이걸 사갈까?”, “이 제품 살 이유가 있을까?” 같은 구매 질문형',
      rule: '마케팅+소비 상품형으로 쓴다. 뉴스 요약보다 살 이유, 안 살 이유, 비교 기준을 제시한다.'
    };
  }
  return {
    id: 'general_trend_context',
    audience: '트렌드를 실용적으로 이해하고 저장해두려는 20대 후반 여성',
    angle: '트렌드의 배경과 근거, 비교 기준, 저장 포인트를 쉽게 풀어내는 카드뉴스',
    titlePattern: '“왜 지금 뜰까?”처럼 변화의 이유를 묻는 질문형',
    rule: '뉴스 요약 금지. 독자가 저장할 이유, 비교 기준, 실행 기준으로 바꾼다.'
  };
}

function collectIntentText(input = {}) {
  const title = cleanManualText(input.selectedHookTitle);
  if (title) return title;
  return [
    input.label,
    input.keyword,
    input.category,
    input.summary,
    input.production?.suggestedAngle,
    input.validation?.contentType,
    input.aiAnalysis?.summary,
    ...(input.sampleTitles ?? []),
    ...getEvidence(input)
  ].filter(Boolean).join(' ');
}

function normalizeHookTitles(value, input, intent = classifyContentIntent(input)) {
  const fallback = titleCandidatesForIntent(input, intent);
  const fromAi = ensureList(value, fallback)
    .map((title) => compactTitle(title, input, 22))
    .filter((title) => title && !isInstructionalTitle(title) && !isGenericTitle(title));
  return [...new Set([...fallback, ...fromAi])].slice(0, 5);
}

function titleCandidatesForIntent(input, intent = classifyContentIntent(input)) {
  const label = cleanShort(primaryTopic(input) ?? '이 주제');
  if (intent.id === 'parent_social_issue') {
    const title = parentQuestionTitle(input, '정말 괜찮을까');
    return [
      title,
      inferParentSymptomQuestion(input),
      '부모 탓으로 끝내면 안 돼요',
      `${label} 기준부터 볼게요`
    ].map((item) => compactTitle(item, input, 22)).filter(Boolean);
  }
  if (intent.id === 'parent_safety_issue') {
    const title = parentQuestionTitle(input, '정말 괜찮을까');
    return [
      title,
      `${parentProductSubject(input)} 유해성분 괜찮을까`,
      `${parentProductSubject(input)} 사도 될까`,
      '불안보다 기준부터 볼게요'
    ].map((item) => compactTitle(item, input, 22)).filter(Boolean);
  }
  if (intent.id === 'consumer_product_marketing' || intent.id === 'pet_consumer_product') {
    return ['왜 이걸 사갈까', '예쁜 것보다 쓸모', '살 이유가 있을까', `${label} 살 이유`]
      .map((item) => compactTitle(item, input, 22))
      .filter(Boolean);
  }
  return ['이게 왜 떴을까', '혼자 보면 착시', '사람들이 멈춘 이유', `${label} 지금 볼 이유`]
    .map((item) => compactTitle(item, input, 22))
    .filter(Boolean);
}

function parentQuestionTitle(input, suffix) {
  const text = collectIntentText(input);
  if (/감기|아픈|열나|기침/.test(text)) return '감기 걸리면 어린이집 보내면 안 될까';
  if (/첫돌|돌 전|돌전|0세|영아/.test(text)) return '첫돌 전 어린이집 정말 괜찮을까';
  if (/등원|하원|어린이집|유치원/.test(text)) return `어린이집 등원, ${suffix}`;
  if (/환경호르몬|유해|성분|욕조/.test(text)) return `${parentProductSubject(input)} ${suffix}`;
  const label = cleanShort(primaryTopic(input) ?? '이 문제');
  return `${label} ${suffix}`;
}

function inferParentSymptomQuestion(input) {
  const text = collectIntentText(input);
  if (/감기|아픈|열나|기침/.test(text)) return '감기 걸리면 어린이집 보내면 안 될까';
  if (/첫돌|돌 전|돌전|0세|영아/.test(text)) return '첫돌 전 어린이집 정말 괜찮을까';
  return '어린이집 등원 기준, 어디까지 괜찮을까';
}

function parentProductSubject(input) {
  const text = collectIntentText(input);
  if (/욕조/.test(text)) return '아기 욕조';
  if (/장난감/.test(text)) return '아이 장난감';
  if (/젖병/.test(text)) return '젖병';
  if (/기저귀/.test(text)) return '기저귀';
  const label = cleanShort(primaryTopic(input) ?? '아기 제품');
  return label.length > 12 ? '아기 제품' : label;
}

function primaryTopic(input = {}) {
  return cleanManualText(input.selectedHookTitle)
    || cleanManualText(input.label ?? input.keyword)
    || '이 주제';
}

function makeCard(page, title, dataPoint, body, role, layout, emphasis, contextInput = {}) {
  const input = { label: title, sources: [], ...contextInput };
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
    visualPrompt: normalizeVisualPrompt('', input, role, layout, title, body, dataPoint, classifyContentIntent({ label: title, keyword: `${title} ${body} ${dataPoint}` })),
    visualItems: normalizeVisualItems([], input, role, { body, dataPoint }),
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
    .map((line) => line
      .replace(/^\s*(근거|해석|실행|데이터|출처)\s*[:：]\s*/g, '')
      .replace(/\b(Search SERP|Naver News|Naver Blog|Google News|Brave Search|SERP)\b/gi, '')
      .replace(/네이트판|더쿠|인스티즈|FMKOREA|에펨코리아/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim())
    .filter(Boolean)
    .join('\n');
}

function sentenceFromEvidence(fact, input) {
  const cleanFact = `${fact ?? ''}`.replace(/^\s*(근거|해석|실행|데이터|출처)\s*[:：]\s*/g, '').trim();
  const topic = primaryTopic(input);
  const intent = classifyContentIntent(input);
  if (!cleanFact) return `${topic}은 지금 확인할 기준이 먼저 필요한 주제예요.`;
  if (intent.id === 'consumer_product_marketing' || intent.id === 'pet_consumer_product' || isProductTopic(`${topic} ${cleanFact}`)) {
    return productInsightLine(topic, cleanFact);
  }
  if (isRawSourceTitle(cleanFact)) return `${topic}은 기사 제목보다 독자가 적용할 기준이 더 중요해요.`;
  if (/\d|댓글|조회|추천|HOT|실베|베스트/.test(cleanFact)) return `${cleanFact}에서 반복 신호가 먼저 잡혔어요.`;
  return `${topic}에서 확인할 건 사건 요약보다 비교 기준이에요.`;
}

function getEvidence(input, intent = null) {
  const verified = input.searchVerification?.verification?.keyFindings ?? input.searchVerification?.keyFindings ?? [];
  const evidenceItems = (input.evidence ?? []).map(formatEvidenceItem);
  const dataPoints = ensureList(input.aiAnalysis?.dataPoints, []);
  const items = [...verified, ...dataPoints, ...(input.sampleTitles ?? []), ...evidenceItems].filter(Boolean);
  if (cleanManualText(input.selectedHookTitle)) {
    const selectedRelevant = items.filter((item) => isEvidenceRelevantToSelectedTitle(item, input, intent));
    if (selectedRelevant.length) return selectedRelevant.slice(0, 8);
    return fallbackEvidenceForIntent(intent, input).slice(0, 8);
  }
  if (!intent) return items.slice(0, 8);
  return filterEvidenceForIntent(items, intent, input).slice(0, 8);
}

function filterEvidenceForIntent(items, intent, input = {}) {
  if (!['parent_safety_issue', 'parent_social_issue'].includes(intent?.id)) return items;
  const relevant = items.filter((item) => isEvidenceRelevant(item, intent, input));
  if (relevant.length) return relevant;
  return fallbackEvidenceForIntent(intent, input);
}

function fallbackEvidenceForIntent(intent, input = {}) {
  if (intent?.id === 'parent_safety_issue') {
    return [`${parentProductSubject(input)} 소재·사용 조건·대체 기준 확인 필요`];
  }
  if (intent?.id === 'parent_social_issue') {
    return [`${primaryTopic(input) ?? '어린이집 등원 이슈'} 관련 부모 현실과 기관 기준 확인 필요`];
  }
  if (intent?.id === 'consumer_product_marketing' || intent?.id === 'pet_consumer_product') {
    return [`${primaryTopic(input)} 관련 구매 이유·사용 장면·비교 기준 확인 필요`];
  }
  return [`${primaryTopic(input)} 관련 신호 확인 필요`];
}

function isEvidenceRelevantToSelectedTitle(value, input = {}, intent = null) {
  const text = `${value ?? ''}`;
  if (!text.trim()) return false;
  if (['parent_safety_issue', 'parent_social_issue'].includes(intent?.id) && isEvidenceRelevant(text, intent, input)) return true;
  const keywords = primaryTopicKeywords(input);
  if (!keywords.length) return false;
  return keywords.some((keyword) => text.includes(keyword));
}

function primaryTopicKeywords(input = {}) {
  return cleanManualText(input.selectedHookTitle)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2)
    .filter((word) => !/^(미국|일본|중국|한국|아이|아기|왜|정말|괜찮을까|팔릴까|사도|될까|유해성분|기준)$/.test(word));
}

function isEvidenceRelevant(value, intent, input = {}) {
  const text = `${value ?? ''}`;
  if (!text.trim()) return false;
  if (intent?.id === 'parent_safety_issue') {
    return hasParentSafetyTerms(text) || hasParentSafetyTerms(`${input.label ?? ''} ${input.keyword ?? ''} ${input.selectedHookTitle ?? ''}`) && !hasParentSocialTerms(text);
  }
  if (intent?.id === 'parent_social_issue') {
    return hasParentSocialTerms(text) || hasParentSocialTerms(`${input.label ?? ''} ${input.keyword ?? ''} ${input.selectedHookTitle ?? ''}`) && !hasParentSafetyTerms(text);
  }
  return true;
}

function filterSourceNotes(items, intent, input = {}) {
  const filtered = filterEvidenceForIntent((items ?? []).filter(Boolean), intent, input);
  return filtered.slice(0, 5);
}

function hasParentSafetyTerms(value) {
  return /환경호르몬|유해|성분|안전|독성|검출|리콜|욕조|젖병|기저귀|장난감|카시트|유모차|아기용품|소재|인증|사용 연령|월령|대체품/.test(`${value ?? ''}`);
}

function hasParentSocialTerms(value) {
  return /등원|하원|어린이집|유치원|돌봄|지원|급여|제도|정부|기업|명단|워킹맘|일·가정|양립|감기|아픈|맘충|첫돌|출근|육아휴직|아침돌봄/.test(`${value ?? ''}`);
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
  const manual = normalizeManualBrief(input);
  const desiredCardCount = getDesiredCardCount(input);
  const label = manual?.topic ?? primaryTopic(input) ?? '사용자 입력 주제';
  const daycareShortage = isDaycareShortageTopic(`${label} ${manual?.prompt ?? input.summary ?? ''}`);
  const cards = fallbackCardsForCount(input, desiredCardCount);
  return {
    provider: 'fallback',
    generation: {
      source: 'fallback',
      provider: 'fallback',
      aiCardCount: 0,
      requestedCardCount: desiredCardCount,
      visualDataEnrichment: visualDataEnrichmentMeta(cards, input)
    },
    primaryTopic: label,
    selectedHookTitle: cleanManualText(input.selectedHookTitle),
    targetAudience: daycareShortage ? '어린이집 입소와 대기 문제를 겪는 부모' : '트렌드를 저장해두고 싶은 20대 후반 여성 독자',
    coreAngle: daycareShortage ? '어린이집 부족을 정원 문제가 아니라 위치, 시간, 신뢰 조건이 어긋나는 문제로 풀어냅니다.' : manual?.prompt || input.production?.suggestedAngle || input.summary || label,
    referenceStyle: chooseReferenceStyle(input),
    referencePattern: normalizeReferencePattern(undefined, chooseReferenceStyle(input)),
    carouselBlueprint: (daycareShortage ? daycareShortageBlueprint() : defaultBlueprint(input)).slice(0, desiredCardCount),
    hookTitles: daycareShortage ? ['왜 어린이집은 늘 부족할까?', '자리보다 조건이 문제예요', '입소 전 볼 기준 3개'] : [`${label}, 왜 지금 뜰까?`, `${label} 핵심 포인트 5가지`],
    captionFirstLine: normalizeCaptionFirstLine('', input),
    captionBody: normalizeCaptionBody('', input),
    captionCTA: normalizeCaptionCTA(''),
    hashtags: normalizeHashtags([], input),
    summary: daycareShortage ? '부모가 체감하는 어린이집 부족을 거리, 시간, 신뢰 조건으로 나눠 설명합니다.' : `${label}의 배경과 근거, 저장해둘 포인트를 쉽게 풀어봅니다.`,
    riskNotes: ['단일 근거 내용은 단정하지 마세요.'],
    sourceNotes: daycareShortage ? ['사용자 입력 기반 구조 설명'] : input.sampleTitles ?? [],
    cards
  };
}

function fallbackCardsForCount(input, desiredCardCount) {
  const cards = ensureCarouselCards(fallbackCards(input), input, desiredCardCount)
    .slice(0, desiredCardCount)
    .map((card, index) => ({ ...card, page: index + 1 }));
  if (cards.length) {
    const last = cards[cards.length - 1];
    cards[cards.length - 1] = {
      ...last,
      role: 'checklist',
      layout: 'checklist',
      visualType: 'checklist'
    };
  }
  return cards;
}

function normalizeCaptionFirstLine(value, input) {
  const topic = primaryTopic(input);
  const fallback = isDaycareShortageTopic(`${topic} ${input.summary ?? ''}`)
    ? '어린이집 부족, 정원만의 문제가 아니에요'
    : `${topic}, 그냥 넘기기 아까워요`;
  return cleanAiTone(`${value || fallback}`)
    .replace(/[#＃][^\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 35);
}

function normalizeCaptionBody(value, input) {
  const fallback = captionBodyFallback(input);
  const cleaned = cleanCardBody(cleanAiTone(value || fallback))
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 700);
  if (cleaned.length < 120 || isBadCaptionBody(cleaned)) return fallback.slice(0, 700);
  return cleaned;
}

function captionBodyFallback(input) {
  const topic = primaryTopic(input) ?? '이 주제';
  const topicSubject = withSubjectJosa(topic);
  const intent = classifyContentIntent(input);
  if (isDaycareShortageTopic(`${topic} ${input.summary ?? ''} ${input.manualBrief?.prompt ?? ''}`)) {
    return [
      '어린이집이 늘 부족하게 느껴지는 건 자리 수 하나로 설명하기 어려워요.',
      '부모가 찾는 자리는 가까워야 하고, 출근 시간과 맞아야 하고, 믿고 맡길 수 있어야 하니까요.',
      '입소를 준비할 때는 대기 순번만 보지 말고 거리, 운영 시간, 실제 등하원 동선을 같이 확인해보세요.'
    ].join('\n\n');
  }
  if (intent.id === 'parent_social_issue') {
    return [
      `${topicSubject} 부모가 아침마다 실제로 부딪히는 판단 문제예요.`,
      '이번 카드에서는 아이 컨디션, 기관 기준, 돌봄 공백을 나눠서 봤어요.',
      '저장해두고 등원 전 우리 집 상황과 기관 안내를 함께 확인해보세요.'
    ].join('\n\n');
  }
  if (intent.id === 'parent_safety_issue') {
    return [
      `${topicSubject} 불안보다 확인 기준이 먼저 필요한 주제예요.`,
      '이번 카드에서는 성분, 사용 조건, 대체 기준을 나눠서 봤어요.',
      '저장해두고 구매 전 제품 표시와 우리 집 사용 상황을 함께 확인해보세요.'
    ].join('\n\n');
  }
  if (intent.id === 'consumer_product_marketing' || intent.id === 'pet_consumer_product') {
    return [
      `${topicSubject} 많이 보인다는 사실보다 왜 사는지가 더 중요해요.`,
      '이번 카드에서는 사용 장면, 가격 기준, 다시 살 이유를 나눠서 봤어요.',
      '저장해두고 장바구니에 넣기 전 실제로 쓸 장면이 있는지 확인해보세요.'
    ].join('\n\n');
  }
  return [
    `${topicSubject} 반응만 보고 넘기기보다 판단 기준을 나눠볼 만한 주제예요.`,
    '이번 카드에서는 내 상황, 비교 기준, 확인 근거를 따로 정리했어요.',
    '저장해두고 비슷한 이슈를 볼 때 같은 기준으로 다시 확인해보세요.'
  ].join('\n\n');
}

function isBadCaptionBody(value) {
  return /단순히 많이 언급|반응, 비교 기준, 숫자 하나|확인할 숫자|까은|까이|제도 기준|Search SERP|네이트판|FMKorea/i.test(`${value ?? ''}`);
}

function normalizeCaptionCTA(value) {
  const fallback = '나중에 다시 볼 수 있게 저장해두고, 비교해보고 싶은 주제가 있으면 댓글로 남겨주세요.';
  return cleanCardBody(cleanAiTone(value || fallback)).replace(/\s+/g, ' ').trim().slice(0, 90);
}

function normalizeHashtags(value, input) {
  const base = Array.isArray(value) ? value : [];
  if (isDaycareShortageTopic(`${primaryTopic(input)} ${input.summary ?? ''} ${input.manualBrief?.prompt ?? ''}`)) {
    return [...new Set([...base, '어린이집', '어린이집입소', '입소대기', '육아정보', '육아현실', '맞벌이육아', '부모정보'].map((tag) => normalizeHashtag(tag)).filter(Boolean))].slice(0, 8);
  }
  const labelWords = `${primaryTopic(input) ?? ''}`
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}_]/gu, ''))
    .filter((word) => word.length >= 2)
    .slice(0, 3);
  const defaults = ['카드뉴스', '트렌드분석', '정보계정', '저장각', ...labelWords];
  return [...new Set([...base, ...defaults].map((tag) => normalizeHashtag(tag)).filter(Boolean))].slice(0, 8);
}

function daycareShortageBlueprint() {
  return [
    '부족이 자리 수만의 문제가 아니라는 표지 질문',
    '우리 동네에 없으면 부족하게 느껴지는 위치 문제',
    '운영 시간과 출근 시간이 맞지 않는 시간 문제',
    '정원보다 거리, 신뢰, 운영 시간이 함께 작동하는 구조',
    '입소 전 확인할 기준 3개로 마무리'
  ];
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
  const manual = normalizeManualBrief(input);
  if (manual) return manualFallbackCards(input, manual.cardCount);
  return evidenceBackedCards(input);
}

function manualFallbackCards(input, desiredCardCount = getDesiredCardCount(input)) {
  const manual = normalizeManualBrief(input);
  const topic = manual?.topic ?? input.label ?? input.keyword ?? '사용자 입력 주제';
  const prompt = manual?.prompt || `${topic}을 카드뉴스로 정리`;
  if (isDaycareShortageTopic(`${topic} ${prompt}`)) return daycareShortageCards(input, desiredCardCount);
  if (isOmega3Topic(`${topic} ${prompt} ${input.summary ?? ''}`)) return omega3FallbackCards(input, desiredCardCount);
  const base = [
    makeManualCard(1, `${topic} 시작하기`, `${topic}은 거창하게 시작하지 않아도 돼요.\n오늘 바로 해볼 수 있는 기준부터 잡아볼게요.`, 'cover', 'cover_text', '첫 장 후크'),
    makeManualCard(2, '먼저 기준을 정해요', `${prompt}\n핵심은 한 번에 많이 설명하는 게 아니라\n독자가 바로 이해할 순서로 나누는 거예요.`, 'content_angle', 'handwritten_research', '핵심 기준'),
    makeManualCard(3, '하나씩 따라가요', `${topic}을 실천할 때는\n첫 단계와 주의점 하나만 기억해도 충분해요.\n복잡하면 저장하지 않게 되니까요.`, 'why_now', 'quote_card', '실행 포인트'),
    makeManualCard(4, '비교하면 쉬워져요', `좋은 방법과 헷갈리는 방법을 나란히 두면\n무엇을 선택해야 하는지 금방 보여요.`, 'comparison', 'comparison_board', '비교 포인트'),
    makeManualCard(5, '숫자는 하나만', `시간, 횟수, 비용처럼 바로 판단할 숫자 하나를\n크게 보여주면 카드가 훨씬 선명해져요.`, 'data_scene', 'data_chart', '대표 숫자'),
    makeManualCard(6, '헷갈리는 점', `${topic}에서 자주 놓치는 건\n방법보다 순서예요.\n무리하지 않는 기준을 같이 적어주세요.`, 'misconception', 'quote_card', '주의점'),
    makeManualCard(7, '실행 전 체크 3개', `오늘 할 수 있는가\n주의점이 분명한가\n다시 볼 이유가 있는가`, 'checklist', 'checklist', '실행 기준')
  ];
  const cards = [];
  for (let index = 0; index < desiredCardCount; index += 1) {
    const source = index === desiredCardCount - 1 ? base[base.length - 1] : base[index] ?? base[base.length - 2];
    cards.push({ ...source, page: index + 1 });
  }
  return cards;
}

function isOmega3Topic(value) {
  return /오메가\s*3|omega-?3|EPA|DHA|ALA|피쉬\s*오일|fish\s*oil/i.test(`${value ?? ''}`);
}

function omega3FallbackCards(input, desiredCardCount = getDesiredCardCount(input)) {
  const topic = normalizeManualBrief(input)?.topic ?? primaryTopic(input) ?? '오메가3 영양제는 꼭 먹어야할까?';
  const base = [
    makeManualCard(1, topic, '꼭 먹어야 하는지보다\n먼저 식단과 기준량을 나눠봐야 해요.', 'cover', 'cover_text', '식단 먼저'),
    makeManualCard(2, '보충제보다 먼저 볼 것', '오메가3는 ALA, EPA, DHA가 달라요.\n식물성 식품은 주로 ALA,\n생선은 EPA·DHA를 채우는 쪽이에요.', 'content_angle', 'handwritten_research', '종류 구분'),
    {
      ...makeManualCard(3, '식단으로 얼마나 채워질까', '연어, 청어, 정어리처럼 지방 많은 생선은\n한 번 먹어도 EPA·DHA가 꽤 올라와요.\n보충제는 제품별 함량 확인이 먼저예요.', 'data_scene', 'data_chart', '식단 비교'),
      visualPrompt: '오메가3 식품/보충제 함량 비교 그래프가 들어갈 빈 중앙 패널. 실제 숫자와 막대는 TrLab SVG 레이어로 자동 렌더링.',
      visualItems: ['연어', '청어', '정어리', '피쉬오일'],
      visualData: omega3FoodComparisonChartData()
    },
    {
      ...makeManualCard(4, '영양제는 형태가 달라요', '피쉬오일, 알갈오일, 처방 오메가3는\n목적과 함량 기준이 달라요.\n효능보다 내 상황을 먼저 맞춰봐야 해요.', 'comparison', 'comparison_board', '효능보다 기준'),
      visualPrompt: '오메가3 식품, 피쉬오일, 알갈오일, 처방 오메가3 비교표가 들어갈 빈 중앙 패널. 실제 표는 TrLab SVG 레이어로 자동 렌더링.',
      visualItems: ['식품', '피쉬오일', '알갈오일', '처방 오메가3'],
      visualData: omega3SupplementEvidenceTableData()
    },
    makeManualCard(5, '먹기 전 체크 3개', '생선을 주 2회 먹고 있나\nEPA·DHA 함량을 봤나\n복용 약과 겹치지 않나', 'checklist', 'checklist', '복용 전 기준'),
    makeManualCard(6, '많이 먹는다고 답은 아니에요', '고용량은 속 불편감이나\n약물 상호작용을 확인해야 해요.\n치료 목적이면 전문가와 먼저 상의하세요.', 'misconception', 'quote_card', '고용량 주의')
  ];
  const cards = [];
  for (let index = 0; index < desiredCardCount; index += 1) {
    const source = index === desiredCardCount - 1 ? base[4] : base[index] ?? base[5];
    cards.push({ ...source, page: index + 1 });
  }
  return cards;
}

function makeManualCard(page, title, body, role, layout, emphasis) {
  return {
    page,
    role,
    layout,
    visualType: visualTypeForLayout(layout),
    title,
    body,
    insight: body,
    action: emphasis,
    visualPrompt: `${title}를 한눈에 보여주는 ${layout} 카드`,
    visualItems: [title, emphasis].filter(Boolean),
    sourceLine: '',
    emphasis
  };
}

function isDaycareShortageTopic(value) {
  return /어린이집/.test(`${value ?? ''}`) && /부족|대기|입소|자리|정원|공급|수요/.test(`${value ?? ''}`);
}

function daycareShortageCards(input, desiredCardCount) {
  const base = [
    makeScenarioCard({
      page: 1,
      role: 'cover',
      layout: 'cover_photo',
      visualType: 'photo',
      title: '왜 어린이집은 늘 부족할까?',
      body: '자리 수만의 문제는 아니에요.\n원하는 자리와 실제 자리가 어긋나요.',
      visualPrompt: '아침 등원 시간 어린이집 현관 앞. 작은 아이 가방, 대기표처럼 보이는 빈 번호 카드, 바쁜 부모의 손만 보이는 현실적인 사진/일러스트 배경. 하단 제목 영역은 비워둠.',
      visualItems: ['등원 시간', '대기표', '빈 자리'],
      emphasis: '부족의 구조'
    }),
    makeScenarioCard({
      page: 2,
      role: 'why_now',
      layout: 'quote_card',
      visualType: 'illustration',
      title: '문제는 숫자보다 위치',
      body: '전체 자리가 있어도 우리 동네에 없으면 부족해요.\n부모가 체감하는 부족은 거리에서 시작돼요.',
      visualPrompt: '동네 지도 위에 집, 직장, 어린이집 핀 3개가 떨어져 있는 장면. 이동 동선은 흐린 선으로 표시하고 카드 문구가 올라갈 흰 영역 확보.',
      visualItems: ['집', '직장', '어린이집'],
      emphasis: '위치 격차'
    }),
    makeScenarioCard({
      page: 3,
      role: 'comparison',
      layout: 'comparison_board',
      visualType: 'table',
      title: '시간이 안 맞아도 부족',
      body: '운영 시간과 출근 시간이 맞지 않으면\n자리가 있어도 선택지가 아니에요.',
      visualPrompt: '왼쪽은 어린이집 운영 시간, 오른쪽은 부모 출근 시간을 비교하는 2열 시간표. 시계 아이콘과 빈 시간 막대만 두고 텍스트 영역은 비움.',
      visualItems: ['운영 시간', '출근 시간', '하원 시간'],
      emphasis: '시간 격차'
    }),
    makeScenarioCard({
      page: 4,
      role: 'misconception',
      layout: 'handwritten_research',
      visualType: 'illustration',
      title: '정원만 늘리면 될까',
      body: '부모가 찾는 건 그냥 한 자리보다\n가깝고 믿을 수 있고 오래 맡길 수 있는 자리예요.',
      visualPrompt: '리서치 노트 위에 정원, 거리, 신뢰, 운영 시간 칩이 나뉘어 있는 장면. 단순 막대그래프 대신 조건 카드 4개가 보이는 구성.',
      visualItems: ['정원', '거리', '신뢰', '운영 시간'],
      emphasis: '선호 격차'
    }),
    makeScenarioCard({
      page: 5,
      role: 'checklist',
      layout: 'checklist',
      visualType: 'checklist',
      title: '입소 전 볼 기준 3개',
      body: '집과 얼마나 가까운가\n출근 시간과 맞는가\n대기 순번만 보고 있진 않은가',
      visualPrompt: '어린이집 안내문, 지도 핀, 작은 시계 아이콘이 들어간 3줄 체크리스트 카드. 각 줄은 텍스트가 들어갈 넓은 빈 영역으로 유지.',
      visualItems: ['거리', '시간', '대기 순번'],
      emphasis: '입소 판단 기준'
    })
  ];
  return fitScenarioCards(base, desiredCardCount);
}

function makeScenarioCard(card) {
  return {
    dataPoint: '',
    insight: card.body,
    action: card.emphasis,
    sourceLine: '사용자 입력 기반 구조 설명',
    ...card
  };
}

function fitScenarioCards(base, desiredCardCount) {
  if (desiredCardCount <= base.length) {
    const picked = base.slice(0, desiredCardCount);
    if (picked.length) picked[picked.length - 1] = { ...base[base.length - 1], page: picked.length };
    return picked.map((card, index) => ({ ...card, page: index + 1 }));
  }
  const cards = [...base];
  while (cards.length < desiredCardCount) {
    const page = cards.length + 1;
    cards.splice(cards.length - 1, 0, makeScenarioCard({
      page,
      role: 'content_angle',
      layout: 'quote_card',
      visualType: 'illustration',
      title: '부족은 조건의 문제',
      body: '부족하다는 말 안에는\n거리, 시간, 신뢰가 한꺼번에 들어 있어요.',
      visualPrompt: '거리, 시간, 신뢰 세 조건이 겹쳐지는 벤다이어그램 스타일 카드. 텍스트를 넣을 중앙 영역은 비워둠.',
      visualItems: ['거리', '시간', '신뢰'],
      emphasis: '조건 겹침'
    }));
  }
  return cards.map((card, index) => ({ ...card, page: index + 1 }));
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

function normalizeVisualPrompt(value, input, role, layout, title, body, sourceLine, intent = classifyContentIntent(input)) {
  const cleaned = cleanManualText(value);
  if (cleaned && !isGenericVisualPrompt(cleaned)) return cleaned.slice(0, 420);
  return visualPromptForCard({ input, role, layout, title, body, sourceLine, intent }).slice(0, 420);
}

function isGenericVisualPrompt(value) {
  return /한눈에 보여주는|설명하는 인포그래픽|카드$|quote_card|cover_text|data_chart|comparison_board|handwritten_research|checklist/.test(`${value ?? ''}`);
}

function visualPromptForCard({ input, role, layout, title, body, sourceLine, intent }) {
  const topic = primaryTopic(input);
  if (intent?.id === 'parent_social_issue') return parentSocialVisualPrompt(role, title, sourceLine || body || topic);
  if (intent?.id === 'parent_safety_issue') return parentSafetyVisualPrompt(role, title, sourceLine || body || topic);
  if (intent?.id === 'consumer_product_marketing' || intent?.id === 'pet_consumer_product') return productVisualPrompt(role, title, topic);
  return generalVisualPrompt(role, layout, title, topic, sourceLine || body);
}

function parentSocialVisualPrompt(role, title, fact) {
  return ({
    cover: '아침 출근 전 현관 앞, 부모가 아이 가방과 체온계를 챙기는 현실적인 사진/일러스트 배경. 얼굴은 특정 인물처럼 보이지 않게, 하단 큰 제목 영역은 비워둠.',
    community_signal: '부모가 등원 기준을 고민하는 현실적인 아침 장면. 휴대폰 화면은 보이지 않게 처리하고, 본문이 올라갈 빈 여백을 넓게 확보.',
    why_now: '시계, 출근 가방, 아이 외투, 어린이집 가방이 한 화면에 겹치는 아침 루틴 장면. 시간 압박이 느껴지는 구도.',
    comparison: '부모 일정과 아이 컨디션을 나눠 볼 수 있는 빈 분할 패널 배경. 실제 표, 숫자, 라벨은 넣지 않고 텍스트 오버레이 공간만 확보.',
    data_scene: '기사나 커뮤니티 원문을 보여주지 않고, 등원 가방·체온계·흐릿한 빈 종이 더미로 확인 신호 분위기만 표현.',
    misconception: '회사 일정표처럼 보이는 빈 종이, 아이 체온계, 기관 안내문처럼 보이는 빈 종이가 함께 놓인 균형 잡힌 점검 장면.',
    content_angle: '편집자가 육아 이슈를 메모지에 정리하는 리서치 노트 장면. 부모 현실, 제도, 아이 컨디션을 각각 빈 칩으로 배치.',
    checklist: '어린이집 가방, 체온계, 빈 안내문이 놓인 저장용 배경. 체크 문구가 들어갈 넓은 빈 줄 영역을 확보.',
    closing: '저장용 육아 정보 배경. 기준 문구가 올라갈 빈 줄 영역을 크게 확보.'
  })[role] ?? generalVisualPrompt(role, '', title, title, fact);
}

function parentSafetyVisualPrompt(role, title, fact) {
  return ({
    cover: '욕실 선반 위 아기 욕조, 물방울, 제품 라벨을 연상시키는 클린한 사진/3D 배경. 불안 조장 없이 안전 점검 분위기, 하단 제목 영역 비움.',
    community_signal: '부모가 제품을 살펴보는 안전 점검 장면. 화면이나 라벨 글자는 보이지 않게 처리하고 텍스트 오버레이 여백 확보.',
    why_now: '아기 욕조, 따뜻한 물, 반복 사용을 암시하는 욕실 소품 클로즈업. 성분 확인이 필요한 분위기.',
    comparison: '소재, 인증, 사용 조건을 나눠 얹을 수 있는 빈 분할 패널 배경. 실제 표, 성분명, 인증명, 숫자는 넣지 않음.',
    data_scene: '제품을 확대해 보는 돋보기와 빈 라벨 영역, 깨끗한 욕실 소품으로 확인 분위기만 표현. 원문 제목이나 수치는 넣지 않음.',
    misconception: '논란과 확인 조건을 나눠 볼 수 있는 빈 점검 보드 배경. 물음표, 체크 표시, 텍스트는 넣지 않음.',
    content_angle: '구매 전 점검 메모지, 소재 라벨, 대체품 리스트가 놓인 리서치 노트 장면.',
    checklist: '욕조와 안전 점검 소품이 있는 저장용 배경. 기준 문구가 들어갈 빈 줄 영역을 크게 확보.',
    closing: '육아용품 구매 전 저장용 배경. 깨끗한 욕실 배경 위에 넓은 빈 텍스트 영역을 확보.'
  })[role] ?? generalVisualPrompt(role, '', title, title, fact);
}

function productVisualPrompt(role, title, topic) {
  return ({
    cover: `${topic} 주제를 실제 제품처럼 보여주는 쇼핑 매거진형 풀블리드 배경. 제품 실루엣, 장바구니, 사용 장면을 조합하고 제목 영역은 비워둠.`,
    community_signal: '제품을 고르기 전 망설이는 쇼핑 장면. 화면, 댓글, 리뷰 카드 없이 제품 사용감과 구매 고민 분위기만 표현.',
    why_now: '제품이 갑자기 주목받는 사용 장면. 손에 들고 쓰는 컷, 책상/집/외출 가방 위 배치.',
    comparison: '검증된 제품 데이터 표가 들어갈 빈 중앙 패널. 실제 표, 가격, 성분명, 효능 문구, 제품명은 이미지에 넣지 않고 SVG 레이어용 여백만 확보.',
    data_scene: '검증된 수치나 제품 성분 데이터가 들어갈 빈 중앙 패널. 그래프/막대/숫자/성분표는 이미지에 넣지 않고 배경만 구성.',
    misconception: '예쁜 패키지와 실제 사용 장면을 대비하는 배경. 판단 문구는 들어갈 수 있도록 빈 영역 확보.',
    content_angle: '장바구니에 들어가는 이유를 정리하는 에디터 리서치 노트 분위기. 제품 사진처럼 보이는 빈 영역과 메모 여백 배치.',
    checklist: '제품 실루엣과 사용 장면이 보이는 저장용 배경. 구매 기준 문구가 들어갈 빈 줄 영역을 크게 확보.',
    closing: '쇼핑 저장 카드 느낌의 배경. 제품 실루엣과 넓은 빈 텍스트 영역을 확보.'
  })[role] ?? generalVisualPrompt(role, '', title, topic, topic);
}

function generalVisualPrompt(role, layout, title, topic, fact) {
  if (role === 'cover') return `${topic}을 상징하는 사진/일러스트 배경. 제목이 올라갈 하단 영역을 비워둔 4:5 표지 구도.`;
  if (role === 'comparison' || layout === 'comparison_board') return `${title} 비교자료가 들어갈 빈 중앙 패널. 표 내용, 숫자, 라벨은 이미지에 넣지 않고 SVG 레이어용 여백만 확보.`;
  if (role === 'data_scene' || layout === 'data_chart') return `${title} 데이터 카드용 빈 중앙 패널. 그래프, 숫자, 축, 표 내용은 이미지에 넣지 않고 SVG 레이어용 여백만 확보.`;
  if (role === 'checklist') return `${title} 저장용 배경. 항목 문구가 들어갈 넓은 빈 줄 영역을 확보.`;
  if (role === 'community_signal') return `${title} 반응 분위기 배경. 댓글, 말풍선, UI 없이 실제 생활 장면과 여백 중심 구성.`;
  return `${title} 리서치 노트 카드. 핵심 메모, 작은 칩, 본문 영역이 들어갈 여백 중심 구성.`;
}

function compactVisualLabel(value) {
  const text = `${value ?? ''}`
    .replace(/^\s*(근거|해석|실행|데이터|출처)\s*[:：]\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 18);
  if (isInternalVisualLabel(text)) return '';
  return text;
}

function isInternalVisualLabel(value) {
  const text = `${value ?? ''}`.trim();
  if (!text) return true;
  if (/Search SERP|Naver|Google|Brave|SERP|네이트판|더쿠|인스티즈|FMKOREA|에펨코리아/i.test(text)) return true;
  if (/https?:|www\.|\.com|\.co\.kr|\.net|\.org/i.test(text)) return true;
  if (/요즘 임출육|twig24|뉴시스|서울경제|데일리한국|비즈니스포스트/.test(text)) return true;
  if (/[“”"']/.test(text) && text.length > 12) return true;
  if (text.length >= 17 && /[?？…]|걸린|보내면|토로|논란|기사|원문/.test(text)) return true;
  return false;
}

function defaultVisualItems(input, role, card = {}) {
  const label = primaryTopic(input) ?? '주제';
  const intent = classifyContentIntent(input);
  const dataPoint = `${card.dataPoint ?? ''}`.trim();
  if (intent.id === 'parent_social_issue') {
    if (role === 'comparison') return ['맞벌이', '전업', '아이 컨디션', '기관 기준'];
    if (role === 'data_scene') return ['반복 사례', '등원 고민', '부모 반응'];
    if (role === 'community_signal') return ['출근 시간', '아이 컨디션', '기관 기준'];
  }
  if (intent.id === 'parent_safety_issue') {
    if (role === 'comparison') return ['소재 표시', '안전 인증', '사용 연령', '대체품'];
    if (role === 'data_scene') return ['성분 기준', '인증 확인', '사용 조건'];
    if (role === 'community_signal') return ['부모 질문', '성분 걱정', '제품 확인'];
  }
  if (role === 'comparison') return [label, '비교 기준', '독자 기준'];
  if (role === 'data_scene') return [/\d/.test(dataPoint) ? dataPoint : '대표 신호', '반복 언급', '댓글 반응'];
  if (role === 'community_signal') return ['커뮤니티 반응', '댓글 반응', '반복 언급'];
  if (role === 'why_now') return ['타이밍', '반응 증가', '지금 볼 이유'];
  if (role === 'misconception') return ['커뮤니티 반응', '확인된 사실', '확인 필요'];
  if (role === 'checklist') {
    const bodyItems = formatCardText(card.body).split('\n').filter(Boolean);
    return bodyItems.length ? bodyItems : ['반응이 있었나', '비교가 가능한가', '숫자로 설명되나'];
  }
  if (role === 'content_angle') return ['내 이야기화', '비교 프레임', '저장 포인트'];
  return [label, '핵심 포인트'];
}

function chooseReferenceStyle(input) {
  const intent = classifyContentIntent(input);
  if (intent.id === 'parent_social_issue' || intent.id === 'parent_safety_issue') return 'photo_hook';
  const text = `${primaryTopic(input) ?? ''} ${input.category ?? ''} ${input.summary ?? ''}`;
  if (/부동산|주식|투자|기업|앱|서비스|시장|가격|검색량|지표|코스피|코스닥|반도체|수급|금리|환율/.test(text)) return 'handdrawn_research';
  if (/연예|영화|음악|브랜드|문화|전시|인물/.test(text)) return 'magazine_story';
  if (/건강|의학|식품|다이어트|피부|운동/.test(text)) return 'meme_factcheck';
  return 'photo_hook';
}

function defaultBlueprint(input, intent = classifyContentIntent(input)) {
  const label = primaryTopic(input) ?? '이 주제';
  if (intent.id === 'parent_social_issue') {
    return [
      `${parentQuestionTitle(input, '정말 괜찮을까')}를 표지에서 질문`,
      '부모들이 실제로 막힌 지점을 짧게 요약',
      '왜 지금 반응을 얻었는지 현실 이유 제시',
      '맞벌이, 전업, 아이 컨디션처럼 비교 축 제시',
      '확인된 수치나 반복 사례 중 대표 신호 1개 선택',
      '부모 탓으로 단정하면 안 되는 지점 표시',
      '저장해둘 등원 기준 3개로 마무리'
    ];
  }
  if (intent.id === 'parent_safety_issue') {
    return [
      `${parentQuestionTitle(input, '정말 괜찮을까')}를 표지에서 질문`,
      '부모들이 불안해한 지점을 짧게 요약',
      '왜 지금 안전 기준을 봐야 하는지 제시',
      '성분, 사용 연령, 대체품 비교 축 제시',
      '확인된 기준이나 반복 사례 중 대표 신호 1개 선택',
      '논란과 위험을 섞으면 안 되는 지점 표시',
      '구매 전 체크 기준 3개로 마무리'
    ];
  }
  if (intent.id === 'consumer_product_marketing' || intent.id === 'pet_consumer_product') {
    return [
      `${label}을 왜 사는지 표지에서 질문`,
      '사람들이 저장한 구매 이유를 짧게 요약',
      '왜 지금 반응이 붙었는지 사용 장면 제시',
      '가격, 용도, 재구매 이유 비교 축 제시',
      '반복 언급이나 판매 신호 중 대표 지표 1개 선택',
      '유행템이라고 단정하면 안 되는 지점 표시',
      '구매 전 체크 기준 3개로 마무리'
    ];
  }
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

function normalizeTrendRole(value, index, total) {
  if (index === 0) return 'cover';
  const allowed = ['why_now', 'community_signal', 'comparison', 'data_scene', 'misconception', 'content_angle', 'checklist', 'closing'];
  if (allowed.includes(value) && value !== 'cover') return value;
  return canonicalRole(index, total);
}

function canonicalManualRole(index, total, value) {
  if (index === 0) return 'cover';
  if (index === total - 1) return 'checklist';
  const allowed = ['why_now', 'comparison', 'data_scene', 'misconception', 'content_angle', 'closing'];
  if (allowed.includes(value)) return value;
  return ['content_angle', 'why_now', 'content_angle', 'comparison', 'data_scene', 'misconception'][index - 1] ?? 'content_angle';
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
    content_angle: ['handwritten_research'],
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
