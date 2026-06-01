import {
  allowedEnglishKeywords, allowedShortKeywords, areaOverrideMap, canonicalKeywordMap,
  broadKeywordPattern, genericKeywords, interestAreas, noiseKeywords, stopWords
} from './ranking-config.js';

export function classifyTitle(value) {
  const text = `${value ?? ''}`.toLowerCase();
  for (const [keyword, areaId] of areaOverrideMap.entries()) {
    if (text.includes(keyword.toLowerCase())) return interestAreas.find((area) => area.id === areaId);
  }
  return interestAreas.find((area) => area.keywords.some((keyword) => text.includes(keyword.toLowerCase())))
    ?? interestAreas.find((area) => area.id === 'life');
}

export function extractKeywordTokens(title) {
  return cleanKeyword(title).split(/\s+/).map(normalizeCandidateKeyword)
    .filter((token) => token.length >= 2)
    .filter((token) => !/^\d+$/.test(token))
    .filter(isUsefulCandidate);
}

export function extractNgrams(tokens, size) {
  const phrases = [];
  for (let index = 0; index <= tokens.length - size; index += 1) {
    const group = tokens.slice(index, index + size);
    if (group.some(isWeakPhraseToken)) continue;
    const phrase = group.join(' ');
    if (phrase.length <= (size === 2 ? 22 : 30)) phrases.push(phrase);
  }
  return phrases;
}

export function normalizeCandidateKeyword(value) {
  const cleaned = cleanKeyword(value)
    .replace(/\bTechnology\b/gi, '테크놀로지')
    .replace(/테크놀러지|테크노로지/g, '테크놀로지')
    .replace(/네이버페(?!이)/g, '네이버페이')
    .replace(/^(.{4,})(이|가|을|를|과|와)$/u, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return canonicalKeywordMap.get(cleaned.toLowerCase()) ?? cleaned;
}

export function cleanKeyword(value) {
  return decodeEntities(value)
    .replace(/\[[^\]]*]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\.(jpg|jpeg|png|gif|webp|jpgif|twt)\b/gi, ' ')
    .replace(/[“”‘’]/g, '')
    .replace(/[^\p{L}\p{N}\s·-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isUsefulCandidate(value) {
  const keyword = normalizeCandidateKeyword(value);
  const lower = keyword.toLowerCase();
  if (!keyword || keyword.length > 34) return false;
  if (broadKeywordPattern.test(keyword)) return false;
  if (stopWords.has(lower) || noiseKeywords.has(lower) || genericKeywords.has(lower)) return false;
  if (/^\d+$/.test(keyword) || /^\d+[\p{L}]+$/u.test(keyword)) return false;
  if (/^\d{1,2}[-./]\d{1,2}$/.test(keyword)) return false;
  if (/ㅋ{2,}|ㅎ{2,}|ㅠ{2,}/.test(keyword)) return false;
  if (/^[A-Z]{3,}$/.test(keyword) && !allowedShortKeywords.has(lower)) return false;
  if (/^[a-z]{3,}$/i.test(keyword) && !allowedEnglishKeywords.has(lower) && !allowedShortKeywords.has(lower)) return false;
  if (/^(mp4|jpg|jpeg|png|gif|webp)$/i.test(keyword)) return false;
  if (keyword.length <= 2 && !allowedShortKeywords.has(lower)) return false;
  if (/^[가-힣]{2}$/.test(keyword) && !allowedShortKeywords.has(lower)) return false;
  if (keyword.includes(' ')) return keyword.split(/\s+/).filter(isUsefulSinglePart).length >= 2;
  return isUsefulSinglePart(keyword);
}

function isUsefulSinglePart(value) {
  const lower = value.toLowerCase();
  if (!value || stopWords.has(lower) || noiseKeywords.has(lower) || genericKeywords.has(lower)) return false;
  if (/^\d+$/.test(value) || isWeakPhraseToken(value)) return false;
  return !/(에|와|과|에서|에게|으로|로서|처럼|인데|면서|던데|입니다|했다|했던|썼던|된다는|했다는|한다는|풀었다는|된다|하다|세요|있음|하고|가지고|키운다|높인다|낮춘다|늘린다|줄인다|개|시장|전망)$/.test(value);
}

export function isWeakPhraseToken(value) {
  return /(가|이|을|를|로|으로|에서|에게|부터|까지|하고|된다|하다|하는|하고|면서|던데|입니다|했다|했던|썼던|풀었다는|개|시장|전망)$/.test(value);
}

export function decodeEntities(value) {
  return `${value ?? ''}`
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .trim();
}

export function stripTags(value) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
}

export function cleanText(value) {
  return decodeEntities(value).replace(/\s+/g, ' ').trim();
}
