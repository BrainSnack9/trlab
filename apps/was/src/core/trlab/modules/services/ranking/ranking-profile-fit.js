import { getChannelProfiles } from '#trlab/modules/services/channel-profiles/channel-profiles';

const scoreKeys = ['growthPotential', 'contentExpandability', 'aiProductionEase', 'adValue', 'groupBuyFit', 'brandExtensionFit'];
const commercePattern = /품절|대란|급상승|많이\s*사|구매|매출|아마존|틱톡|브랜드|용품|장난감|간식|지원금|보험|sold\s*out|viral|amazon|tiktok|product|gear/i;
const weakStrategyTermPattern = /^(있을|것|정보|기준|사용자|콘텐츠|인스타|바로|저장|검색|근거|제목|후보|확장|가능|계정|타깃|이해|검증|선택|다음|단계|고를|공유|비교|전환|체크리스트|랭킹|주의|추천|정리)$/;
const weakProfileKeywordPattern = /^(브랜드|구매|제품|상품|가격|비교|공유|전환|시장|소비|트렌드)$/i;

const profileTopicGates = {
  pet: {
    topic: /강아지|고양이|반려|펫|pet|dog|cat|집사|산책/i
  },
  parenting: {
    topic: /육아|출산|임신|어린이|어린이집|유치원|아기|신생아|부모|엄마|아빠|아이|키즈|등원|돌봄|초등|가족/i
  },
  'us-consumer': {
    keyword: /미국|해외|아마존|amazon|틱톡|tiktok|costco|target|품절|대란|대란템|바이럴|viral|sold\s*out|K-?뷰티|올리브영|올영|스타벅스|콜드컵|추천템|쇼핑|화장품|뷰티|스킨케어|일본\s*(?:품절|쇼핑|추천템|편의점|신상|생활)|중국\s*(?:라이브커머스|많이\s*팔린|대박\s*상품)/i,
    topic: /미국|해외|아마존|amazon|틱톡|tiktok|costco|target|품절|대란|대란템|viral|sold\s*out|K-?뷰티|올리브영|올영|스타벅스|콜드컵|추천템|쇼핑|화장품|뷰티|스킨케어|일본\s*(?:품절|쇼핑|추천템|편의점|신상|생활)|중국\s*(?:라이브커머스|많이\s*팔린|대박\s*상품)/i
  }
};

export async function getRankingProfiles() {
  return getChannelProfiles({ enabledOnly: true });
}

export function getChannelProfileFit(candidate, profiles = []) {
  const topicText = `${candidate.keyword ?? ''} ${(candidate.sampleTitles ?? []).join(' ')}`;
  const evidenceText = `${topicText} ${(candidate.signals ?? []).map((signal) => `${signal.title ?? ''} ${signal.summary ?? ''} ${signal.metric ?? ''}`).join(' ')}`;
  const context = {
    keywordText: `${candidate.keyword ?? ''}`,
    topicText,
    evidenceText,
    areaId: candidate.area?.id ?? ''
  };
  const fits = profiles.map((profile) => scoreProfile(profile, context)).filter((profile) => profile.score > 0).sort((a, b) => b.score - a.score);
  const best = fits[0] ?? null;
  return {
    bestProfile: best ? { id: best.id, label: best.label, score: best.score } : null,
    profiles: fits.slice(0, 3),
    scores: best?.scores ?? emptyScores()
  };
}

function scoreProfile(profile, context) {
  const { evidenceText: text, keywordText, topicText } = context;
  const keywordHits = (profile.keywords ?? []).filter((keyword) => includes(text, keyword));
  const seedHits = (profile.seeds ?? []).filter((seed) => includes(text, seed));
  const strategyHits = strategyTerms(profile).filter((keyword) => includes(text, keyword));
  const avoidHits = (profile.strategy?.avoidKeywords ?? []).filter((keyword) => includes(text, keyword));
  const qualifyingKeywordHits = keywordHits.filter((keyword) => isQualifyingProfileKeyword(profile.id, keyword));
  if (avoidHits.length) return { id: profile.id, label: profile.label, score: 0, scores: emptyScores(), matched: [], avoid: avoidHits.slice(0, 5) };
  if (!passesProfileTopicGate(profile.id, { keywordText, topicText })) {
    return { id: profile.id, label: profile.label, score: 0, scores: emptyScores(), matched: [] };
  }
  if (!qualifyingKeywordHits.length && !seedHits.length) return { id: profile.id, label: profile.label, score: 0, scores: emptyScores(), matched: [] };
  const base = profile.scoring ?? {};
  const matchBoost = Math.min(28, qualifyingKeywordHits.length * 6 + seedHits.length * 4 + Math.min(strategyHits.length, 2));
  const commerceBoost = commercePattern.test(text) ? 6 : 0;
  const scores = Object.fromEntries(scoreKeys.map((key) => [key, clamp((base[key] ?? 12) + matchBoost + commerceBoost, 1, 100)]));
  const score = Math.round(Object.values(scores).reduce((sum, value) => sum + value, 0) / scoreKeys.length);
  return { id: profile.id, label: profile.label, score, scores, matched: [...qualifyingKeywordHits, ...seedHits, ...strategyHits].slice(0, 10) };
}

function passesProfileTopicGate(profileId, { keywordText, topicText }) {
  const gate = profileTopicGates[profileId];
  if (!gate) return true;
  if (gate.keyword?.test(keywordText)) return true;
  return Boolean(gate.topic?.test(topicText) && profileId !== 'us-consumer');
}

function isQualifyingProfileKeyword(profileId, keyword) {
  const value = `${keyword ?? ''}`.trim();
  if (!value) return false;
  if (profileId === 'us-consumer' && weakProfileKeywordPattern.test(value)) return false;
  return true;
}

function strategyTerms(profile) {
  const strategy = profile.strategy ?? {};
  return [
    ...(strategy.goals ?? []),
    ...(strategy.preferredFormats ?? []),
    ...(strategy.decisionRules ?? [])
  ]
    .flatMap((value) => `${value ?? ''}`.split(/\s+|\/|,|·/))
    .map((value) => value.replace(/형$/, '').trim())
    .filter((value) => value.length >= 2)
    .filter((value) => !weakStrategyTermPattern.test(value));
}

function emptyScores() {
  return Object.fromEntries(scoreKeys.map((key) => [key, 0]));
}

function includes(text, keyword) {
  return `${text ?? ''}`.toLowerCase().includes(`${keyword ?? ''}`.toLowerCase());
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}
