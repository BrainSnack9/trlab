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
          topic: { type: 'string' },
          contentScore: { type: 'integer', minimum: 1, maximum: 100 },
          riskScore: { type: 'integer', minimum: 0, maximum: 100 },
          angle: { type: 'string' },
          whyNow: { type: 'string' },
          contentType: { type: 'string', enum: ['해설형', '리스트형', '비교형', '반응형', '검증형', '체크리스트형'] },
          contentIdeas: { type: 'array', items: { type: 'string' } },
          risks: { type: 'array', items: { type: 'string' } }
        },
        required: ['id', 'topic', 'contentScore', 'riskScore', 'angle', 'whyNow', 'contentType', 'contentIdeas', 'risks']
      }
    }
  },
  required: ['items']
};

export async function enrichTrendsWithAI(trends, options = {}) {
  const limit = Math.min(Number(options.limit ?? 8), trends.length);
  if (!hasAIProvider() || limit <= 0) return { trends: trends.map(ensureContentIdeasContract), meta: { enabled: false, analyzed: 0 } };
  const targets = trends.slice(0, limit);
  try {
    const prompt = buildPrompt(targets);
    const { provider, data, meta: providerMeta } = await generateAIJson(prompt, {
      schema: trendAnalysisSchema,
      schemaName: 'trend_analysis',
      promptCacheKey: 'trlab_trend_analysis_v3_content_ideas'
    });
    const items = completeMissingItems(targets, extractItems(data));
    const analysis = new Map(items.filter((item) => item?.id).map((item) => [String(item.id), item]));
    let analyzed = 0;
    const enriched = trends.map((trend, index) => {
      const ai = analysis.get(trend.id) ?? (index < targets.length ? items[index] : null);
      if (ai) analyzed += 1;
      return applyAIAnalysis(trend, ai);
    }).map(ensureContentIdeasContract).filter(isAIUsable);
    return { trends: enriched.sort(sortByAI), meta: { enabled: true, provider, analyzed, model: providerMeta?.model, usage: summarizeUsage(providerMeta?.usage), promptChars: prompt.length } };
  } catch (error) {
    return { trends: trends.map(ensureContentIdeasContract), meta: { enabled: false, analyzed: 0, error: error.message } };
  }
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
  const score = clamp(ai.contentScore ?? trend.production?.score ?? trend.score, 1, 100);
  const risk = clamp(ai.riskScore ?? 20, 0, 100);
  const finalScore = clamp(Math.round(score - risk * 0.25 + getCommunityAdjustment(trend)), 1, 100);
  const tier = finalScore >= 82 ? '바로 제작' : finalScore >= 68 ? '검증 후 제작' : finalScore >= 52 ? '관찰' : '제외 후보';
  const contentIdeas = normalizeContentIdeas(ai.contentIdeas ?? ai.cardPlan, ai.topic || trend.keyword, trend);
  return {
    ...trend,
    keyword: ai.topic || trend.keyword,
    label: ai.topic || trend.label,
    score: Math.max(trend.score, finalScore),
    aiAnalysis: { ...ai, contentIdeas, finalScore },
    contentIdeas,
    validation: {
      ...trend.validation,
      grade: finalScore >= 82 ? 'A' : finalScore >= 68 ? 'B' : finalScore >= 52 ? 'C' : 'D',
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
    task: 'Evaluate trend keyword candidates and generate content title ideas only. Return concise JSON matching the schema.',
    goal: 'Validate whether each keyword is worth exploring, then create diverse card-news title candidates. Do not make card-by-card plans here.',
    rules: [
      'topic은 원래 트렌드 키워드의 핵심 명사구를 유지한 짧은 한국어 키워드.',
      'contentIdeas는 사용자가 다음 단계에서 고를 콘텐츠 제목 후보 4~6개.',
      'contentIdeas는 키워드에서 확장한 제목만 쓴다. 카드 순서, 장별 구성, 본문 요약을 쓰지 않는다.',
      '예: 키워드가 여름휴가라면 여름휴가지 추천, 여름휴가 비용 계산, 휴가철 조심할 질병처럼 서로 다른 각도의 제목.',
      '검색 근거는 키워드 적절성 판단에만 사용하고, 그 기사 내용을 그대로 카드뉴스로 만들지 않는다.',
      'contentScore는 키워드 확장성, 제목 다양성, 검색 검증 가능성, 저장/공유 가능성 기준.',
      'riskScore는 루머, 정치/성인, 법적 위험, 과장, 좁은 소재, 근거 부족 기준.',
      '근거를 invent하지 말고 제공된 titles/evidence만 사용.',
      '문장은 짧게.'
    ],
    candidates: trends.map(toPayload)
  });
}

function toPayload(trend) {
  return {
    id: trend.id,
    keyword: trend.keyword,
    category: trend.category,
    localScore: trend.production?.score ?? trend.score,
    profile: trend.channelFit?.bestProfile?.label,
    sources: trend.sources,
    titles: (trend.sampleTitles ?? []).slice(0, 2).map(compact),
    evidence: (trend.evidence ?? []).slice(0, 2).map((item) => ({ source: item.source, title: compact(item.title), metric: compact(item.metric, 40) }))
  };
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
    .filter((item) => !/(첫\s*번째|두\s*번째|세\s*번째|장면|페이지|카드뉴스\s*구성|카드\s*순서)/i.test(item));
  const unique = [...new Set(cleaned)];
  return (unique.length >= 3 ? unique : [...unique, ...fallbackContentIdeas({ ...trend, keyword: topic })])
    .filter(Boolean)
    .slice(0, 6);
}

function fallbackContentIdeas(trend = {}) {
  const keyword = compact(trend.keyword ?? trend.label ?? '이 키워드', 18);
  return [
    `${keyword} 왜 지금 뜰까`,
    `${keyword} 저장용 체크리스트`,
    `${keyword} 비용과 기준 비교`,
    `${keyword} 조심해야 할 포인트`,
    `${keyword} 추천과 비추천 기준`
  ];
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

function getCommunityAdjustment(trend) {
  if (!hasCommunityEvidence(trend)) return -14;
  const reaction = trend.scoring?.communityReaction ?? 0;
  if (reaction >= 16) return 6;
  if (reaction >= 8) return 3;
  return 0;
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
