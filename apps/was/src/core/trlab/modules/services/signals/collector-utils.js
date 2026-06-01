import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
export const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 TrLab/0.1';
export const MOBILE_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';

export async function fetchText(url, userAgent = USER_AGENT) {
  const response = await fetch(url, {
    headers: { 'user-agent': userAgent, accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.7,en;q=0.6' },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000)
  });
  if (response.status === 429 || response.status === 430) {
    const retryAfter = response.headers.get('retry-after') ?? '300';
    throw new Error(`${url} rate limited: wait ${retryAfter}s`);
  }
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return decodeResponse(await response.arrayBuffer(), response.headers.get('content-type'));
}

export async function fetchTextWithCurl(url, userAgent = MOBILE_USER_AGENT) {
  try {
    const { stdout } = await execFileAsync(getCurlCommand(), ['-L', '--compressed', '--max-time', '20', '-A', userAgent, '-H', 'Accept-Language: ko-KR,ko;q=0.9,en-US;q=0.7,en;q=0.6', url], { encoding: 'buffer', maxBuffer: 8 * 1024 * 1024 });
    return decodeResponse(stdout, 'text/html; charset=utf-8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return fetchText(url, userAgent);
  }
}

export function extractAnchors(html, { source, baseUrl, include = [], limit = 30, type = 'public-list' }) {
  const seen = new Set();
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .map((match) => {
      const href = match[1].match(/\bhref=["']([^"']+)["']/i)?.[1] ?? '';
      const title = cleanText(stripTags(match[2]));
      const url = normalizeUrl(href, baseUrl);
      return { title, url };
    })
    .filter((item) => item.url && item.title.length >= 4)
    .filter((item) => !include.length || include.some((needle) => item.url.includes(needle)))
    .filter((item) => isLikelySignalTitle(item.title))
    .filter((item) => {
      const key = `${item.url}|${item.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map((item) => makeSignal({ source, title: item.title, url: item.url, type }));
}

export function extractCommunitySignals(html, { source, baseUrl, include = [], limit = 30, type = 'community-best', section = '', requireMetrics = true }) {
  const seen = new Set();
  return getListBlocks(html)
    .map((block) => {
      const anchor = findBestAnchor(block, baseUrl, include);
      if (!anchor) return null;
      const metrics = extractMetrics(block);
      if (requireMetrics && !metrics.length) return null;
      const metric = [section, ...metrics].filter(Boolean).join(' · ');
      const summary = [section && `섹션 ${section}`, ...metrics].filter(Boolean).join(' · ');
      return makeSignal({ source, title: anchor.title, url: anchor.url, metric, summary, type });
    })
    .filter(Boolean)
    .filter((item) => isLikelySignalTitle(item.title))
    .filter((item) => {
      const key = `${item.url}|${item.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

export function makeSignal({ source, title, url, metric = '', publishedAt = '', summary = '', type }) {
  const collectedAt = new Date().toISOString();
  return {
    id: `${source}-${hash(url || title)}`,
    source,
    title: cleanText(title),
    url,
    metric: cleanText(metric),
    summary: cleanText(summary),
    type,
    collectedAt,
    firstSeenAt: publishedAt || collectedAt,
    lastSeenAt: collectedAt
  };
}

export function textBetween(block, tag) {
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  return cleanText(stripTags(block.match(pattern)?.[1] ?? ''));
}

export function normalizeUrl(href, baseUrl) {
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) return '';
  try { return new URL(decodeEntities(href), baseUrl).toString(); } catch { return ''; }
}

export function stripTags(value) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
}

export function cleanText(value) {
  return decodeEntities(value).replace(/\s+/g, ' ').trim();
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

function decodeResponse(buffer, contentType = '') {
  const charset = contentType?.match(/charset=([^;]+)/i)?.[1]?.trim().toLowerCase();
  const encoding = ['euc-kr', 'ks_c_5601-1987', 'cp949', 'x-windows-949'].includes(charset) ? 'euc-kr' : 'utf-8';
  try { return new TextDecoder(encoding).decode(buffer); } catch { return new TextDecoder('utf-8').decode(buffer); }
}

function getCurlCommand() {
  return process.platform === 'win32' ? 'curl.exe' : 'curl';
}

function isLikelySignalTitle(title) {
  return title.length >= 4
    && title.length <= 160
    && !/(로그인|회원가입|공지사항|메뉴|검색|이전|다음|댓글|추천)$/i.test(title)
    && !/^댓글\s*\d+\s*개?$/i.test(title);
}

function getListBlocks(html) {
  const standardBlocks = [...html.matchAll(/<(li|tr|dl)\b[^>]*>[\s\S]*?<\/\1>/gi)].map((match) => match[0]);
  const clienBlocks = html.split(/(?=<div\b[^>]*class=["'][^"']*\blist_item\b)/i)
    .filter((part) => /^<div\b[^>]*class=["'][^"']*\blist_item\b/i.test(part));
  return [...standardBlocks, ...clienBlocks];
}

function findBestAnchor(block, baseUrl, include) {
  const anchors = [...block.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .map((match) => {
      const attrs = match[1];
      if (/\b(reply|comment|cmt)\b/i.test(attrs) || /#comment|pos=reply|cmt=1/i.test(attrs)) return null;
      const href = attrs.match(/\bhref=["']([^"']+)["']/i)?.[1] ?? '';
      const attrTitle = attrs.match(/\btitle=["']([^"']+)["']/i)?.[1] ?? '';
      const nestedTitle = match[2].match(/\btitle=["']([^"']+)["']/i)?.[1] ?? '';
      const url = normalizeUrl(href, baseUrl);
      const title = cleanTitle(attrTitle || nestedTitle || stripTags(match[2]));
      const score = (attrTitle ? 50 : 0)
        + (nestedTitle ? 45 : 0)
        + (/\b(subject|bsubject|list_subject|subject_link|txt)\b/i.test(attrs) ? 40 : 0)
        + (/<h[1-3]\b/i.test(block.slice(Math.max(0, match.index - 80), match.index)) ? 25 : 0)
        + Math.min(20, title.length / 4);
      return { url, title, score };
    })
    .filter(Boolean)
    .filter((item) => item.url && item.title.length >= 4)
    .filter((item) => !include.length || include.some((needle) => item.url.includes(needle)))
    .filter((item) => isLikelySignalTitle(item.title));
  return anchors.sort((a, b) => b.score - a.score)[0] ?? null;
}

function cleanTitle(value) {
  return cleanText(value)
    .replace(/\(\s*\d[\d,.]*\s*\)$/, '')
    .replace(/\[\s*\d[\d,.]*\s*\]$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMetrics(block) {
  const text = cleanText(stripTags(block));
  const comments = firstNumber([
    classText(block, 'reple-num'),
    classText(block, 'replyNum'),
    classText(block, 'num_reply'),
    classText(block, 'replycnt'),
    classText(block, 'totreply'),
    attrValue(block, 'data-comment-count'),
    attrValue(block, 'title', /댓글\s*([\d,.]+\s*[kKmM]?)/i),
    text.match(/댓글\s*([\d,.]+\s*[kKmM]?)/i)?.[1],
    text.match(/\((\d[\d,.]*)\)/)?.[1]
  ]);
  const views = firstNumber([
    classText(block, 'hit'),
    classText(block, 'viewV'),
    classText(block, 'count'),
    text.match(/조회\s*([\d,.]+\s*[kKmM]?)/i)?.[1],
    tableNumberAfterClass(block, 'hit')
  ]);
  const votes = firstNumber([
    classText(block, 'rcm'),
    classText(block, 'recomd'),
    text.match(/추천\s*([\d,.]+\s*[kKmM]?)/i)?.[1],
    text.match(/공감\s*([\d,.]+\s*[kKmM]?)/i)?.[1],
    tableNumberAfterClass(block, 'recomd')
  ]);
  return [
    comments && `댓글 ${comments}`,
    votes && `추천 ${votes}`,
    views && `조회 ${views}`
  ].filter(Boolean);
}

function classText(block, className) {
  const match = block.match(new RegExp(`<[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i'));
  return match ? cleanText(stripTags(match[1])) : '';
}

function tableNumberAfterClass(block, className) {
  const match = block.match(new RegExp(`<td\\b[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/td>`, 'i'));
  return match ? cleanText(stripTags(match[1])) : '';
}

function attrValue(block, attrName, nestedPattern) {
  const pattern = new RegExp(`\\b${attrName}=["']([^"']+)["']`, 'i');
  const value = block.match(pattern)?.[1] ?? '';
  return nestedPattern ? value.match(nestedPattern)?.[1] ?? '' : value;
}

function firstNumber(values) {
  for (const value of values) {
    const match = `${value ?? ''}`.match(/([\d,.]+)\s*([kKmM])?/);
    if (!match) continue;
    const number = Number(match[1].replace(/,/g, ''));
    if (!Number.isFinite(number)) continue;
    const scaled = /k/i.test(match[2] ?? '') ? number * 1000 : /m/i.test(match[2] ?? '') ? number * 1000000 : number;
    return Number.isInteger(scaled) ? String(scaled) : String(Math.round(scaled));
  }
  return '';
}

function hash(value) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) result = (result * 31 + value.charCodeAt(index)) >>> 0;
  return result.toString(36);
}
