import {
  allowedEnglishKeywords, allowedShortKeywords, areaOverrideMap, canonicalKeywordMap,
  broadKeywordPattern, genericKeywords, interestAreas, noiseKeywords, stopWords
} from './ranking-config.js';

export function classifyTitle(value) {
  const text = `${value ?? ''}`.toLowerCase();
  for (const [keyword, areaId] of areaOverrideMap.entries()) {
    if (includesSearchTerm(text, keyword)) return interestAreas.find((area) => area.id === areaId);
  }
  return interestAreas.find((area) => area.keywords.some((keyword) => includesSearchTerm(text, keyword)))
    ?? interestAreas.find((area) => area.id === 'life');
}

export function extractKeywordTokens(title) {
  return cleanKeyword(title).split(/\s+/).map(normalizeCandidateKeyword)
    .filter((token) => token.length >= 2)
    .filter((token) => !/^\d+$/.test(token))
    .filter(isUsefulCandidate);
}

export function extractContentTopicPhrases(signal) {
  const title = cleanKeyword(signal?.title ?? '');
  const metric = cleanKeyword(signal?.metric ?? '');
  const text = `${title} ${metric}`;
  const phrases = [];
  const add = (value) => {
    const normalized = normalizeCandidateKeyword(value);
    if (isUsefulCandidate(normalized) && !phrases.includes(normalized)) phrases.push(normalized);
  };

  if (/스타벅스|Starbucks/i.test(text) && /(곰돌이|베어|bear|콜드컵|cold\s*cup)/i.test(text)) add('스타벅스 곰돌이 콜드컵');
  if (/K-?뷰티|K-?Beauty|화장품|메디큐브|제로모공패드|올리브영|올영/i.test(text) && /아마존|amazon/i.test(text)) add('미국 아마존 K뷰티 돌풍');
  if (/K-?뷰티|K-?Beauty|화장품|메디큐브|제로모공패드|올리브영|올영/i.test(text) && /틱톡|tiktok/i.test(text)) add('틱톡 K뷰티 입소문');
  if (/K-?뷰티|K-?Beauty|화장품|메디큐브|제로모공패드|올리브영|올영/i.test(text) && /일본|품절/i.test(text)) add('일본 K뷰티 품절템');
  if (/올리브영|올영|선크림|자차|화장품/i.test(text) && /세일|할인|꿀팁/i.test(text)) add('올영세일 뷰티템');
  if (/출산|임신|부모급여|육아\s*지원|어린이집|신생아|아기/i.test(text) && /혜택|지원|급여|보조금|세금/i.test(text)) add('출산 육아 지원 혜택');
  if (/어린이집|유치원|키즈|아기/i.test(text) && /엄마|부모|수영복|등원/i.test(text)) add('어린이집 등원 이슈');
  if (/강아지|고양이|반려|펫|pet|dog|cat/i.test(text) && /간식|장난감|용품|자동|보험|병원|costco|amazon/i.test(text)) add('반려동물 인기 용품');
  if (/강아지|고양이|반려|펫|pet|dog|cat/i.test(text) && /진료비|병원비|표준수가|수가제|동물병원|보험/i.test(text)) add('반려동물 진료비 표준수가제');
  if (/AI|인공지능/i.test(text) && /장난감|인형|toy|펫|pet|반려/i.test(text)) add(/펫|pet|반려/i.test(text) ? 'AI 펫가젯' : 'AI 장난감');
  if (/AI|인공지능|GEO|AEO|SEO|answer\s*engine/i.test(text) && /검색|노출|GEO|AEO|SEO|answer\s*engine/i.test(text)) add('AI 검색 노출 전략');
  if (/생성형\s*AI|AI/i.test(text) && /업무|실무|자동화|기업|AX|도입|활용 사례/i.test(text)) add('기업 생성형 AI 업무 활용');
  if (/GLP-?1|위고비|마운자로|비만치료제|유지어터/i.test(text) && /식품|시장|유지|다이어트|비만|체중/i.test(text)) add('GLP-1 이후 유지어터 시장');
  if (/건강기능식품|건기식|식품첨가물|면역력|표방 식품|과다 섭취/i.test(text) && /주의|광고|효과|비교|선택|흉내/i.test(text)) add('건강기능식품 광고 주의');
  if (/수면|멜라토닌|마그네슘/i.test(text) && /영양제|성분|효과|비교|선택|먹지 말아야/i.test(text)) add('수면 영양제 성분 비교');
  if (/소비자물가|물가\s*품목|물가지표|밀키트|클라우드|1인\s*가구|점심값/i.test(text) && /변화|바뀜|반영|시대|품목/i.test(text)) add('소비자물가 품목 변화');
  if (/단백질/i.test(text) && /일상|건강|시장|근육|운동|식품/i.test(text)) add('일상 건강 단백질 시장');
  if (/일본|여행/i.test(text) && /Z세대|짧고\s*자주|혜택|카드|특화|국내\s*일본풍/i.test(text)) add('일본 여행 소비 변화');
  if (/전기차|EV/i.test(text) && /배터리|가격|반토막|구독|전동화|캐즘|전망/i.test(text)) add('전기차 가격·구독 전략');
  if (/아마존|amazon/i.test(text) && /상품|제품|구매|finds|급상승|품절|대란/i.test(text)) add('미국 아마존 인기 상품');
  if (/틱톡|tiktok/i.test(text) && /광고|입소문|구매|브랜드|made me buy/i.test(text)) add('틱톡발 구매 트렌드');
  if (/일본|칼디|편의점/i.test(text) && /추천템|쇼핑|품절|신상|필수템/i.test(text)) add('일본 생활 쇼핑 추천템');
  if (/라면|ramen/i.test(text) && /판매량|매출|top\s*10|순위|랭킹/i.test(text)) add('한국 라면 판매량 Top10');

  const quoted = title.match(/['"]([^'"]{3,28})['"]/);
  if (quoted?.[1] && /(품절|대란|인기|추천|급상승|아마존|틱톡|일본|미국|뷰티|육아|펫|반려)/i.test(text)) add(quoted[1]);

  return phrases;
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
  if (/\d+위/.test(keyword)) return false;
  if (/ㅋ{2,}|ㅎ{2,}|ㅠ{2,}/.test(keyword)) return false;
  if (/^[A-Z]{3,}$/.test(keyword) && !allowedShortKeywords.has(lower)) return false;
  if (/^[a-z]{3,}$/i.test(keyword) && !allowedEnglishKeywords.has(lower) && !allowedShortKeywords.has(lower)) return false;
  if (isEnglishSentenceFragment(keyword)) return false;
  if (/^(mp4|jpg|jpeg|png|gif|webp)$/i.test(keyword)) return false;
  if (keyword.length <= 2 && !allowedShortKeywords.has(lower)) return false;
  if (/^[가-힣]{2}$/.test(keyword) && !allowedShortKeywords.has(lower)) return false;
  if (keyword.includes(' ')) return keyword.split(/\s+/).filter(isUsefulSinglePart).length >= 2;
  return isUsefulSinglePart(keyword);
}

function isEnglishSentenceFragment(value) {
  const text = `${value ?? ''}`.trim();
  if (!/^[a-z0-9\s-]+$/i.test(text) || !text.includes(' ')) return false;
  const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length < 4) return false;
  if (tokens.some((token) => allowedEnglishKeywords.has(token) || allowedShortKeywords.has(token))) {
    return /^(i|we|you|they|he|she|asked|ask|generate|generated|make|made|using|with|about|average|users?)\b/i.test(text);
  }
  return true;
}

function isUsefulSinglePart(value) {
  const lower = value.toLowerCase();
  if (!value || stopWords.has(lower) || noiseKeywords.has(lower) || genericKeywords.has(lower)) return false;
  if (/^\d+$/.test(value) || isWeakPhraseToken(value)) return false;
  return !/(에|와|과|에서|에게|으로|로서|처럼|인데|면서|던데|입니다|했습니다|합니다|봅니다|봅시다|해봅니다|해봅시다|봤습니다|됩니다|되나요|됐나요|인가요|네요|군요|했다|했던|썼던|된다는|했다는|한다는|풀었다는|된다|하다|세요|있음|하고|가지고|키운다|높인다|낮춘다|늘린다|줄인다|개|시장|전망)$/.test(value);
}

export function isWeakPhraseToken(value) {
  return /(가|이|을|를|로|으로|에서|에게|부터|까지|하고|된다|하다|하는|하고|면서|던데|입니다|했습니다|합니다|봅니다|봅시다|해봅니다|해봅시다|봤습니다|됩니다|되나요|됐나요|인가요|네요|군요|했다|했던|썼던|풀었다는|개|시장|전망)$/.test(value);
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

function includesSearchTerm(text, keyword) {
  const term = `${keyword ?? ''}`.toLowerCase();
  if (!term) return false;
  if (/^[a-z0-9+#.-]{1,3}$/i.test(term)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegex(term)}([^a-z0-9]|$)`, 'i').test(text);
  }
  return text.includes(term);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
