import { adultPattern, politicsPattern } from './ranking-config.js';
import { compareCandidates, limitAreaDominance } from './ranking-business.js';
import { evaluateContentPotential, evaluateProductionReadiness, isWeakContentCandidate, scoreCandidate } from './ranking-score.js';
import { getChannelProfileFit, getRankingProfiles } from './ranking-profile-fit.js';
import { verifySearch } from '#trlab/modules/services/search/ranking-search';
import { classifyTitle, extractContentTopicPhrases, extractKeywordTokens, extractNgrams, isUsefulCandidate, normalizeCandidateKeyword } from './ranking-text.js';
import { hash, isStrongFinalCandidate, limitDuplicateTitles, limitRelatedEvidence, mergeFinalizedCandidates, mergeRelatedCandidates, refineKeyword } from './trend-ranker-utils.js';

export async function rankTrendSignals(signals, options = {}) {
  const verifyLimit = Number(options.verifyLimit ?? 0);
  const profiles = await getRankingProfiles();
  const finalizedCandidates = mergeFinalizedCandidates(buildCandidates(signals).map((candidate) => finalizeCandidate(candidate, profiles)))
    .filter((candidate) => candidate.scoring.quality >= 10)
    .filter((candidate) => candidate.validation.grade !== 'D' && !isWeakContentCandidate(candidate))
    .filter(isStrongFinalCandidate)
    .sort((a, b) => b.score - a.score);
  const profileBackedCandidates = finalizedCandidates.filter(isProfileBackedContentCandidate);
  const candidates = mergeFinalizedCandidates([
    ...finalizedCandidates
    .filter(limitDuplicateTitles)
    .filter(limitRelatedEvidence),
    ...profileBackedCandidates
  ])
    .sort((a, b) => b.score - a.score)
    .slice(0, Number(options.limit ?? 40));

  candidates.forEach((candidate) => { candidate.production = evaluateProductionReadiness(candidate); });
  const productionCandidates = candidates.filter(isProductionCandidate);
  const verifyTargets = [...productionCandidates].sort((a, b) => (b.production?.score ?? 0) - (a.production?.score ?? 0) || b.score - a.score).slice(0, Math.max(0, verifyLimit));
  const verifications = await Promise.allSettled(verifyTargets.map((candidate) => verifySearch(candidate.keyword)));
  verifications.forEach((result, index) => applyVerification(result, verifyTargets[index]));
  const balancedCandidates = balanceProfileCandidates(
    productionCandidates.sort((a, b) => compareCandidates(a, b)).filter(limitRelatedEvidence)
  );
  return balancedCandidates.filter(limitAreaDominance).map((candidate, index) => ({ ...candidate, rank: index + 1, id: `rank-${hash(candidate.keyword)}` }));
}

function balanceProfileCandidates(candidates) {
  const selected = [];
  const selectedKeys = new Set();
  const profileIds = [...new Set(candidates.map((candidate) => candidate.channelFit?.bestProfile?.id).filter(Boolean))];
  profileIds.forEach((profileId) => {
    candidates
      .filter((candidate) => candidate.channelFit?.bestProfile?.id === profileId)
      .slice(0, 2)
      .forEach((candidate) => addCandidate(selected, selectedKeys, candidate));
  });
  candidates.forEach((candidate) => addCandidate(selected, selectedKeys, candidate));
  return selected;
}

function addCandidate(list, keys, candidate) {
  const key = `${candidate.keyword ?? ''}`.toLowerCase().replace(/\s+/g, '');
  if (!key || keys.has(key)) return;
  keys.add(key);
  list.push(candidate);
}

function isProfileBackedContentCandidate(candidate) {
  if (!candidate.channelFit?.bestProfile) return false;
  const keyword = `${candidate.keyword ?? ''}`;
  if (/^(커졌다|쇼핑리스트|일본여행|제2전성기|美관세|target finds)$/i.test(keyword)) return false;
  return /(품절|대란|아마존|틱톡|tiktok|올영|올리브영|스타벅스|콜드컵|K-?뷰티|구매|추천템|브랜드|필수템|구다이글로벌|육아|출산|부모|아기|펫|반려|강아지|고양이)/i.test(keyword);
}

function isProductionCandidate(candidate) {
  if ((candidate.production?.score ?? 0) < 50 || candidate.production?.tier === '제외 후보') return false;
  if (!candidate.channelFit?.bestProfile && candidate.area?.id === 'life' && candidate.sources.length === 1 && (candidate.production?.score ?? 0) < 82) return false;
  if (candidate.sources.length === 1 && !['Search SERP', 'Google Trends'].includes(candidate.sources[0]) && (candidate.production?.score ?? 0) < 70) return false;
  return true;
}

function applyVerification(result, candidate) {
  if (result.status !== 'fulfilled') return;
  candidate.searchVerification = result.value;
  candidate.score = Math.min(100, candidate.score + result.value.scoreBoost);
  candidate.scoring.search = result.value.scoreBoost;
  candidate.validation.searchGrade = result.value.grade;
  candidate.production = evaluateProductionReadiness(candidate);
}

function buildCandidates(signals) {
  const map = new Map();
  signals
    .filter((signal) => !adultPattern.test(`${signal.title ?? ''} ${signal.summary ?? ''}`))
    .filter((signal) => !politicsPattern.test(`${signal.title ?? ''} ${signal.summary ?? ''}`))
    .filter((signal) => (signal.qualityScore ?? 60) >= 40)
    .forEach((signal) => addSignalCandidates(map, signal));
  return mergeRelatedCandidates([...map.values()]);
}

function addSignalCandidates(map, signal) {
  const tokens = extractKeywordTokens(signal.title);
  const seedPhrases = signal.type === 'topical-serp' ? [normalizeCandidateKeyword(signal.metric)] : [];
  const topicPhrases = extractContentTopicPhrases(signal);
  const phrases = signal.source === 'Google Trends'
    ? [normalizeCandidateKeyword(signal.title), ...topicPhrases, ...tokens]
    : [...topicPhrases, ...seedPhrases, ...tokens, ...extractNgrams(tokens, 2), ...extractNgrams(tokens, 3)];
  phrases.map(normalizeCandidateKeyword).filter(isUsefulCandidate).forEach((keyword, phraseIndex) => {
    const key = keyword.toLowerCase().replace(/\s+/g, '');
    const current = map.get(key) ?? { keyword, mentions: 0, sourceSet: new Set(), sampleTitles: [], signals: [], bestPhraseRank: phraseIndex };
    current.mentions += 1;
    current.sourceSet.add(signal.source);
    current.signals.push(signal);
    current.bestPhraseRank = Math.min(current.bestPhraseRank, phraseIndex);
    if (current.sampleTitles.length < 20 && !current.sampleTitles.includes(signal.title)) current.sampleTitles.push(signal.title);
    map.set(key, current);
  });
}

function finalizeCandidate(candidate, profiles) {
  const keyword = refineKeyword(candidate);
  const refined = { ...candidate, keyword };
  const area = classifyCandidate(refined);
  const scoring = scoreCandidate(refined, area);
  const validation = evaluateContentPotential(refined, area, scoring);
  const sources = [...candidate.sourceSet];
  return {
    keyword, label: keyword, score: scoring.total, scoring, validation, production: null,
    mentions: candidate.mentions, sources, sampleTitles: candidate.sampleTitles, area,
    category: area.label, confidence: scoring.confidence,
    contentAngle: sources.length >= 2 ? `${area.label} 영역에서 여러 채널이 동시에 건드린 신호입니다.` : '검색 검증을 거쳐 확장 여부를 판단하세요.',
    crossCheck: { sourceCount: sources.length, repeated: candidate.mentions >= 2, label: sources.length >= 2 ? '복수 출처 교차감지' : '단일 출처 관찰', evidenceCount: candidate.signals.length },
    evidence: uniqueSignals(candidate.signals).slice(0, 30).map((signal) => ({ source: signal.source, title: signal.title, url: signal.url, metric: signal.metric, seenCount: signal.seenCount })),
    channelFit: getChannelProfileFit({ ...candidate, keyword }, profiles)
  };
}

function classifyCandidate(candidate) {
  const keywordArea = classifyTitle(candidate.keyword);
  return keywordArea.id === 'life' ? classifyTitle(`${candidate.keyword} ${candidate.sampleTitles.join(' ')}`) : keywordArea;
}

function uniqueSignals(signals) {
  const seen = new Set();
  return signals.filter((signal) => {
    const key = `${signal.source}|${normalizeTitle(signal.title)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeTitle(title) {
  return `${title ?? ''}`.replace(/\s+/g, ' ').trim();
}
