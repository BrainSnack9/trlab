import { generateAIJson, hasAIProvider } from './ai-providers.js';

import { broadKeywordPattern, incidentPattern, politicsPattern } from '#trlab/modules/services/ranking/ranking-config';

const communitySources = new Set(['FMKorea', 'TheQoo', 'Nate Pann', 'DCInside', 'Ruliweb', 'BobaeDream', 'MLBPark', 'Clien', 'Reddit']);
const emotionalGrievancePattern = /(차별받았|차별받음|받았어요|당했어요|억울해요|서러워요|하소연|때문에\s*차별|피해봤)/i;
const trendAnalysisSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          t: { type: 'string' },
          s: { type: 'integer', minimum: 1, maximum: 100 },
          r: { type: 'integer', minimum: 0, maximum: 100 },
          keep: { type: 'boolean' },
          a: { type: 'string', maxLength: 80 },
          w: { type: 'string', maxLength: 90 },
          type: { type: 'string', enum: ['해설형', '리스트형', '비교형', '반응형', '검증형', '체크리스트형'] },
          titles: { type: 'array', maxItems: 3, items: { type: 'string', maxLength: 34 } },
          rs: { type: 'array', maxItems: 2, items: { type: 'string', maxLength: 24 } }
        },
        required: ['id', 't', 's', 'r', 'keep', 'a', 'w', 'type', 'titles', 'rs']
      }
    }
  },
  required: ['items']
};

export async function enrichTrendsWithAI(trends, options = {}) {
  const limit = Math.min(Number(options.limit ?? 12), trends.length);
  if (!hasAIProvider() || limit <= 0) return { trends: trends.map(ensureContentIdeasContract), meta: { enabled: false, analyzed: 0 } };
  const targets = selectAITargets(trends, limit);
  try {
    const prompt = buildPrompt(targets);
    const { provider, data, meta: providerMeta } = await generateAIJson(prompt, {
      schema: trendAnalysisSchema,
      schemaName: 'trend_analysis',
      promptCacheKey: 'trlab_trend_analysis_v3_content_ideas'
    });
    const items = completeMissingItems(targets, extractItems(data).map(normalizeAIItem));
    const analysis = new Map(items.filter((item) => item?.id).map((item) => [String(item.id), item]));
    let analyzed = 0;
    const enriched = trends.map((trend, index) => {
      const ai = analysis.get(trend.id) ?? (index < targets.length ? items[index] : null);
      if (ai) analyzed += 1;
      return applyAIAnalysis(trend, ai);
    }).map(ensureContentIdeasContract).filter(isAIUsable);
    return { trends: enriched.sort(sortByAI), meta: { enabled: true, provider, analyzed, model: providerMeta?.model, usage: summarizeUsage(providerMeta?.usage), promptChars: prompt.length, targetCount: targets.length } };
  } catch (error) {
    return { trends: trends.map(ensureContentIdeasContract), meta: { enabled: false, analyzed: 0, error: error.message } };
  }
}

function selectAITargets(trends, limit) {
  const selected = [];
  const keys = new Set();
  const add = (trend) => {
    if (!trend?.id || keys.has(trend.id) || selected.length >= limit) return;
    keys.add(trend.id);
    selected.push(trend);
  };
  trends.slice(0, Math.ceil(limit * 0.45)).forEach(add);
  [...trends]
    .sort((a, b) => getEditorialPreScore(b) - getEditorialPreScore(a))
    .forEach(add);
  [...trends]
    .filter((trend) => trend.channelFit?.bestProfile)
    .sort((a, b) => (b.channelFit.bestProfile.score ?? 0) - (a.channelFit.bestProfile.score ?? 0))
    .forEach(add);
  return selected.sort((a, b) => trends.indexOf(a) - trends.indexOf(b));
}

function getEditorialPreScore(trend) {
  return (trend.production?.score ?? 0)
    + Math.min(28, trend.scoring?.opportunity ?? 0)
    + (trend.channelFit?.bestProfile ? 12 : 0)
    + Math.min(10, trend.evidence?.length ?? 0)
    - Math.min(30, trend.scoring?.cohesionPenalty ?? 0)
    - Math.min(16, trend.scoring?.riskPenalty ?? 0);
}

function completeMissingItems(targets, items) {
  const current = [...items];
  if (current.length >= targets.length) return current;
  const byId = new Set(current.map((item) => item?.id).filter(Boolean).map(String));
  const missing = targets.filter((trend, index) => !byId.has(trend.id) && index >= current.length);
  missing.forEach((trend) => current.push({ id: trend.id, contentScore: trend.production?.score ?? trend.score, riskScore: 35, topic: trend.keyword, contentIdeas: fallbackContentIdeas(trend) }));
  return current;
}

function applyAIAnalysis(trend, ai) {
  if (!ai) return ensureContentIdeasContract(trend);
  if (shouldHonorAIReject(trend, ai)) {
    return {
      ...trend,
      aiAnalysis: { ...ai, finalScore: 1 },
      production: { ...(trend.production ?? {}), score: 1, tier: '제외 후보', reasons: [ai.whyNow, ...(ai.risks ?? [])].filter(Boolean).slice(0, 4) }
    };
  }
  const score = clamp(ai.contentScore ?? trend.production?.score ?? trend.score, 1, 100);
  const risk = clamp(ai.riskScore ?? 20, 0, 100);
  const localScore = clamp(trend.production?.score ?? trend.score ?? 60, 1, 100);
  const aiScore = clamp(Math.round(score - risk * getRiskWeight(trend) + getEvidenceAdjustment(trend) + getKeepAdjustment(ai)), 1, 100);
  const finalScore = clamp(Math.round(localScore * 0.38 + aiScore * 0.62), 1, 100);
  const tier = finalScore >= 82 ? '바로 제작' : finalScore >= 66 ? '검증 후 제작' : finalScore >= 52 ? '관찰' : '제외 후보';
  const topic = shouldAcceptAITopic(ai.topic, trend.keyword) ? ai.topic : trend.keyword;
  const contentIdeas = normalizeContentIdeas(ai.contentIdeas ?? ai.cardPlan, topic, { ...trend, keyword: topic });
  return {
    ...trend,
    keyword: topic,
    label: topic || trend.label,
    score: Math.max(trend.score, finalScore),
    aiAnalysis: { ...ai, contentIdeas, finalScore },
    contentIdeas,
    validation: {
      ...trend.validation,
      grade: finalScore >= 82 ? 'A' : finalScore >= 66 ? 'B' : finalScore >= 52 ? 'C' : 'D',
      contentType: ai.contentType ?? trend.validation?.contentType,
      suggestedTitle: contentIdeas[0] ?? trend.validation?.suggestedTitle,
      reason: ai.whyNow ?? trend.validation?.reason,
      risks: ai.risks ?? trend.validation?.risks,
      cardPlan: undefined
    },
    production: {
      ...(trend.production ?? {}),
      score: finalScore,
      tier,
      suggestedAngle: ai.angle ?? trend.production?.suggestedAngle,
      reasons: [ai.whyNow, ai.insight, ai.channelGrowthFit, ai.monetizationPath, ai.chartIdea, ai.shareTrigger, ...(ai.risks ?? [])].filter(Boolean).slice(0, 6)
    }
  };
}

function shouldHonorAIReject(trend, ai) {
  if (ai.keep !== false) return false;
  const risk = clamp(ai.riskScore ?? 0, 0, 100);
  const text = `${trend.keyword ?? ''} ${trend.sampleTitles?.join(' ') ?? ''} ${ai.whyNow ?? ''} ${ai.risks?.join(' ') ?? ''}`;
  if (risk >= 75) return true;
  return risk >= 55 && /(정치|선거|성인|루머|혐오|매체명|커뮤니티\s*잡담|근거\s*부족|부적합|제외)/i.test(text);
}

function normalizeAIItem(item = {}) {
  return {
    id: String(item.id ?? ''),
    topic: item.topic ?? item.t ?? '',
    contentScore: item.contentScore ?? item.s,
    riskScore: item.riskScore ?? item.r,
    keep: item.keep ?? true,
    angle: item.angle ?? item.a ?? '',
    whyNow: item.whyNow ?? item.w ?? '',
    contentType: item.contentType ?? item.type,
    contentIdeas: item.contentIdeas ?? item.titles ?? [],
    risks: item.risks ?? item.rs ?? []
  };
}

function shouldAcceptAITopic(topic, original) {
  const next = `${topic ?? ''}`.trim();
  const prev = `${original ?? ''}`.trim();
  if (!next || !prev || next === prev) return false;
  const nextTokens = contentTokens(next);
  const prevTokens = contentTokens(prev);
  if (!nextTokens.length || !prevTokens.length) return false;
  const overlap = nextTokens.filter((token) => prevTokens.includes(token)).length;
  return overlap >= Math.min(2, prevTokens.length) && next.length <= prev.length + 8;
}

function contentTokens(value) {
  return `${value ?? ''}`.toLowerCase()
    .split(/\s+|·|-|\/|,|\(|\)/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .filter((token) => !/^(ai|the|and|with|시장|전략|변화|비교|주의|사례|활용)$/.test(token));
}

function sortByAI(a, b) {
  return getCommunityPriority(b) - getCommunityPriority(a)
    || (b.production?.score ?? 0) - (a.production?.score ?? 0)
    || (b.aiAnalysis?.contentScore ?? 0) - (a.aiAnalysis?.contentScore ?? 0)
    || b.score - a.score;
}

function isAIUsable(trend) {
  if (!trend.aiAnalysis) return (trend.production?.score ?? 0) >= 50;
  const text = `${trend.keyword} ${trend.aiAnalysis.angle ?? ''}`;
  const sourceText = `${text} ${trend.sampleTitles?.join(' ') ?? ''}`;
  const strongCommunitySignal = (trend.scoring?.communityReaction ?? 0) >= 16;
  if (broadKeywordPattern.test(trend.keyword)) return false;
  if (emotionalGrievancePattern.test(sourceText)) return false;
  if ((trend.aiAnalysis.riskScore ?? 0) >= 70) return false;
  if ((trend.aiAnalysis.finalScore ?? 0) < 50) return false;
  if (strongCommunitySignal && (trend.aiAnalysis.riskScore ?? 0) < 80 && !politicsPattern.test(sourceText)) return true;
  if (incidentPattern.test(sourceText) && (trend.aiAnalysis.riskScore ?? 0) >= 45) return false;
  if (politicsPattern.test(sourceText)) return false;
  return !/카드뉴스로\s*부적합|소재로\s*약함|맥락\s*부족|단순\s*키워드/.test(text);
}

function buildPrompt(trends) {
  return JSON.stringify({
    role: 'KR Instagram trend editor',
    ask: 'Judge compact candidates. Return JSON only. Keep original topic unless tiny cleanup is needed.',
    rule: 's=content value 1-100, r=risk 0-100. keep=false only for hard rejects: politics/election/adult/rumor/media-name/chat/no-content. Search-only is OK when evidence supports checklist/explainer/comparison. Return exactly 3 concise titles. Do not add years/dates unless evidence includes them. Use only evidence.',
    candidates: trends.map(toPayload)
  });
}

function toPayload(trend) {
  const flags = [
    trend.channelFit?.bestProfile && `profile:${trend.channelFit.bestProfile.label}`,
    (trend.scoring?.opportunity ?? 0) >= 30 && 'strong-angle',
    (trend.scoring?.cohesionPenalty ?? 0) >= 12 && 'mixed-evidence',
    (trend.scoring?.riskPenalty ?? 0) >= 20 && 'risk',
    !hasCommunityEvidence(trend) && 'search-only'
  ].filter(Boolean);
  return {
    id: trend.id,
    k: trend.keyword,
    cat: trend.category,
    sc: trend.production?.score ?? trend.score,
    op: trend.scoring?.opportunity ?? 0,
    flags,
    src: trend.sources,
    e: getCompactEvidence(trend).slice(0, 3)
  };
}

function getCompactEvidence(trend) {
  const seen = new Set();
  return (trend.evidence ?? [])
    .map((item) => compact(`${item.metric ? `${item.metric}: ` : ''}${item.title ?? ''}`, 76))
    .filter((line) => {
      const key = line.toLowerCase();
      if (!line || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function ensureContentIdeasContract(trend) {
  const contentIdeas = normalizeContentIdeas(
    trend.contentIdeas ?? trend.aiAnalysis?.contentIdeas ?? trend.validation?.contentIdeas,
    trend.keyword,
    trend
  );
  return {
    ...trend,
    contentIdeas,
    aiAnalysis: trend.aiAnalysis ? { ...trend.aiAnalysis, contentIdeas } : trend.aiAnalysis,
    validation: {
      ...trend.validation,
      suggestedTitle: trend.validation?.suggestedTitle ?? contentIdeas[0],
      contentIdeas,
      cardPlan: undefined
    }
  };
}

function normalizeContentIdeas(value, topic, trend) {
  const items = Array.isArray(value) ? value : [];
  const cleaned = items
    .map((item) => compact(`${item ?? ''}`.replace(/^\d+[.)]\s*/, ''), 34))
    .filter((item) => item && !/^\s*(근거|본문|카드\s*\d+|page|출처|요약)\s*[:：]/i.test(item))
    .filter((item) => !/(첫\s*번째|두\s*번째|세\s*번째|장면|페이지|카드뉴스\s*구성|카드\s*순서)/i.test(item))
    .filter((item) => !hasUnsupportedYear(item, trend));
  const unique = [...new Set(cleaned)];
  return (unique.length >= 3 ? unique : [...unique, ...fallbackContentIdeas({ ...trend, keyword: topic })])
    .filter(Boolean)
    .slice(0, 6);
}

function hasUnsupportedYear(item, trend = {}) {
  const year = `${item ?? ''}`.match(/\b20\d{2}년?/);
  if (!year) return false;
  const sourceText = `${trend.keyword ?? ''} ${trend.sampleTitles?.join(' ') ?? ''} ${trend.evidence?.map((e) => `${e.title ?? ''} ${e.metric ?? ''}`).join(' ') ?? ''}`;
  return !sourceText.includes(year[0]);
}

function fallbackContentIdeas(trend = {}) {
  const keyword = compact(trend.keyword ?? trend.label ?? '이 키워드', 18);
  const text = `${keyword} ${trend.sampleTitles?.join(' ') ?? ''}`;
  const specialized = getSpecializedFallbackIdeas(text, keyword);
  if (specialized.length) return specialized;
  return [
    `${keyword} 왜 지금 뜰까`,
    `${keyword} 핵심 변화 3가지`,
    `${keyword} 선택 전 확인할 기준`,
    `${keyword} 오해하기 쉬운 포인트`,
    `${keyword} 앞으로 달라질 것`
  ];
}

function getSpecializedFallbackIdeas(text, keyword) {
  if (/기업.*AI|생성형\s*AI.*업무|업무.*AI|AX|자동화/i.test(text)) return [
    '기업이 생성형 AI를 업무에 붙이는 방식',
    'AI 업무 자동화가 먼저 들어가는 부서',
    '도입보다 중요한 기업 AI 실행 기준',
    '생성형 AI 공모전이 늘어나는 이유',
    '직장인이 AI 활용에서 먼저 배워야 할 것'
  ];
  if (/(AI\s*검색|GEO|AEO|SEO|검색\s*노출|브랜드\s*노출)/i.test(text)) return [
    'AI 검색 시대, 브랜드 노출이 달라지는 이유',
    'SEO 다음은 GEO? 콘텐츠가 바뀌는 지점',
    'AI 답변에 걸리는 콘텐츠의 공통점',
    '브랜드가 AI 검색 노출을 점검하는 법',
    '검색 유입이 줄어들 때 먼저 볼 지표'
  ];
  if (/(수면|멜라토닌|마그네슘).*영양제|영양제.*수면/i.test(text)) return [
    '수면 영양제, 성분별로 다른 점',
    '멜라토닌과 마그네슘을 헷갈리면 안 되는 이유',
    '잠 안 올 때 영양제보다 먼저 볼 것',
    '수면 보조제 고를 때 확인할 기준',
    '먹으면 안 되는 사람부터 체크하기'
  ];
  if (/(건강기능식품|건기식|면역력|표방 식품|식품첨가물)/i.test(text)) return [
    '건강기능식품 광고에서 조심할 표현',
    '효과처럼 보이지만 확인해야 할 문구',
    '건기식과 일반식품을 구분하는 법',
    '비만치료제 표방 식품이 위험한 이유',
    '구매 전 라벨에서 봐야 할 것'
  ];
  if (/(AI\s*펫|펫가젯|AI\s*장난감|인형)/i.test(text)) return [
    'AI 펫가젯이 보호자에게 주는 편리함',
    'AI 장난감 살 때 먼저 확인할 것',
    '반려동물용 스마트 기기의 장단점',
    '자동화 기기가 돌봄을 대신할 수 있을까',
    '개인정보와 안전 기준까지 봐야 하는 이유'
  ];
  if (/(반려동물|펫|강아지|고양이).*(진료비|병원비|표준수가|보험)|(진료비|병원비|표준수가|보험).*(반려동물|펫|강아지|고양이)/i.test(text)) return [
    '반려동물 진료비 표준수가제란 무엇일까',
    '동물병원비가 병원마다 다른 이유',
    '펫보험 가입 전 확인해야 할 보장 범위',
    '보호자가 진료비에서 꼭 물어볼 것',
    '반려동물 병원비 부담을 줄이는 체크포인트'
  ];
  if (/(GLP-?1|위고비|마운자로|유지어터|비만치료제)/i.test(text)) return [
    'GLP-1 이후 유지어터 시장이 커지는 이유',
    '살 빠진 뒤 식품 시장이 주목받는 배경',
    '비만치료제가 바꾸는 장보기 기준',
    '유지어터가 찾는 식품의 공통점',
    '다이어트 식품 광고에서 조심할 표현'
  ];
  if (/(전기차|EV).*(구독|배터리|가격|전략)|현대차|기아/i.test(text)) return [
    '전기차를 사는 대신 구독하는 흐름',
    '배터리 가격 하락이 차값에 미치는 영향',
    '현대차·기아 전기차 전략의 변화',
    'MZ 이동 소비가 월정액으로 바뀌는 이유',
    '전기차 구매 전 가격 구조 체크하기'
  ];
  if (/(K-?뷰티|올리브영|성분\s*중심|틱톡)/i.test(text)) return [
    'K뷰티 소비가 성분 중심으로 바뀌는 이유',
    '틱톡에서 뜨는 뷰티템의 공통점',
    '올리브영이 웰니스로 넓히는 이유',
    '해외 소비자가 K뷰티를 고르는 기준',
    '브랜드보다 성분을 먼저 보는 소비자들'
  ];
  if (/(단백질|알부민)/i.test(text)) return [
    '단백질 시장이 운동용에서 일상용으로 바뀌는 이유',
    '단백질 제품 고를 때 확인할 기준',
    '알부민과 일반 단백질을 헷갈리면 안 되는 이유',
    '건강식품처럼 보이는 단백질 제품의 체크포인트',
    '일상 건강식품으로 들어온 단백질 트렌드'
  ];
  if (/(소비자물가|물가|소비\s*트렌드|가격\s*인상|밀키트|1인\s*가구)/i.test(text)) return [
    '물가지표 품목이 바뀌면 보이는 소비 변화',
    '밀키트와 간편식이 물가에 들어온 이유',
    '점심값 부담이 바꾼 소비 패턴',
    '가격 인상기에 사람들이 줄이는 지출',
    '요즘 소비를 보여주는 새 품목들'
  ];
  if (/교육.*AI|AI.*교육|학습\s*서비스/i.test(text)) return [
    'AI가 교실과 학습 서비스를 바꾸는 방식',
    'AI 학습 서비스에서 먼저 봐야 할 기준',
    '학생에게 좋은 AI와 위험한 AI의 차이',
    '교육 현장이 AI를 도구로 쓰기 시작한 이유',
    'AI 교육 콘텐츠가 달라지는 지점'
  ];
  return [];
}

function extractItems(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.trends)) return data.trends;
  if (Array.isArray(data?.candidates)) return data.candidates;
  const firstArray = Object.values(data ?? {}).find(Array.isArray);
  return firstArray ?? [];
}

function getEvidenceAdjustment(trend) {
  if (!hasCommunityEvidence(trend)) {
    const opportunity = trend.scoring?.opportunity ?? 0;
    const evidenceCount = trend.evidence?.length ?? 0;
    const searchBacked = trend.sources?.some((source) => source === 'Search SERP' || source === 'Google Trends');
    if (opportunity >= 30 && evidenceCount >= 3 && searchBacked) return 4;
    if (opportunity >= 24 && searchBacked) return 0;
    return -6;
  }
  const reaction = trend.scoring?.communityReaction ?? 0;
  if (reaction >= 16) return 6;
  if (reaction >= 8) return 3;
  return 0;
}

function getRiskWeight(trend) {
  if ((trend.scoring?.opportunity ?? 0) >= 30 && (trend.scoring?.cohesionPenalty ?? 0) === 0) return 0.16;
  return 0.22;
}

function getKeepAdjustment(ai) {
  return ai.keep === false ? -8 : 0;
}

function getCommunityPriority(trend) {
  let score = trend.scoring?.communityReaction ?? 0;
  if (hasCommunityEvidence(trend)) score += 20;
  if (trend.sources?.length && trend.sources.every((source) => source === 'Search SERP' || source === 'Google Trends')) score -= 24;
  return score;
}

function hasCommunityEvidence(trend) {
  return trend.sources?.some((source) => communitySources.has(source))
    || trend.evidence?.some((item) => communitySources.has(item.source));
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function compact(value, limit = 90) {
  const text = `${value ?? ''}`.replace(/\s+/g, ' ').trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function summarizeUsage(usage) {
  if (!usage) return undefined;
  return {
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    cachedTokens: usage.prompt_tokens_details?.cached_tokens
  };
}
