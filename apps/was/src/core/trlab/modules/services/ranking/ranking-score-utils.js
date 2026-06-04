import { contentOpportunityPattern, riskPattern, storyCuePattern } from './ranking-config.js';

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

export function getContentOpportunityScore(candidate, area) {
  const text = candidateText(candidate);
  let score = contentOpportunityPattern.test(text) ? 18 : 0;
  if (/(체크|비교|주의|전략|변화|시장|선택|비용|가격|신청|혜택|기준|확대|성장)/i.test(text)) score += 8;
  if (/(GLP-?1|위고비|마운자로|AI\s*검색|GEO|AEO|반려동물\s*진료비|표준수가|소비자물가|수면\s*영양제|건강기능식품|전기차|K-?뷰티|단백질\s*시장)/i.test(text)) score += 10;
  if (candidate.channelFit?.bestProfile) score += 6;
  if (['health', 'tech', 'economy', 'shopping', 'auto', 'beauty', 'travel', 'education', 'local', 'brand'].includes(area.id)) score += 4;
  if (/(선관위|교육감|대통령|정당|투표|개표|국회|후보)/i.test(text)) score -= 32;
  if (/(ㅋㅋ|ㄷㄷ|짤|근황|명언|뻘글|건강이상설|조롱|그 손가락)/i.test(text)) score -= 22;
  return Math.max(0, Math.min(36, score));
}

export function getEvidenceCohesionPenalty(candidate) {
  const keyword = `${candidate.keyword ?? ''}`.trim();
  const signals = candidate.signals ?? [];
  if (signals.length <= 2) return 0;
  const text = candidateText(candidate);
  if (/(AI\s*검색|GEO|AEO|검색\s*노출)/i.test(keyword)) return weakThemePenalty(signals, /(AI\s*검색|검색\s*노출|브랜드\s*노출|GEO|AEO|SEO|answer\s*engine)/i);
  if (/(AI\s*장난감|AI\s*펫|펫가젯|인형)/i.test(keyword)) return weakThemePenalty(signals, /(AI|인공지능).*(장난감|인형|toy|펫|pet|반려)|(장난감|인형|toy|펫|pet|반려).*(AI|인공지능)/i);
  if (/(GLP-?1|유지어터|비만치료제)/i.test(keyword)) return weakThemePenalty(signals, /(GLP-?1|위고비|마운자로|비만치료제|유지어터|체중|다이어트)/i);
  if (/(반려동물.*진료비|표준수가|병원비)/i.test(keyword)) return weakThemePenalty(signals, /(반려|펫|강아지|고양이|동물병원).*(진료비|병원비|표준수가|보험)|(진료비|병원비|표준수가|보험).*(반려|펫|강아지|고양이|동물병원)/i);

  const terms = keywordTerms(keyword);
  if (!terms.length) return 0;
  const matched = signals.filter((signal) => terms.some((term) => signalText(signal).toLowerCase().includes(term))).length;
  const ratio = matched / signals.length;
  const metricCount = new Set(signals.map((signal) => `${signal.metric ?? ''}`.trim()).filter(Boolean)).size;
  let penalty = 0;
  if (ratio < 0.35 && metricCount >= 4) penalty += 18;
  if (ratio < 0.2 && signals.length >= 6) penalty += 16;
  if (/^(AI|LG전자|삼성전자|네이버|브랜드|기업|시장)$/i.test(keyword) && metricCount >= 3) penalty += 16;
  if (/(그 손가락|빤스런|ㅋㅋ|ㄷㄷ|짤|뻘글)/i.test(text)) penalty += 18;
  return Math.min(42, penalty);
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

function weakThemePenalty(signals, pattern) {
  const matched = signals.filter((signal) => pattern.test(signalText(signal))).length;
  const ratio = signals.length ? matched / signals.length : 1;
  if (ratio >= 0.7) return 0;
  if (ratio >= 0.45) return 12;
  return 28;
}

function keywordTerms(keyword) {
  return `${keyword ?? ''}`.toLowerCase()
    .split(/\s+|·|-|\/|,|\(|\)/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
    .filter((term) => !/^(ai|lg|tv|vs|x|the|and|시장|전략|변화|비교|주의|체크|효과|기준|뉴스)$/.test(term));
}

function signalText(signal) {
  return `${signal.title ?? ''} ${signal.summary ?? ''} ${signal.metric ?? ''}`;
}

function candidateText(candidate) {
  return `${candidate.keyword ?? ''} ${(candidate.sampleTitles ?? []).join(' ')} ${(candidate.signals ?? []).map(signalText).join(' ')}`;
}
