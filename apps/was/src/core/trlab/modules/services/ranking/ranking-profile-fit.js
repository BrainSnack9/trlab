import { getChannelProfiles } from '#trlab/modules/services/channel-profiles/channel-profiles';

const scoreKeys = ['growthPotential', 'contentExpandability', 'aiProductionEase', 'adValue', 'groupBuyFit', 'brandExtensionFit'];
const commercePattern = /품절|대란|급상승|많이\s*사|구매|매출|아마존|틱톡|브랜드|용품|장난감|간식|지원금|보험|sold\s*out|viral|amazon|tiktok|product|gear/i;

export async function getRankingProfiles() {
  return getChannelProfiles({ enabledOnly: true });
}

export function getChannelProfileFit(candidate, profiles = []) {
  const text = `${candidate.keyword ?? ''} ${(candidate.sampleTitles ?? []).join(' ')} ${(candidate.signals ?? []).map((signal) => `${signal.title ?? ''} ${signal.summary ?? ''} ${signal.metric ?? ''}`).join(' ')}`;
  const fits = profiles.map((profile) => scoreProfile(profile, text)).filter((profile) => profile.score > 0).sort((a, b) => b.score - a.score);
  const best = fits[0] ?? null;
  return {
    bestProfile: best ? { id: best.id, label: best.label, score: best.score } : null,
    profiles: fits.slice(0, 3),
    scores: best?.scores ?? emptyScores()
  };
}

function scoreProfile(profile, text) {
  const keywordHits = (profile.keywords ?? []).filter((keyword) => includes(text, keyword));
  const seedHits = (profile.seeds ?? []).filter((seed) => includes(text, seed));
  if (profile.id === 'pet' && !/(강아지|고양이|반려|펫|pet|dog|cat|집사|산책)/i.test(text)) {
    return { id: profile.id, label: profile.label, score: 0, scores: emptyScores(), matched: [] };
  }
  if (!keywordHits.length && !seedHits.length) return { id: profile.id, label: profile.label, score: 0, scores: emptyScores(), matched: [] };
  const base = profile.scoring ?? {};
  const matchBoost = Math.min(24, keywordHits.length * 5 + seedHits.length * 3);
  const commerceBoost = commercePattern.test(text) ? 8 : 0;
  const scores = Object.fromEntries(scoreKeys.map((key) => [key, clamp((base[key] ?? 12) + matchBoost + commerceBoost, 1, 100)]));
  const score = Math.round(Object.values(scores).reduce((sum, value) => sum + value, 0) / scoreKeys.length);
  return { id: profile.id, label: profile.label, score, scores, matched: [...keywordHits, ...seedHits].slice(0, 8) };
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
