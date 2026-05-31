import { cleanText, stripTags } from './ranking-text';
import { searchExternalProviders } from './search-providers';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 TrLab/0.1';
const blockedNaverPatterns = /(dic\.naver\.com|terms\.naver\.com|kin\.naver\.com|blog\.naver\.com|shopping\.naver\.com|map\.naver\.com|post\.naver\.com|cafe\.naver\.com|help\.naver\.com|media\.naver\.com\/press|channelPromotion|knowledge|dictionary|encyclopedia)/i;
const naverNewsPattern = /(n\.news\.naver\.com|news\.naver\.com|media\.naver\.com|entertain\.naver\.com|sports\.news\.naver\.com|\/article\/|news|press|journal|daily|경제|신문|일보)/i;
const badTitlePattern = /^(네이버뉴스|옵션\s*가이드|언론사\s*선정|구독하세요\.?)$/i;
const RECENT_DAYS = 45;

export async function verifySearch(keyword) {
  const [google, naver, blog, external] = await Promise.allSettled([searchGoogleNews(keyword), searchNaverNews(keyword), searchNaverBlog(keyword), searchExternalProviders(keyword)]);
  const tokens = cleanText(keyword).split(/\s+/).filter((token) => token.length >= 2).slice(0, 6);
  const sources = [settledSource('Google News', google), settledSource('Naver News', naver), settledSource('Naver Blog', blog), ...(external.status === 'fulfilled' ? external.value : [])].map((source) => filterSource(source, tokens));
  const results = sources.flatMap((source) => source.results.map((result) => ({ ...result, source: source.source })));
  const matchedResults = results.filter((result) => tokens.some((token) => result.title.toLowerCase().includes(token.toLowerCase())));
  const sourceCount = sources.filter((source) => source.status === 'ok' && source.count > 0).length;
  const score = Math.min(100, matchedResults.length * 12 + sourceCount * 15);
  const grade = score >= 60 ? '통과' : score >= 32 ? '보류' : '약함';
  return { grade, score, scoreBoost: grade === '통과' ? 12 : grade === '보류' ? 5 : 0, matchedResults: matchedResults.length, sources, keyFindings: matchedResults.slice(0, 4).map((result) => result.title), checkedAt: new Date().toISOString() };
}

function filterSource(source, tokens) {
  const results = source.results.filter((item) => isRelevantResult(item, tokens) && isFreshResult(item)).slice(0, 8);
  return { ...source, count: results.length, results };
}

function isRelevantResult(item, tokens) {
  const title = `${item.title ?? ''}`.toLowerCase();
  return tokens.some((token) => title.includes(token.toLowerCase()));
}

async function searchGoogleNews(query) {
  const xml = await fetchText(`https://news.google.com/rss/search?hl=ko&gl=KR&ceid=KR:ko&q=${encodeURIComponent(`${query} when:30d`)}`);
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map((match) => ({ url: textBetween(match[1], 'link'), title: textBetween(match[1], 'title'), snippet: textBetween(match[1], 'description'), publishedAt: textBetween(match[1], 'pubDate') }))
    .filter((item) => item.title.length >= 4 && isFreshResult(item))
    .slice(0, 6);
}

async function searchNaverNews(query) {
  const html = await fetchText(`https://search.naver.com/search.naver?where=news&sort=1&pd=4&query=${encodeURIComponent(query)}`);
  const seen = new Set();
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({ url: decodeEntities(match[1].match(/\bhref=["']([^"']+)["']/i)?.[1] ?? ''), title: cleanText(stripTags(match[2])), snippet: '' }))
    .filter((item) => isUsefulNaverNews(item) && isFreshResult(item))
    .filter((item) => {
      const key = item.url.replace(/[?#].*$/, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

async function searchNaverBlog(query) {
  const html = await fetchText(`https://search.naver.com/search.naver?where=post&sm=tab_opt&nso=so:dd,p:1m&query=${encodeURIComponent(query)}`);
  const seen = new Set();
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .map((match) => ({ url: decodeEntities(match[1].match(/\bhref=["']([^"']+)["']/i)?.[1] ?? ''), title: cleanText(stripTags(match[2])), snippet: '' }))
    .filter((item) => item.url.includes('blog.naver.com') && item.title.length >= 4 && item.title.length <= 100 && isFreshResult(item))
    .filter((item) => { const key = item.url.replace(/[?#].*$/, ''); if (seen.has(key)) return false; seen.add(key); return true; })
    .slice(0, 4);
}

function isUsefulNaverNews(item) {
  const text = `${item.url} ${item.title}`;
  if (!item.url.startsWith('http') || item.title.length < 4) return false;
  if (item.url.includes('www.naver.com') || blockedNaverPatterns.test(text)) return false;
  if (isHomepage(item.url)) return false;
  if (badTitlePattern.test(item.title) || item.title.length > 120) return false;
  return naverNewsPattern.test(text);
}

function isHomepage(url) {
  try { return new URL(url).pathname.replace(/\/+$/, '').length <= 1; } catch { return true; }
}

function isFreshResult(item) {
  const year = `${item.title} ${item.snippet ?? ''}`.match(/\b(20\d{2})\b/);
  if (year && Number(year[1]) < new Date().getFullYear()) return false;
  if (!item.publishedAt) return true;
  const time = Date.parse(item.publishedAt);
  return Number.isFinite(time) ? Date.now() - time <= RECENT_DAYS * 86400000 : true;
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.7,en;q=0.6' }, cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return decodeResponse(await response.arrayBuffer(), response.headers.get('content-type'));
}

function settledSource(source, result) {
  if (result.status === 'fulfilled') return { source, status: 'ok', count: result.value.length, results: result.value };
  return { source, status: 'failed', count: 0, error: result.reason?.message ?? 'Unknown error', results: [] };
}

function textBetween(block, tag) {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  return cleanText(stripTags(block.match(pattern)?.[1] ?? ''));
}

function decodeResponse(buffer, contentType = '') {
  const charset = contentType?.match(/charset=([^;]+)/i)?.[1]?.trim().toLowerCase();
  const encoding = ['euc-kr', 'ks_c_5601-1987', 'cp949', 'x-windows-949'].includes(charset) ? 'euc-kr' : 'utf-8';
  try { return new TextDecoder(encoding).decode(buffer); } catch { return new TextDecoder('utf-8').decode(buffer); }
}

function decodeEntities(value) {
  return `${value ?? ''}`.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}
