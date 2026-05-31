import { generateAIJson, hasAIProvider } from './ai-providers';

import { politicsPattern } from './ranking-config';

export async function enrichTrendsWithAI(trends, options = {}) {
  const limit = Math.min(Number(options.limit ?? 8), trends.length);
  if (!hasAIProvider() || limit <= 0) return { trends, meta: { enabled: false, analyzed: 0 } };
  const targets = trends.slice(0, limit);
  try {
    const { provider, data } = await generateAIJson(buildPrompt(targets));
    const analysis = new Map((data.items ?? []).map((item) => [String(item.id), item]));
    const enriched = trends.map((trend) => applyAIAnalysis(trend, analysis.get(trend.id))).filter(isAIUsable);
    return { trends: enriched.sort(sortByAI).slice(0, limit), meta: { enabled: true, provider, analyzed: analysis.size } };
  } catch (error) {
    return { trends, meta: { enabled: false, analyzed: 0, error: error.message } };
  }
}

function applyAIAnalysis(trend, ai) {
  if (!ai) return trend;
  const score = clamp(ai.contentScore ?? trend.production?.score ?? trend.score, 1, 100);
  const risk = clamp(ai.riskScore ?? 20, 0, 100);
  const finalScore = clamp(Math.round(score - risk * 0.25), 1, 100);
  const tier = finalScore >= 82 ? '바로 제작' : finalScore >= 68 ? '검증 후 제작' : finalScore >= 52 ? '관찰' : '제외 후보';
  return {
    ...trend,
    keyword: ai.topic || trend.keyword,
    label: ai.topic || trend.label,
    score: Math.max(trend.score, finalScore),
    aiAnalysis: { ...ai, finalScore },
    validation: {
      ...trend.validation,
      grade: finalScore >= 82 ? 'A' : finalScore >= 68 ? 'B' : finalScore >= 52 ? 'C' : 'D',
      contentType: ai.contentType ?? trend.validation?.contentType,
      suggestedTitle: ai.recommendedTitle ?? trend.validation?.suggestedTitle,
      reason: ai.whyNow ?? trend.validation?.reason,
      risks: ai.risks ?? trend.validation?.risks,
      cardPlan: ai.cardPlan ?? trend.validation?.cardPlan
    },
    production: {
      ...(trend.production ?? {}),
      score: finalScore,
      tier,
      suggestedAngle: ai.angle ?? trend.production?.suggestedAngle,
      reasons: [ai.whyNow, ...(ai.risks ?? [])].filter(Boolean).slice(0, 4)
    }
  };
}

function sortByAI(a, b) {
  return (b.production?.score ?? 0) - (a.production?.score ?? 0) || (b.aiAnalysis?.contentScore ?? 0) - (a.aiAnalysis?.contentScore ?? 0) || b.score - a.score;
}

function isAIUsable(trend) {
  if (!trend.aiAnalysis) return (trend.production?.score ?? 0) >= 50;
  if ((trend.aiAnalysis.riskScore ?? 0) >= 70) return false;
  if ((trend.aiAnalysis.finalScore ?? 0) < 50) return false;
  const text = `${trend.keyword} ${trend.aiAnalysis.angle ?? ''}`;
  if (politicsPattern.test(`${text} ${trend.sampleTitles?.join(' ') ?? ''}`)) return false;
  return !/카드뉴스로\s*부적합|소재로\s*약함|맥락\s*부족|단순\s*키워드/.test(text);
}

function buildPrompt(trends) {
  return JSON.stringify({
    task: '아래 후보들을 카드뉴스 제작 관점으로 재평가하라. 단순 키워드는 원문 문맥을 이용해 구체적인 콘텐츠 주제로 바꿔라.',
    rules: [
      '정치, 성인, 루머, 명예훼손 위험은 riskScore를 높인다.',
      '마케팅 도구이므로 구매, 브랜드, 시장, 소비자 행동, 비용, 혜택, 방법, 비교, 변화가 있는 주제를 높게 평가한다.',
      '단순 선수명, 경기 반응, 밈, 커뮤니티 웃긴글은 contentScore를 낮게 준다.',
      '근거 제목이 약하면 억지로 바로 제작 후보로 만들지 말고 관찰 또는 제외로 판단한다.',
      'topic은 카드뉴스 제목이 아니라 레이더에 표시할 짧은 주제명이어야 한다.',
      '한국어 JSON만 반환한다.'
    ],
    schema: {
      items: [{
        id: 'candidate id',
        topic: '짧은 주제명',
        contentScore: '1-100',
        riskScore: '0-100',
        angle: '콘텐츠 각도 한 문장',
        whyNow: '왜 지금 볼 만한지',
        contentType: '해설형|리스트형|비교형|반응형|검증형',
        recommendedTitle: '카드뉴스 제목',
        cardPlan: ['5장 구성'],
        risks: ['검증 또는 표현 리스크']
      }]
    },
    candidates: trends.map(toPayload)
  });
}

function toPayload(trend) {
  return {
    id: trend.id,
    keyword: trend.keyword,
    category: trend.category,
    localScore: trend.production?.score ?? trend.score,
    sources: trend.sources,
    searchGrade: trend.searchVerification?.grade,
    sampleTitles: trend.sampleTitles?.slice(0, 4),
    evidence: trend.evidence?.slice(0, 4).map((item) => ({ source: item.source, title: item.title, metric: item.metric }))
  };
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}
