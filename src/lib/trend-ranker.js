import { adultPattern, politicsPattern } from './ranking-config';
import { compareCandidates, limitAreaDominance } from './ranking-business';
import { evaluateContentPotential, evaluateProductionReadiness, isWeakContentCandidate, scoreCandidate } from './ranking-score';
import { verifySearch } from './ranking-search';
import { classifyTitle, extractKeywordTokens, extractNgrams, isUsefulCandidate, normalizeCandidateKeyword } from './ranking-text';
import { hash, limitDuplicateTitles, mergeFinalizedCandidates, mergeRelatedCandidates, refineKeyword } from './trend-ranker-utils';

export async function rankTrendSignals(signals, options = {}) {
  const verifyLimit = Number(options.verifyLimit ?? 0);
  const candidates = mergeFinalizedCandidates(buildCandidates(signals).map(finalizeCandidate))
    .filter((candidate) => candidate.scoring.quality >= 10)
    .filter((candidate) => candidate.validation.grade !== 'D' && !isWeakContentCandidate(candidate))
    .sort((a, b) => b.score - a.score)
    .filter(limitDuplicateTitles)
    .slice(0, Number(options.limit ?? 40));

  candidates.forEach((candidate) => { candidate.production = evaluateProductionReadiness(candidate); });
  const productionCandidates = candidates.filter(isProductionCandidate);
  const verifyTargets = [...productionCandidates].sort((a, b) => (b.production?.score ?? 0) - (a.production?.score ?? 0) || b.score - a.score).slice(0, Math.max(0, verifyLimit));
  const verifications = await Promise.allSettled(verifyTargets.map((candidate) => verifySearch(candidate.keyword)));
  verifications.forEach((result, index) => applyVerification(result, verifyTargets[index]));
  return productionCandidates.sort((a, b) => compareCandidates(a, b)).filter(limitAreaDominance).map((candidate, index) => ({ ...candidate, rank: index + 1, id: `rank-${hash(candidate.keyword)}` }));
}

function isProductionCandidate(candidate) {
  if ((candidate.production?.score ?? 0) < 50 || candidate.production?.tier === '제외 후보') return false;
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
  const phrases = signal.source === 'Google Trends'
    ? [normalizeCandidateKeyword(signal.title), ...tokens]
    : [...seedPhrases, ...tokens, ...extractNgrams(tokens, 2), ...extractNgrams(tokens, 3)];
  phrases.map(normalizeCandidateKeyword).filter(isUsefulCandidate).forEach((keyword, phraseIndex) => {
    const key = keyword.toLowerCase().replace(/\s+/g, '');
    const current = map.get(key) ?? { keyword, mentions: 0, sourceSet: new Set(), sampleTitles: [], signals: [], bestPhraseRank: phraseIndex };
    current.mentions += 1;
    current.sourceSet.add(signal.source);
    current.signals.push(signal);
    current.bestPhraseRank = Math.min(current.bestPhraseRank, phraseIndex);
    if (current.sampleTitles.length < 4 && !current.sampleTitles.includes(signal.title)) current.sampleTitles.push(signal.title);
    map.set(key, current);
  });
}

function finalizeCandidate(candidate) {
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
    evidence: candidate.signals.slice(0, 5).map((signal) => ({ source: signal.source, title: signal.title, url: signal.url, metric: signal.metric, seenCount: signal.seenCount }))
  };
}

function classifyCandidate(candidate) {
  const keywordArea = classifyTitle(candidate.keyword);
  return keywordArea.id === 'life' ? classifyTitle(`${candidate.keyword} ${candidate.sampleTitles.join(' ')}`) : keywordArea;
}
