import { weakBareKeywordPattern } from './ranking-config';
import { cleanKeyword } from './ranking-text';

export function mergeRelatedCandidates(candidates) {
  const merged = [];
  [...candidates].sort((a, b) => b.mentions - a.mentions).forEach((candidate) => {
    const key = candidate.keyword.toLowerCase();
    const target = merged.find((item) => isRelated(item, candidate, key));
    if (!target) return merged.push(candidate);
    target.mentions += candidate.mentions;
    candidate.sourceSet.forEach((source) => target.sourceSet.add(source));
    target.signals.push(...candidate.signals);
    candidate.sampleTitles.forEach((title) => addUnique(target.sampleTitles, title, 4));
    if (candidate.keyword.length < target.keyword.length && candidate.keyword.length >= 3) target.keyword = candidate.keyword;
    target.bestPhraseRank = Math.min(target.bestPhraseRank, candidate.bestPhraseRank);
  });
  return merged;
}

export function limitDuplicateTitles(candidate, index, candidates) {
  const mainTitle = candidate.sampleTitles[0];
  if (!mainTitle) return true;
  const earlier = candidates.slice(0, index).filter((item) => item.sampleTitles.includes(mainTitle));
  return earlier.length === 0 || candidate.sources.length >= 2;
}

export function mergeFinalizedCandidates(candidates) {
  const map = new Map();
  candidates.forEach((candidate) => {
    const key = candidate.keyword.toLowerCase().replace(/\s+/g, '');
    const current = map.get(key);
    if (!current) return map.set(key, candidate);
    current.mentions += candidate.mentions;
    current.sources = [...new Set([...current.sources, ...candidate.sources])];
    current.sampleTitles = [...new Set([...current.sampleTitles, ...candidate.sampleTitles])].slice(0, 4);
    current.evidence = [...current.evidence, ...candidate.evidence].slice(0, 5);
    current.score = Math.max(current.score, candidate.score);
    current.scoring.total = Math.max(current.scoring.total, candidate.scoring.total);
    current.crossCheck = { ...current.crossCheck, sourceCount: current.sources.length, repeated: current.mentions >= 2, label: current.sources.length >= 2 ? '복수 출처 교차감지' : '단일 출처 관찰' };
  });
  return [...map.values()];
}

export function refineKeyword(candidate) {
  const keyword = candidate.keyword;
  const title = candidate.sampleTitles.find((sample) => cleanKeyword(sample).length >= keyword.length + 10);
  if (!title || !weakBareKeywordPattern.test(keyword)) return keyword;
  const text = cleanKeyword(title);
  if (/삼성전자|하이닉스|반도체/i.test(text)) return '삼성전자·하이닉스 AI 반도체';
  if (/AI 수요|HBM|가속기|반도체.*전망|반도체.*실적/i.test(text)) return 'AI 반도체 수요 전망';
  if (/AI|SaaS|agent|workflow|category|검색 노출/i.test(text)) return 'AI 검색 노출 전략';
  if (/마카오|QR|결제|관광|네이버페이/i.test(text)) return keyword.includes('네이버') ? '네이버페이 해외 QR결제' : '마카오 QR결제 관광 작업';
  if (/페이즈|MSI/i.test(text)) return '페이즈 MSI 준비 발언';
  if (/MSI|T1|LCK/i.test(text)) return 'MSI 경기 관전 포인트';
  const tokens = text.split(/\s+/).filter((token) => token.length >= 2 && !/^\d+$/.test(token)).slice(0, 5);
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

function addUnique(list, value, limit) {
  if (list.length < limit && !list.includes(value)) list.push(value);
}
