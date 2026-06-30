import { generateAIJson, hasAIProvider } from '#trlab/modules/services/ai/ai-providers';

const TEMPLATES = [
  {
    id: 'blank-canvas',
    label: '빈 템플릿',
    formatSignal: '자유 구성 / AI 설계',
    bestFor: ['자유 구성', '새 형식', '실험', '정해지지 않은 주제'],
    avoidFor: ['빠르게 안정적인 형식을 고르고 싶을 때']
  },
  {
    id: 'first-person-essay',
    label: '1인칭 에세이',
    formatSignal: '사연형 / 1인칭 에세이',
    bestFor: ['내 경험', '실패담', '고민', '불안', '솔직한 이야기', '연재', '다음 편'],
    avoidFor: ['정확한 방법론', '바로 구매 전환', '팩트 체크']
  },
  {
    id: 'brand-worldview',
    label: '브랜드 세계관',
    formatSignal: '브랜드형 / 세계관·감성',
    bestFor: ['브랜드 무드', '세계관', '감성', '캠페인', '브랜드 선언', '사진 중심'],
    avoidFor: ['구체적인 방법 설명', '체크리스트', '제품 기능 판매']
  },
  {
    id: 'painpoint-toon',
    label: '페인포인트 인스타툰',
    formatSignal: '페인포인트형 / 인스타툰',
    bestFor: ['불편', '고민', '페인포인트', '문제 해결', '기능 소개', '전환', '써보기'],
    avoidFor: ['분위기 중심 브랜딩', '개인 에세이 연재']
  },
  {
    id: 'instatoon-empathy',
    label: '인스타툰 공감형',
    formatSignal: '컷툰 / 대화형',
    bestFor: ['공감 상황', '일상 경험', '감정 변화', '짧은 대사'],
    avoidFor: ['정확한 방법론', '체크리스트', '비교표']
  },
  {
    id: 'story-before-after',
    label: 'Before / After',
    formatSignal: '비교 / 변화 서사',
    bestFor: ['전후 변화', '문제 해결', '개선 과정', '비교 사례'],
    avoidFor: ['여러 기준을 단계별로 설명', '순위형 추천']
  },
  {
    id: 'info-checklist',
    label: '정보 체크리스트',
    formatSignal: '텍스트 / 저장형',
    bestFor: ['방법', '순서', '체크리스트', '기준', '가이드', '저장용 정보'],
    avoidFor: ['감정 공감툰', '제품 순위']
  },
  {
    id: 'myth-fact',
    label: '오해와 진실',
    formatSignal: '팩트체크 / 설명형',
    bestFor: ['잘못 알려진 상식', '오해 교정', '근거 설명', '반박 콘텐츠'],
    avoidFor: ['단순 루틴 추천', '브랜드 스토리']
  },
  {
    id: 'product-guide',
    label: '제품 추천 가이드',
    formatSignal: '제품 / 선택 가이드',
    bestFor: ['구매 기준', '제품 선택', '주의점', '옵션 비교'],
    avoidFor: ['비제품 방법론', '감정 공감']
  },
  {
    id: 'ranking-pick',
    label: '랭킹 픽',
    formatSignal: '랭킹 / 비교형',
    bestFor: ['순위', '여러 선택지 비교', 'TOP 3', '추천 리스트'],
    avoidFor: ['하나의 방법을 순서대로 설명']
  },
  {
    id: 'brand-story',
    label: '브랜드 스토리',
    formatSignal: '브랜드 / 메시지형',
    bestFor: ['브랜드 철학', '문제의식', '서비스 소개', '신뢰 형성'],
    avoidFor: ['실용 체크리스트', '단순 랭킹']
  },
  {
    id: 'launch-teaser',
    label: '런칭 티저',
    formatSignal: '티저 / 캠페인형',
    bestFor: ['출시 예고', '신청 유도', '이벤트', '궁금증 형성'],
    avoidFor: ['방법 설명', '기준 정리']
  }
];

export async function recommendTemplates(input = {}) {
  const topic = clean(input.topic);
  const audience = clean(input.audience);
  const goal = clean(input.goal);
  const contentBrief = normalizeContentBrief(input.contentBrief);
  const contentDirection = clean(input.contentDirection) || contentBrief?.generation?.contentDirection || '';
  const planningDraft = normalizePlanningDraft(input.planningDraft) || normalizePlanningDraft(contentBrief?.planning);
  const metadata = normalizeMetadata(input.metadata) || normalizeMetadata(contentBrief?.metadata);
  if (!topic) return fallbackRecommendation({ topic, audience, goal, contentDirection, planningDraft, metadata });

  if (!hasAIProvider()) {
    return fallbackRecommendation({ topic, audience, goal, contentDirection, planningDraft, metadata, source: 'fallback' });
  }

  try {
    const { data, meta } = await generateAIJson(JSON.stringify({
      task: '사용자의 상세 카드뉴스 기획서에 맞는 템플릿을 추천한다.',
      userInput: { topic, audience, goal, contentDirection, metadata, planningDraft },
      templates: TEMPLATES,
      rules: [
        '정확히 3개 템플릿을 추천한다.',
        '가장 적합한 템플릿을 첫 번째로 둔다.',
        'planningDraft.format 또는 formatLabel은 사용자가 이미 고른 콘텐츠 형식이다. 명백히 모순되지 않으면 이 형식을 우선 존중한다.',
        '인스타툰/컷툰 형식에서 방법 설명이나 루틴 주제라면 감정 공감 서사보다 행동, 자세, 단계, 횟수를 보여줄 수 있는 툰 템플릿을 우선한다.',
        'reason은 상세 기획서의 독자, 컷 흐름, 제작 지시와 템플릿 구조를 연결해서 한 문장으로 쓴다.',
        'setupHint는 선택한 템플릿을 설계 단계에 반영할 방향을 한 문장으로 쓴다.',
        'avoidNote는 이 템플릿을 고를 때 피해야 할 방향을 짧게 쓴다.'
      ],
      jsonShape: {
        recommendations: [{
          templateId: 'info-checklist',
          confidence: 0.9,
          reason: '',
          setupHint: '',
          avoidNote: ''
        }]
      }
    }), {
      systemPrompt: '한국어 인스타그램 카드뉴스 기획자. 상세 기획서를 보고 가장 적합한 콘텐츠 템플릿을 고른다. 반드시 JSON만 반환한다.'
    });
    return normalizeRecommendation(data, { topic, audience, goal, contentDirection, planningDraft, metadata, source: 'ai', meta });
  } catch (error) {
    return fallbackRecommendation({ topic, audience, goal, contentDirection, planningDraft, metadata, source: 'fallback', warning: error.message });
  }
}

function normalizeRecommendation(data, context) {
  const items = Array.isArray(data?.recommendations) ? data.recommendations : [];
  const recommendations = items
    .map((item) => normalizeRecommendationItem(item))
    .filter(Boolean);
  const filled = recommendations.length ? recommendations : fallbackRecommendation(context).recommendations;
  return {
    source: context.source,
    topic: context.topic,
    recommendations: rankRecommendationsForPlanning(uniqueByTemplate(filled), context).slice(0, 3),
    model: context.meta?.model,
    usage: context.meta?.usage
  };
}

function normalizeRecommendationItem(item = {}) {
  const template = TEMPLATES.find((candidate) => candidate.id === item.templateId);
  if (!template) return null;
  return {
    templateId: template.id,
    label: template.label,
    formatSignal: template.formatSignal,
    confidence: clampConfidence(item.confidence),
    reason: clean(item.reason) || `${template.label}은 이 주제의 흐름을 잡기 좋습니다.`,
    setupHint: clean(item.setupHint) || '설계 단계에서 상세 기획서와 이 템플릿 구조를 함께 반영하세요.',
    avoidNote: clean(item.avoidNote) || ''
  };
}

function fallbackRecommendation(context = {}) {
  const text = [
    context.topic,
    context.audience,
    context.goal,
    context.contentDirection,
    context.planningDraft?.format,
    context.planningDraft?.formatLabel,
    context.planningDraft?.contentDirection,
    context.planningDraft?.storyFlow,
    context.planningDraft?.visualDirection,
    context.planningDraft?.promptGuide,
    context.planningDraft?.avoid,
    context.planningDraft?.characterName,
    context.planningDraft?.characterRole,
    context.planningDraft?.characterTraits,
    context.planningDraft?.characterPrompt,
    context.planningDraft?.characterStyleId,
    context.planningDraft?.characterDetailLevel,
    context.planningDraft?.templateLabel,
    context.planningDraft?.templateFormatSignal,
    context.planningDraft?.templateCanvas,
    formatArrayText(context.planningDraft?.templateCardPlan),
    formatArrayText(context.planningDraft?.templateEditorControls),
    formatArrayText(context.planningDraft?.templateProductionFlow),
    formatArrayText(context.planningDraft?.templateLayoutSlots),
    formatArrayText(context.planningDraft?.templateChannelStrategy),
    formatObjectText(context.planningDraft?.templateSettings),
    context.metadata?.objective,
    context.metadata?.tone,
    context.metadata?.channel
  ].filter(Boolean).join(' ').toLowerCase();
  const scores = TEMPLATES.map((template) => {
    const bestScore = template.bestFor.reduce((score, keyword) => score + (text.includes(keyword.toLowerCase()) ? 2 : 0), 0);
    const labelScore = text.includes(template.label.toLowerCase()) ? 2 : 0;
    const semanticScore = semanticTemplateScore(text, template.id);
    return { template, score: bestScore + labelScore + semanticScore };
  }).sort((a, b) => b.score - a.score);
  const picked = scores.slice(0, 3).map(({ template, score }, index) => ({
    templateId: template.id,
    label: template.label,
    formatSignal: template.formatSignal,
    confidence: Math.max(0.55, Math.min(0.9, 0.82 - index * 0.08 + score * 0.02)),
    reason: fallbackReason(template.id, context.topic),
    setupHint: fallbackSetupHint(template.id, context.topic),
    avoidNote: template.avoidFor[0] ? `${template.avoidFor[0]} 중심이면 다른 템플릿이 더 맞을 수 있습니다.` : ''
  }));
  return {
    source: context.source ?? 'fallback',
    topic: context.topic ?? '',
    recommendations: picked,
    warning: context.warning
  };
}

function normalizePlanningDraft(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return {
    id: clean(value.id),
    title: clean(value.title),
    topic: clean(value.topic),
    audience: clean(value.audience),
    goal: clean(value.goal),
    contentDirection: clean(value.contentDirection),
    format: clean(value.format),
    formatLabel: clean(value.formatLabel),
    cardCount: Number(value.cardCount) || 0,
    detailLevel: clean(value.detailLevel),
    tone: clean(value.tone),
    storyFlow: clean(value.storyFlow),
    visualDirection: clean(value.visualDirection),
    promptGuide: clean(value.promptGuide),
    avoid: clean(value.avoid),
    characterName: clean(value.characterName),
    characterRole: clean(value.characterRole),
    characterTraits: clean(value.characterTraits),
    characterPrompt: clean(value.characterPrompt),
    characterStyleId: clean(value.characterStyleId),
    characterDetailLevel: clean(value.characterDetailLevel),
    selectedCharacterId: clean(value.selectedCharacterId),
    characterAssets: Array.isArray(value.characterAssets) ? value.characterAssets.slice(0, 12).map((asset) => ({
      id: clean(asset?.id),
      name: clean(asset?.name),
      role: clean(asset?.role),
      traits: clean(asset?.traits),
      styleLabel: clean(asset?.styleLabel),
      detailLabel: clean(asset?.detailLabel)
    })) : [],
    templateId: clean(value.templateId),
    templateLabel: clean(value.templateLabel),
    templateFormatSignal: clean(value.templateFormatSignal),
    templateCanvas: clean(value.templateCanvas),
    templatePlatforms: Array.isArray(value.templatePlatforms) ? value.templatePlatforms.slice(0, 8).map(clean).filter(Boolean) : [],
    templateCardPlan: Array.isArray(value.templateCardPlan) ? value.templateCardPlan.slice(0, 12) : [],
    templateEditorControls: Array.isArray(value.templateEditorControls) ? value.templateEditorControls.slice(0, 12) : [],
    templateProductionFlow: Array.isArray(value.templateProductionFlow) ? value.templateProductionFlow.slice(0, 12) : [],
    templateLayoutSlots: Array.isArray(value.templateLayoutSlots) ? value.templateLayoutSlots.slice(0, 12) : [],
    templateChannelStrategy: Array.isArray(value.templateChannelStrategy) ? value.templateChannelStrategy.slice(0, 8) : [],
    templateSettings: value.templateSettings && typeof value.templateSettings === 'object' && !Array.isArray(value.templateSettings) ? value.templateSettings : {}
  };
}

function formatArrayText(value) {
  if (!Array.isArray(value)) return '';
  return value.flat(Infinity).map(clean).filter(Boolean).join(' ');
}

function formatObjectText(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  return Object.entries(value).flatMap(([key, item]) => [key, ...(Array.isArray(item) ? item : [item])]).map(clean).filter(Boolean).join(' ');
}

function normalizeMetadata(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return {
    objective: clean(value.objective),
    tone: clean(value.tone),
    channel: clean(value.channel),
    audienceNote: clean(value.audienceNote),
    goal: clean(value.goal),
    notes: clean(value.notes)
  };
}

function normalizeContentBrief(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return {
    generation: value.generation && typeof value.generation === 'object' ? {
      topic: clean(value.generation.topic),
      audience: clean(value.generation.audience),
      goal: clean(value.generation.goal),
      contentDirection: clean(value.generation.contentDirection)
    } : {},
    metadata: value.metadata && typeof value.metadata === 'object' ? value.metadata : null,
    planning: value.planning && typeof value.planning === 'object' ? {
      ...value.planning,
      format: value.format?.id || value.planning.format,
      formatLabel: value.format?.label || value.planning.formatLabel,
      templateId: value.template?.id || value.planning.templateId,
      templateLabel: value.template?.label || value.planning.templateLabel,
      templateFormatSignal: value.template?.formatSignal || value.planning.templateFormatSignal,
      templateCanvas: value.template?.canvas || value.planning.templateCanvas,
      templatePlatforms: value.template?.platforms || value.planning.templatePlatforms,
      templateCardPlan: value.template?.cardPlan || value.planning.templateCardPlan,
      templateEditorControls: value.template?.editorControls || value.planning.templateEditorControls,
      templateProductionFlow: value.template?.productionFlow || value.planning.templateProductionFlow,
      templateLayoutSlots: value.template?.layoutSlots || value.planning.templateLayoutSlots,
      templateChannelStrategy: value.template?.channelStrategy || value.planning.templateChannelStrategy,
      templateSettings: value.template?.settings || value.planning.templateSettings
    } : null
  };
}

function semanticTemplateScore(text, templateId) {
  if (/인스타툰|instatoon|컷툰|툰|캐릭터/.test(text) && templateId === 'painpoint-toon') return /방법|어떻게|구성|짜는|순서|루틴|체크|가이드|기준|팁|자세|횟수|세트/.test(text) ? 8 : 5;
  if (/인스타툰|instatoon|컷툰|툰|캐릭터/.test(text) && templateId === 'instatoon-empathy') return /공감|상황|일상|감정|대화/.test(text) ? 7 : 3;
  if (/인스타툰|instatoon|컷툰|툰|캐릭터/.test(text) && templateId === 'info-checklist') return /행동|자세|횟수|세트|시연|동작/.test(text) ? -2 : 0;
  if (/방법|어떻게|구성|짜는|순서|루틴|체크|가이드|기준|팁/.test(text) && templateId === 'info-checklist') return 5;
  if (/내가|저는|실패|경험|고민|불안|솔직|사연|에세이|연재|다음/.test(text) && templateId === 'first-person-essay') return 5;
  if (/세계관|무드|감성|캠페인|브랜드 선언|분위기|사진|영상미/.test(text) && templateId === 'brand-worldview') return 5;
  if (/불편|페인|문제 해결|기능|써봐|전환|고민하는|해결한/.test(text) && templateId === 'painpoint-toon') return 5;
  if (/전후|before|after|바뀌|변화|개선/.test(text) && templateId === 'story-before-after') return 5;
  if (/오해|진실|팩트|잘못|착각|논란/.test(text) && templateId === 'myth-fact') return 5;
  if (/제품|추천|구매|고르는|가격|비교/.test(text) && templateId === 'product-guide') return 4;
  if (/순위|랭킹|top|베스트|비교/.test(text) && templateId === 'ranking-pick') return 4;
  if (/공감|상황|일상|마음|대화|스토리/.test(text) && templateId === 'instatoon-empathy') return 4;
  if (/브랜드|서비스|우리|소개|철학/.test(text) && templateId === 'brand-story') return 4;
  if (/런칭|출시|오픈|신청|이벤트|티저/.test(text) && templateId === 'launch-teaser') return 4;
  if (/자유|새로운|모르겠|실험|빈/.test(text) && templateId === 'blank-canvas') return 4;
  return 0;
}

function fallbackReason(templateId, topic) {
  const label = topic || '이 주제';
  if (templateId === 'info-checklist') return `${label}은 방법과 기준을 저장용으로 정리하는 흐름이 중요해서 정보 체크리스트가 잘 맞습니다.`;
  if (templateId === 'first-person-essay') return `${label}을 내 경험과 실패담으로 풀면 공감과 연재 기대감을 만들기 좋습니다.`;
  if (templateId === 'brand-worldview') return `${label}을 정보보다 무드와 관점으로 각인시키고 싶을 때 적합합니다.`;
  if (templateId === 'painpoint-toon') return `${label}이 구체적인 불편이나 기능 해결과 연결될 때 전환 흐름을 만들기 좋습니다.`;
  if (templateId === 'story-before-after') return `${label}은 전후 변화나 개선 과정을 보여주면 이해가 쉬워집니다.`;
  if (templateId === 'myth-fact') return `${label}에 흔한 오해가 있다면 반박 구조로 설득하기 좋습니다.`;
  if (templateId === 'product-guide') return `${label}이 선택 기준이나 구매 판단과 연결될 때 적합합니다.`;
  if (templateId === 'ranking-pick') return `${label}을 여러 선택지로 나눠 비교할 때 적합합니다.`;
  if (templateId === 'instatoon-empathy') return `${label}을 독자가 겪는 상황으로 보여주고 싶을 때 적합합니다.`;
  if (templateId === 'brand-story') return `${label}을 브랜드 관점과 메시지로 풀 때 적합합니다.`;
  if (templateId === 'blank-canvas') return `${label}에 맞는 구조를 다음 단계에서 AI와 처음부터 설계하기 좋습니다.`;
  return `${label}에 호기심을 만들고 신청이나 공개 행동으로 연결할 때 적합합니다.`;
}

function fallbackSetupHint(templateId, topic) {
  const label = topic || '주제';
  if (templateId === 'blank-canvas') return `${label}의 상세 기획서를 바탕으로 설계 단계에서 자유롭게 컷 구성을 생성하세요.`;
  if (templateId === 'info-checklist') return `${label}의 핵심 기준, 순서, 체크 항목을 설계 단계 카드별 문장에 반영하세요.`;
  if (templateId === 'first-person-essay') return `${label}을 겪은 화자, 실패 장면, 다음 편 떡밥을 설계 단계에 반영하세요.`;
  if (templateId === 'brand-worldview') return `${label}의 브랜드 무드, 사진 방향, 남기고 싶은 문장을 설계 단계에 반영하세요.`;
  if (templateId === 'painpoint-toon') return `${label}에서 타겟이 겪는 불편, 해결 기능 1개, 단일 CTA를 설계 단계에 반영하세요.`;
  if (templateId === 'story-before-after') return `${label}의 문제 상태와 바뀐 결과를 대비해서 설계하세요.`;
  return `${label}을 어떤 독자에게 어떤 행동으로 연결할지 설계 단계에 반영하세요.`;
}

function uniqueByTemplate(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.templateId)) return false;
    seen.add(item.templateId);
    return true;
  });
}

function rankRecommendationsForPlanning(items = [], context = {}) {
  const preference = preferredTemplateOrder(context);
  if (!preference.length) return items;
  const order = new Map(preference.map((templateId, index) => [templateId, index]));
  return [...items].sort((a, b) => {
    const rankA = order.has(a.templateId) ? order.get(a.templateId) : Number.MAX_SAFE_INTEGER;
    const rankB = order.has(b.templateId) ? order.get(b.templateId) : Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    return 0;
  });
}

function preferredTemplateOrder(context = {}) {
  const text = [
    context.planningDraft?.format,
    context.planningDraft?.formatLabel,
    context.planningDraft?.contentDirection,
    context.planningDraft?.storyFlow,
    context.topic,
    context.goal
  ].filter(Boolean).join(' ').toLowerCase();
  if (/인스타툰|instatoon|컷툰|툰/.test(text)) {
    if (/방법|어떻게|구성|짜는|순서|루틴|체크|가이드|기준|팁|자세|횟수|세트|시연|동작/.test(text)) {
      return ['painpoint-toon', 'instatoon-empathy', 'info-checklist', 'blank-canvas'];
    }
    return ['instatoon-empathy', 'painpoint-toon', 'story-before-after', 'blank-canvas'];
  }
  if (/제품|product|추천형|구매/.test(text)) return ['product-guide', 'ranking-pick', 'info-checklist'];
  if (/정보|information|교육|설명|체크|가이드/.test(text)) return ['info-checklist', 'myth-fact', 'story-before-after'];
  return [];
}

function clampConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0.7;
  return Math.max(0, Math.min(1, number));
}

function clean(value) {
  return `${value ?? ''}`.replace(/\s+/g, ' ').trim();
}
