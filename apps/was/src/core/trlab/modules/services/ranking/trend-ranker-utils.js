import { broadKeywordPattern, incidentPattern, weakBareKeywordPattern } from './ranking-config.js';
import { cleanKeyword } from './ranking-text.js';

const weakStandaloneKeywordPattern = /^(사람입니다|풀었다는|따르면|밝혔다|했다는|한다는|썼던|했던|있는지|없나요|되나요)$/;

export function mergeRelatedCandidates(candidates) {
  const merged = [];
  [...candidates].sort((a, b) => b.mentions - a.mentions).forEach((candidate) => {
    const key = candidate.keyword.toLowerCase();
    const target = merged.find((item) => isRelated(item, candidate, key));
    if (!target) return merged.push(candidate);
    target.mentions += candidate.mentions;
    candidate.sourceSet.forEach((source) => target.sourceSet.add(source));
    target.signals.push(...candidate.signals);
    candidate.sampleTitles.forEach((title) => addUnique(target.sampleTitles, title, 20));
    if (!target.keyword.includes(' ') && candidate.keyword.length < target.keyword.length && candidate.keyword.length >= 3) target.keyword = candidate.keyword;
    target.bestPhraseRank = Math.min(target.bestPhraseRank, candidate.bestPhraseRank);
  });
  return merged;
}

export function limitDuplicateTitles(candidate, index, candidates) {
  const mainTitle = candidate.sampleTitles[0];
  if (!mainTitle) return true;
  if (candidate.channelFit?.bestProfile && /(품절|대란|아마존|틱톡|올영|스타벅스|콜드컵|K-?뷰티|구매|추천템|브랜드)/i.test(`${candidate.keyword} ${candidate.sampleTitles.join(' ')}`)) return true;
  const earlier = candidates.slice(0, index).filter((item) => item.sampleTitles.includes(mainTitle));
  return earlier.length === 0 || candidate.sources.length >= 2;
}

export function limitRelatedEvidence(candidate, index, candidates) {
  if (candidate.channelFit?.bestProfile && /(스타벅스\s*곰돌이|K-?뷰티|올영세일|틱톡발|일본 생활|일본 주부|구다이글로벌)/i.test(`${candidate.keyword ?? ''}`)) return true;
  const candidateEvidence = evidenceKeys(candidate);
  if (!candidateEvidence.size) return true;
  const earlier = candidates.slice(0, index);
  return !earlier.some((item) => overlapRatio(candidateEvidence, evidenceKeys(item)) >= 0.5 || isSameTheme(item, candidate));
}

export function isStrongFinalCandidate(candidate) {
  const text = `${candidate.keyword} ${candidate.sampleTitles.join(' ')}`;
  if (broadKeywordPattern.test(candidate.keyword)) return false;
  if (isEnglishSentenceCandidate(candidate)) return false;
  if (weakStandaloneKeywordPattern.test(candidate.keyword)) return false;
  if (isVagueModifierCandidate(candidate)) return false;
  if (isThinSearchSeedCandidate(candidate)) return false;
  if (/(네이버페이|캐시워크|포인트|적립|랜덤|눌러|라이브보고|\d+원)/i.test(text) && !/(가격|인상|인하|소비|구매|브랜드|시장)/i.test(text)) return false;
  if (incidentPattern.test(text) && !/(전략|시장|비교|가격|소비|브랜드|AI|반도체|전기차)/i.test(text)) return false;
  if (candidate.sources.length === 1 && incidentPattern.test(text)) return false;
  return true;
}

export function mergeFinalizedCandidates(candidates) {
  const map = new Map();
  candidates.forEach((candidate) => {
    const key = candidate.keyword.toLowerCase().replace(/\s+/g, '');
    const current = map.get(key);
    if (!current) return map.set(key, candidate);
    current.mentions += candidate.mentions;
    current.sources = [...new Set([...current.sources, ...candidate.sources])];
    current.sampleTitles = [...new Set([...current.sampleTitles, ...candidate.sampleTitles])].slice(0, 20);
    current.evidence = uniqueEvidence([...current.evidence, ...candidate.evidence]).slice(0, 30);
    current.score = Math.max(current.score, candidate.score);
    current.scoring.total = Math.max(current.scoring.total, candidate.scoring.total);
    current.crossCheck = { ...current.crossCheck, sourceCount: current.sources.length, repeated: current.mentions >= 2, label: current.sources.length >= 2 ? '복수 출처 교차감지' : '단일 출처 관찰' };
  });
  return [...map.values()];
}

function uniqueEvidence(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.source ?? ''}|${item.url ?? ''}|${item.title ?? ''}|${item.metric ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function refineKeyword(candidate) {
  const keyword = candidate.keyword;
  const title = candidate.sampleTitles.find((sample) => cleanKeyword(sample).length >= keyword.length + 10);
  if (!title) return keyword;
  const text = cleanKeyword(title);
  if (/top\s*10/i.test(keyword) && /라면|ramen/i.test(text) && /판매량|순위|랭킹|top\s*10/i.test(text)) return '한국 라면 판매량 Top10';
  if (/장모님.*환갑여행|환갑여행.*장모님|환갑.*여행.*가족/.test(text)) return '환갑여행 가족 갈등';
  if (/건강염려증.*배우자|배우자.*건강염려증/.test(text)) return '배우자 건강염려증 갈등';
  if (/영화할인쿠폰|영화.*할인쿠폰|쿠폰.*소진|225만장/.test(text)) return '정부 영화할인쿠폰 소진';
  if (/수도세.*90톤|90톤.*수도세|수도세.*폭탄/.test(text)) return '상가 수도세 폭탄 민원';
  if (/인간관계.*40대|40대.*인간관계|인간관계.*정리/.test(text)) return '40대 인간관계 리셋';
  if (/전기차.*둔화론|둔화론.*전기차|전기차.*캐즘|전동화/.test(text)) return '전기차 둔화론과 전동화 전망';
  if (/현대차|기아|전기차 전략|차량 구독|모빌리티|구독 서비스/.test(text)) return '현대차·기아 전기차·구독 전략';
  if (/네이버.*소버린 AI|소버린 AI|AI 인프라.*재평가/.test(text)) return '네이버 소버린 AI 인프라';
  if (/K-?뷰티|올리브영|화장품.*성분|성분.*소비/.test(text)) return 'K뷰티 성분 중심 소비';
  if (/호반그룹.*AI|생성형 AI.*업무|AI 실무 활용/.test(text)) return '기업 생성형 AI 업무 활용';
  if (/삼성SDS|LG CNS|AX 시장|기업 AI/.test(text)) return '기업 AX 시장 경쟁';
  if (!weakBareKeywordPattern.test(keyword)) return keyword;
  if (/삼성전자|하이닉스|반도체/i.test(text)) return '삼성전자·하이닉스 AI 반도체';
  if (/AI 수요|HBM|가속기|반도체.*전망|반도체.*실적/i.test(text)) return 'AI 반도체 수요 전망';
  if (/AI 검색|검색 노출|AEO|GEO|SEO|answer engine/i.test(text)) return 'AI 검색 노출 전략';
  if (/마카오|QR|결제|관광|네이버페이/i.test(text)) return keyword.includes('네이버') ? '네이버페이 해외 QR결제' : '마카오 QR결제 관광 작업';
  if (/페이즈|MSI/i.test(text)) return '페이즈 MSI 준비 발언';
  if (/MSI|T1|LCK/i.test(text)) return 'MSI 경기 관전 포인트';
  if (weakStandaloneKeywordPattern.test(keyword)) return cleanTitleTopic(text);
  const tokens = text.split(/\s+/).filter((token) => token.length >= 2 && !/^\d+$/.test(token) && !weakStandaloneKeywordPattern.test(token)).slice(0, 5);
  return tokens.includes(keyword) ? tokens.join(' ') : `${keyword} ${tokens.slice(0, 4).join(' ')}`.trim();
}

export function hash(value) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) result = (((result << 5) - result) + value.charCodeAt(index)) | 0;
  return Math.abs(result).toString(36);
}

function isRelated(item, candidate, key) {
  const itemKey = item.keyword.toLowerCase();
  const sameTitle = candidate.sampleTitles.some((title) => item.sampleTitles.includes(title));
  return itemKey === key || (sameTitle && itemKey.length >= 3 && key.length >= 3 && (itemKey.includes(key) || key.includes(itemKey)));
}

function evidenceKeys(candidate) {
  return new Set((candidate.evidence ?? candidate.signals ?? [])
    .map((item) => cleanKeyword(item.title ?? ''))
    .filter(Boolean));
}

function overlapRatio(a, b) {
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  a.forEach((value) => { if (b.has(value)) overlap += 1; });
  return overlap / Math.min(a.size, b.size);
}

function isSameTheme(a, b) {
  const left = `${a.keyword} ${a.sampleTitles?.join(' ') ?? ''}`;
  const right = `${b.keyword} ${b.sampleTitles?.join(' ') ?? ''}`;
  const themes = [
    /(현대차|기아|전기차|모빌리티|구독 서비스)/,
    /(K-?뷰티|화장품|올리브영|성분 중심)/,
    /(소버린 AI|네이버|AI 인프라)/,
    /(생성형 AI|AX|기업 AI|업무 활용)/
  ];
  return themes.some((pattern) => pattern.test(left) && pattern.test(right));
}

function addUnique(list, value, limit) {
  if (list.length < limit && !list.includes(value)) list.push(value);
}

function cleanTitleTopic(text) {
  const tokens = text.split(/\s+/)
    .filter((token) => token.length >= 2)
    .filter((token) => !/^\d+$/.test(token))
    .filter((token) => !weakStandaloneKeywordPattern.test(token))
    .filter((token) => !/(제가|진짜|그냥|어떻게|그리고|근데|이거|저거)$/.test(token));
  return tokens.slice(0, 4).join(' ') || text.slice(0, 18);
}

function isEnglishSentenceCandidate(candidate) {
  const keyword = `${candidate.keyword ?? ''}`.trim();
  if (!/^[a-z0-9\s-]+$/i.test(keyword) || !keyword.includes(' ')) return false;
  const words = keyword.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < 4) return false;
  return /^(i|we|you|they|he|she|asked|ask|generate|generated|make|made|using|with|about|average|users?)\b/i.test(keyword)
    || words.length >= 5;
}

function isVagueModifierCandidate(candidate) {
  const keyword = `${candidate.keyword ?? ''}`.trim();
  if (!keyword.includes(' ') && /^(난리난|난리|난리남|화제|화제의|분위기|반응|근황|대박|핫한|뜨는|인기|인기템|고급진|이국적인|차별받았어요|차별받음|받았어요|억울해요|하소연)$/i.test(keyword)) return true;
  if (/(받았어요|당했어요|억울해요|서러워요|하소연)$/i.test(keyword)) return true;
  if (keyword.length <= 4 && candidate.sampleTitles.every((title) => {
    const cleaned = cleanKeyword(title);
    return cleaned.length >= keyword.length + 8 && !new RegExp(`${escapeRegex(keyword)}\\s*(가격|할인|출시|지원금|비교|전망|체크|순위|신청|주의|선택|변화|전략|정리|분석|영향|비결|성장|인상|인하|예약|스펙|업데이트)`, 'i').test(cleaned);
  })) return true;
  return false;
}

function isThinSearchSeedCandidate(candidate) {
  if (candidate.sources.length !== 1 || !candidate.sources.includes('Search SERP')) return false;
  const keyword = `${candidate.keyword ?? ''}`.trim();
  const evidence = candidate.evidence ?? candidate.signals ?? [];
  if (!evidence.length) return false;
  const titles = evidence.map((item) => cleanKeyword(item.title ?? ''));
  const exactMetricMatches = evidence.filter((item) => cleanKeyword(item.metric ?? '').toLowerCase() === keyword.toLowerCase()).length;
  const allTitlesOnlyEchoSeed = titles.every((title) => {
    const lowerTitle = title.toLowerCase();
    const lowerKeyword = keyword.toLowerCase();
    return lowerTitle.includes(lowerKeyword) || title.length <= keyword.length + 14;
  });
  return exactMetricMatches >= Math.max(2, Math.ceil(evidence.length * 0.6))
    && allTitlesOnlyEchoSeed
    && !/(AI|K-?뷰티|반도체|지원금|품절|대란템|콜드컵|올리브영|올영|전기차|금리|환율|부동산|자동급식기|스킨케어|다이퍼|기저귀)/i.test(`${keyword} ${titles.join(' ')}`);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
