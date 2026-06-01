import { generateAIJson, hasAIProvider } from './ai-providers.js';

import { broadKeywordPattern, incidentPattern, politicsPattern } from '#trlab/modules/services/ranking/ranking-config';

const communitySources = new Set(['FMKorea', 'TheQoo', 'Nate Pann', 'DCInside', 'Ruliweb', 'BobaeDream', 'MLBPark', 'Clien', 'Reddit']);

export async function enrichTrendsWithAI(trends, options = {}) {
  const limit = Math.min(Number(options.limit ?? 8), trends.length);
  if (!hasAIProvider() || limit <= 0) return { trends, meta: { enabled: false, analyzed: 0 } };
  const targets = trends.slice(0, limit);
  try {
    const { provider, data } = await generateAIJson(buildPrompt(targets));
    const items = await completeMissingItems(targets, extractItems(data));
    const analysis = new Map(items.filter((item) => item?.id).map((item) => [String(item.id), item]));
    let analyzed = 0;
    const enriched = trends.map((trend, index) => {
      const ai = analysis.get(trend.id) ?? (index < targets.length ? items[index] : null);
      if (ai) analyzed += 1;
      return applyAIAnalysis(trend, ai);
    }).filter(isAIUsable);
    return { trends: enriched.sort(sortByAI).slice(0, limit), meta: { enabled: true, provider, analyzed } };
  } catch (error) {
    return { trends, meta: { enabled: false, analyzed: 0, error: error.message } };
  }
}

async function completeMissingItems(targets, items) {
  const current = [...items];
  if (current.length >= targets.length) return current;
  const byId = new Set(current.map((item) => item?.id).filter(Boolean).map(String));
  const missing = targets.filter((trend, index) => !byId.has(trend.id) && index >= current.length);
  if (!missing.length) return current;
  try {
    const { data } = await generateAIJson(buildPrompt(missing));
    current.push(...extractItems(data));
  } catch {
    return current;
  }
  return current;
}

function applyAIAnalysis(trend, ai) {
  if (!ai) return trend;
  const score = clamp(ai.contentScore ?? trend.production?.score ?? trend.score, 1, 100);
  const risk = clamp(ai.riskScore ?? 20, 0, 100);
  const finalScore = clamp(Math.round(score - risk * 0.25 + getCommunityAdjustment(trend)), 1, 100);
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
  if (strongCommunitySignal && (trend.aiAnalysis.riskScore ?? 0) < 80 && !politicsPattern.test(sourceText)) return true;
  if ((trend.aiAnalysis.riskScore ?? 0) >= 70) return false;
  if ((trend.aiAnalysis.finalScore ?? 0) < 50) return false;
  if (broadKeywordPattern.test(trend.keyword)) return false;
  if (incidentPattern.test(sourceText) && (trend.aiAnalysis.riskScore ?? 0) >= 45) return false;
  if (politicsPattern.test(sourceText)) return false;
  return !/카드뉴스로\s*부적합|소재로\s*약함|맥락\s*부족|단순\s*키워드/.test(text);
}

function buildPrompt(trends) {
  return JSON.stringify({
    task: '아래 후보들을 매일 아침 발행할 한국어 트렌드 콘텐츠 관점으로 기획하라. 목표는 먼저 마케팅 채널을 성장시키고, 장기적으로 해당 주제와 연관된 아이템/서비스/디지털 상품 판매로 이어질 수 있는 콘텐츠 자산을 쌓는 것이다. 원신호를 그대로 판정하지 말고, 비교 대상/근거/그래프/시장 맥락을 붙여 많은 사용자가 저장하거나 공유할 만한 주제로 확장하라.',
    businessGoal: [
      '단기 목표: 저장, 공유, 팔로우, 재방문을 만들 수 있는 채널 성장형 콘텐츠 발굴',
      '중기 목표: 특정 카테고리에서 신뢰와 전문성을 쌓아 반복 구독/조회가 가능한 콘텐츠 시리즈화',
      '장기 목표: 트렌드와 연결된 상품, 서비스, 리포트, 템플릿, 교육, 제휴 아이템 판매 가능성 탐색'
    ],
    audience: [
      '브랜드/마케팅 실무자',
      '콘텐츠 기획자와 SNS 운영자',
      '소상공인, 스타트업, 교육/커머스/로컬 비즈니스 운영자',
      '트렌드를 빠르게 이해하고 오늘 실행할 아이디어가 필요한 일반 사용자'
    ],
    rules: [
      '좋은 아침 트렌드는 새로움, 대중성, 이야기성, 비교 가능성, 근거화 가능성을 동시에 가져야 한다.',
      'contentScore는 원신호 자체보다 콘텐츠로 확장했을 때의 재미, 이해 쉬움, 저장/공유 가능성, 근거 제시 가능성을 반영한다.',
      '주제는 단순 조회수보다 채널 자산이 되는지를 본다. 반복 시리즈화, 후속 콘텐츠, 리드 수집, 상품/서비스 연결 가능성이 있으면 높게 평가한다.',
      '판매 가능성은 노골적인 광고가 아니라 자연스러운 다음 단계여야 한다. 예: 부동산 데이터 리포트, 지역 비교 대시보드, 화장품 성분 비교표, 구매 가이드, 체크리스트, 템플릿, 강의, 컨설팅, 제휴 상품.',
      '먼저 “이 주제를 어떻게 키우면 채널 성장에 도움이 되는가”를 생각한다. 단순 키워드라도 비교, 순위, 변화율, 전후 차이, 해외 사례, 세대/지역/가격대 차이로 확장할 수 있으면 살린다.',
      '예: 강남 부동산 과열 신호는 홍콩, 도쿄, 뉴욕, 싱가포르 등과 가격/소득 대비/상승률을 비교하는 그래프형 콘텐츠로 확장한다.',
      '예: 화장품 신호는 경쟁 제품, 성분, 가격대, 검색량, 리뷰 키워드, 세대별 선호를 비교해 “요즘 왜 이 제품군이 뜨는가”로 확장한다.',
      '예: 음식, 여행, 교육, AI 도구, 로컬 상권, 커머스 신호도 비교 대상과 지표를 붙여 대중이 이해하기 쉬운 콘텐츠로 만든다.',
      '높게 평가할 주제: 소비자 행동 변화, 구매 이유, 가격/혜택 민감도, 브랜드 전략, 플랫폼 변화, 로컬 상권, 교육/커리어, AI/도구 활용, 커뮤니티 반응이 시장 신호로 해석되는 경우.',
      '낮게 평가할 주제: 비교/근거/설명으로 확장하기 어려운 단순 인물명, 경기 결과 반응, 밈만 있는 글, 맥락 없는 커뮤니티 웃긴글, 자극적 사건, 정치/성인/루머/명예훼손 위험.',
      '커뮤니티 반응이라도 소비자 심리, 가격 인식, 불편/욕구, 구매 장벽, 브랜드 호감 변화로 번역할 수 있으면 주제로 살린다.',
      '근거 제목이 약해도 비교 가능한 공개 지표나 추가 검색으로 보강할 수 있으면 “검증 후 제작”으로 둔다. 아예 확장 각도가 없을 때만 관찰 또는 제외로 판단한다.',
      'topic은 카드뉴스 제목이 아니라 레이더에 표시할 짧은 주제명이어야 하며, 추상 키워드가 아니라 구체적인 변화/현상을 담아야 한다.',
      'recommendedTitle은 사용자가 아침에 보고 클릭할 만한 제목이어야 하지만 과장, 공포 조장, 확정적 단정은 피한다.',
      'angle은 “이 신호를 어떤 비교/근거/그래프로 풀면 사람들이 납득하고 공유할까”를 한 문장으로 제시한다.',
      'whyNow는 오늘 또는 이번 주에 볼 이유를 근거 기반으로 설명한다.',
      'riskScore는 법적/평판/검증 리스크뿐 아니라 소재 피로도, 너무 좁은 관심사, 재탕 가능성도 반영한다.',
      '한국어 JSON만 반환하고, 후보마다 반드시 하나의 items 원소를 반환한다.'
    ],
    scoringGuide: {
      contentScore: {
        '90-100': '오늘 바로 발행할 만한 강한 시장 신호. 대중성, 실무 활용성, 후킹, 근거가 모두 좋다.',
        '75-89': '검증 후 발행 가치가 높다. 각도나 근거 보강이 있으면 좋다.',
        '55-74': '관찰 가치가 있으나 아직 소재가 좁거나 근거가 약하다.',
        '1-54': '브리핑 소재로 약하거나 사용자 만족도가 낮다.'
      },
      riskScore: {
        '0-29': '표현과 검증 리스크가 낮다.',
        '30-59': '제목/표현/근거 보강이 필요하다.',
        '60-100': '루머, 명예훼손, 정치/성인, 과장, 매우 좁은 관심사 등으로 발행 위험이 높다.'
      }
    },
    schema: {
      items: [{
        id: 'candidate id',
        topic: '레이더에 표시할 짧고 구체적인 주제명',
        contentScore: '1-100',
        riskScore: '0-100',
        audienceFit: '누가 이 주제에 만족할지',
        insight: '사용자가 가져갈 핵심 인사이트',
        angle: '비교/근거/그래프로 확장하는 콘텐츠 각도 한 문장',
        whyNow: '왜 오늘 또는 이번 주에 볼 만한지',
        evidenceStrength: '강함|보통|약함',
        channelGrowthFit: '팔로우/저장/공유/재방문을 만들 수 있는 이유',
        monetizationPath: '추후 연결 가능한 아이템/서비스/디지털 상품 또는 제휴 방향',
        comparisonTargets: ['비교하면 좋은 지역/브랜드/제품/세대/가격대/플랫폼'],
        dataPoints: ['그래프나 표로 만들 수 있는 근거 지표'],
        chartIdea: '카드뉴스에 넣을 그래프/표/랭킹 아이디어',
        shareTrigger: '사용자가 저장하거나 공유할 이유',
        contentType: '해설형|리스트형|비교형|반응형|검증형|체크리스트형',
        recommendedTitle: '아침 브리핑용 카드뉴스 제목',
        openingHook: '첫 장에 쓸 한 문장 후킹',
        cardPlan: ['5장 구성. 각 장은 한 문장으로'],
        actionIdeas: ['실무자가 오늘 해볼 수 있는 실행 아이디어 1-3개'],
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
