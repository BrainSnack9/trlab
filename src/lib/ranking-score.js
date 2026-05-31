import { lowIntentCuePattern, marketingCuePattern, riskPattern, sourceWeights, storyCuePattern, weakBareKeywordPattern, weakContentKeywordPattern } from './ranking-config';
import { cleanKeyword } from './ranking-text';
import {
  getBurstScore, getKeywordQualityScore, getRecencyScore, getRiskPenalty, getSeenCount,
  hasStoryContext, inferContentRisks, inferContentType, makeCardPlan, makeSuggestedTitle, parseMetric
} from './ranking-score-utils';

const strongAreas = ['tech', 'brand', 'economy', 'finance', 'shopping', 'travel', 'health', 'food', 'auto', 'education', 'local'];

export function scoreCandidate(candidate, area) {
  const sourceSet = getSourceSet(candidate);
  const sourceStrength = [...sourceSet].reduce((sum, source) => sum + (sourceWeights[source] ?? 6), 0);
  const traffic = Math.max(...candidate.signals.map((signal) => parseMetric(signal.metric)), 0);
  const recency = Math.max(...candidate.signals.map(getRecencyScore), 0);
  const burst = getBurstScore(candidate);
  const diversity = Math.min(22, sourceSet.size * 8);
  const repetition = Math.min(18, candidate.mentions * 2 + getSeenCount(candidate));
  const quality = getKeywordQualityScore(candidate.keyword, area);
  const story = getStoryScore(candidate);
  const intent = getMarketingIntentScore(candidate, area);
  const penalty = getRiskPenalty(candidate, area) + getThinTopicPenalty(candidate) + getLowIntentPenalty(candidate, area) + Math.max(0, candidate.bestPhraseRank - 1) * 2;
  const total = Math.max(1, Math.min(100, Math.round((sourceStrength + traffic + recency + burst + diversity + repetition + quality + story + intent - penalty) * 0.68)));
  return { total, sourceStrength, traffic, recency, burst, diversity, repetition, quality, story, intent, riskPenalty: penalty, search: 0, confidence: Math.min(99, 38 + diversity + Math.min(story, 24) + Math.min(quality, 20) + Math.min(intent, 12)) };
}

export function evaluateContentPotential(candidate, area, scoring) {
  const sourceSet = getSourceSet(candidate);
  const sourceCount = sourceSet.size;
  const sourceContext = sourceCount >= 2 ? 16 : sourceSet.has('Google Trends') ? 10 : 6;
  const visual = ['auto', 'fashion', 'beauty', 'food', 'travel', 'sports', 'game', 'home', 'culture'].includes(area.id) ? 13 : 8;
  const readable = hasStoryContext(candidate) ? 14 : 2;
  const score = Math.max(1, Math.min(100, Math.round(scoring.quality + scoring.story + sourceContext + visual + readable - scoring.riskPenalty)));
  const contentType = inferContentType(candidate.keyword, area);
  return { score, grade: score >= 82 ? 'A' : score >= 68 ? 'B' : score >= 52 ? 'C' : 'D', contentType, risks: inferContentRisks(candidate, area), suggestedTitle: makeSuggestedTitle(candidate.keyword, contentType), reason: sourceCount >= 2 ? '여러 채널에서 동시에 감지된 후보입니다.' : '단일 채널 후보라 검색 검증이 필요합니다.', cardPlan: makeCardPlan(candidate.keyword, contentType) };
}

export function evaluateProductionReadiness(candidate) {
  const areaId = candidate.area?.id ?? 'life';
  let score = 28;
  const reasons = [];
  if (candidate.crossCheck?.sourceCount >= 3) add(14, '3개 이상 출처에서 감지');
  else if (candidate.crossCheck?.sourceCount >= 2) add(10, '복수 출처 교차감지');
  if (candidate.searchVerification?.grade === '통과') add(12, 'Google/Naver 검증 통과');
  if (hasStoryContext(candidate)) add(24, '카드뉴스 각도로 쓸 문맥 존재');
  if (strongAreas.includes(areaId)) add(8, '정보형 콘텐츠 확장 가능');
  if (hasMarketingIntent(candidate, areaId)) add(14, '마케팅 콘텐츠 각도 존재');
  if (isLowIntentTopic(candidate, areaId)) add(-24, '순간 반응형이라 활용성 낮음');
  if (isWeakContentCandidate(candidate)) add(-34, '카드뉴스 문맥이 약한 단어 후보');
  else if (weakBareKeywordPattern.test(candidate.keyword) && !hasStoryContext(candidate)) add(-26, '키워드만으로는 기획 각도 약함');
  if (candidate.sources.length === 1) add(-10, '단일 출처');
  const finalScore = Math.max(1, Math.min(100, Math.round(score)));
  const tier = finalScore >= 82 ? '바로 제작' : finalScore >= 66 ? '검증 후 제작' : finalScore >= 50 ? '관찰' : '제외 후보';
  return { score: finalScore, tier, reasons: reasons.slice(0, 4), suggestedAngle: makeProductionAngle(candidate, tier) };
  function add(value, reason) { score += value; reasons.push(reason); }
}

export function isWeakContentCandidate(candidate) {
  const keyword = `${candidate.keyword ?? ''}`.trim();
  const titles = candidate.sampleTitles ?? [];
  const text = `${keyword} ${titles.join(' ')}`;
  if (/^[ㅋㅎㅠ]+$/.test(keyword)) return true;
  if (weakContentKeywordPattern.test(keyword) && !storyCuePattern.test(text)) return true;
  return keyword.length <= 4 && titles.every((title) => !storyCuePattern.test(title));
}

function getStoryScore(candidate) {
  let score = hasStoryContext(candidate) ? 22 : 0;
  if (candidate.sampleTitles.some((title) => /이유|방법|비교|정리|전망|선택|주의|반응/.test(title))) score += 8;
  if (candidate.keyword.includes(' ') || candidate.keyword.includes('·')) score += 6;
  return Math.min(34, score);
}

function getMarketingIntentScore(candidate, area) {
  const text = `${candidate.keyword} ${candidate.sampleTitles.join(' ')}`;
  let score = marketingCuePattern.test(text) ? 18 : 0;
  if (strongAreas.includes(area.id)) score += 8;
  const sourceSet = getSourceSet(candidate);
  if (sourceSet.has('Search SERP') || sourceSet.has('Google Trends')) score += 6;
  return Math.min(30, score);
}

function hasMarketingIntent(candidate, areaId) {
  return getMarketingIntentScore(candidate, { id: areaId }) >= 18;
}

function getLowIntentPenalty(candidate, area) {
  if (!isLowIntentTopic(candidate, area.id)) return 0;
  return area.id === 'sports' || area.id === 'entertainment' ? 22 : 14;
}

function isLowIntentTopic(candidate, areaId) {
  const text = `${candidate.keyword} ${candidate.sampleTitles.join(' ')}`;
  if (!lowIntentCuePattern.test(text)) return false;
  if (marketingCuePattern.test(text) && !/(ㅋㅋ|ㄷㄷ|명언|실시간)/.test(text)) return false;
  return ['sports', 'entertainment', 'life'].includes(areaId) || getSourceSet(candidate).size <= 2;
}

function getThinTopicPenalty(candidate) {
  if (!weakBareKeywordPattern.test(candidate.keyword)) return 0;
  return hasStoryContext(candidate) ? 8 : 28;
}

function makeProductionAngle(candidate, tier) {
  const title = candidate.sampleTitles.find((sample) => sample.length >= candidate.keyword.length + 8) ?? candidate.sampleTitles[0] ?? '';
  if (tier === '바로 제작') return `${cleanKeyword(title).slice(0, 46)} 관점으로 바로 기획 가능`;
  if (tier === '검증 후 제작') return `${candidate.keyword} 문맥과 검색 결과를 확인한 뒤 기획`;
  if (tier === '관찰') return `${candidate.keyword} 반복 감지 여부를 더 확인`;
  return '현재는 카드뉴스 소재로 약함';
}

function getSourceSet(candidate) {
  if (candidate.sourceSet instanceof Set) return candidate.sourceSet;
  return new Set(candidate.sources ?? []);
}
