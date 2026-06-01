import { riskPattern, storyCuePattern } from './ranking-config.js';

const communitySources = new Set(['FMKorea', 'TheQoo', 'Nate Pann', 'DCInside', 'Ruliweb', 'BobaeDream', 'MLBPark', 'Clien', 'Reddit']);

export function hasStoryContext(candidate) {
  const text = `${candidate.keyword} ${candidate.sampleTitles.join(' ')}`;
  return storyCuePattern.test(text) || candidate.sampleTitles.some((title) => title.length >= candidate.keyword.length + 12);
}

export function getBurstScore(candidate) {
  const times = candidate.signals.map((signal) => Date.parse(signal.firstSeenAt ?? signal.collectedAt ?? signal.lastSeenAt ?? '')).filter(Number.isFinite);
  const hours = times.length ? (Date.now() - Math.max(...times)) / 36e5 : 999;
  return Math.min(22, (candidate.sourceSet.has('Google Trends') ? 8 : 0) + Math.min(getSeenCount(candidate), 5) * 2 + (hours <= 6 ? 9 : hours <= 24 ? 6 : 2));
}

export function getSeenCount(candidate) {
  return candidate.signals.reduce((sum, signal) => sum + Number(signal.seenCount ?? 1), 0);
}

export function getCommunityReactionScore(candidate) {
  const signals = candidate.signals.filter((signal) => communitySources.has(signal.source));
  if (!signals.length) return 0;
  const score = signals.reduce((sum, signal) => {
    const text = `${signal.metric ?? ''} ${signal.summary ?? ''}`;
    const comments = extractMetric(text, /댓글\s*([\d,]+)/i);
    const votes = extractMetric(text, /추천\s*([\d,]+)/i);
    const views = extractMetric(text, /조회(?:수)?\s*([\d,]+)/i);
    return sum + getSectionReactionBoost(text) + Math.min(16, comments / 8) + Math.min(14, votes / 20) + Math.min(10, views / 10000);
  }, 0);
  return Math.min(26, Math.round(score + Math.min(6, signals.length * 1.5)));
}

export function getRecencyScore(signal) {
  const time = Date.parse(signal.lastSeenAt ?? signal.collectedAt ?? '');
  if (!Number.isFinite(time)) return 3;
  const hours = (Date.now() - time) / 36e5;
  return hours <= 1 ? 14 : hours <= 6 ? 10 : hours <= 24 ? 7 : hours <= 72 ? 4 : 1;
}

export function getKeywordQualityScore(keyword, area) {
  const words = keyword.split(/\s+/).filter(Boolean);
  let score = 8 + (words.length === 1 && keyword.length >= 3 ? 6 : 0) + (words.length === 2 ? 14 : 0) + (words.length >= 3 ? 10 : 0);
  if (/[A-Za-z0-9]/.test(keyword)) score += 3;
  if (area.id !== 'life') score += 5;
  if (keyword.length > 22) score -= 4;
  return Math.max(0, Math.min(28, score));
}

export function getRiskPenalty(candidate, area) {
  let penalty = riskPattern.test(`${candidate.keyword} ${candidate.sampleTitles.join(' ')}`) ? 24 : 0;
  if (candidate.sourceSet.size === 1 && !candidate.sourceSet.has('Google Trends')) penalty += 8;
  if (['incident', 'controversy', 'adult', 'politics'].includes(area.id)) penalty += 30;
  return penalty;
}

export function inferContentType(keyword, area) {
  if (/(AI|반도체|주가|비트코인|금리|지원금)/i.test(keyword)) return '해설형';
  if (['auto', 'fashion', 'beauty', 'food', 'travel', 'shopping'].includes(area.id)) return '리스트형';
  if (area.id === 'entertainment') return '반응형';
  return '검증형';
}

export function inferContentRisks(candidate, area) {
  const risks = [];
  if (candidate.sourceSet.size === 1) risks.push('단일 출처');
  if (!hasStoryContext(candidate)) risks.push('문맥 부족');
  if (area.id === 'life') risks.push('맥락 확인 필요');
  return risks.length ? risks : ['낮음'];
}

export function makeSuggestedTitle(keyword, type) {
  if (type === '해설형') return `${keyword}, 왜 지금 다시 주목받나`;
  if (type === '반응형') return `${keyword}, 사람들이 반응한 포인트`;
  if (type === '리스트형') return `${keyword} 체크포인트 5가지`;
  return `${keyword} 이슈, 카드뉴스로 만들기 전 확인할 것`;
}

export function makeCardPlan(keyword, type) {
  if (type === '해설형') return [`${keyword}가 보이는 이유`, '핵심 배경 3가지', '숫자와 근거', '주의할 지점', '마지막 체크포인트'];
  return [`${keyword} 한눈에 보기`, '체크할 기준', '좋은 점과 아쉬운 점', '실행 팁', '저장용 요약'];
}

export function parseMetric(value) {
  const number = Number(`${value ?? ''}`.replace(/[^\d.]/g, ''));
  if (!Number.isFinite(number)) return 0;
  return /만/.test(value) ? Math.min(22, number / 5) : Math.min(16, number / 1000);
}

function extractMetric(value, pattern) {
  const match = `${value ?? ''}`.match(pattern);
  return match ? Number(match[1].replace(/,/g, '')) : 0;
}

function getSectionReactionBoost(value) {
  const text = `${value ?? ''}`;
  if (/최다댓글|댓글순/i.test(text)) return 12;
  if (/최다추천|추천순/i.test(text)) return 12;
  if (/최고조회|조회순|최다 조회/i.test(text)) return 10;
  if (/베스트|HOT|오늘의 톡|톡커들의 선택|포텐|실베|랭킹/i.test(text)) return 6;
  return 0;
}
