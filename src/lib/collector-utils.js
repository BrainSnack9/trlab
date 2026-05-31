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
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return decodeResponse(await response.arrayBuffer(), response.headers.get('content-type'));
}

export async function fetchTextWithCurl(url, userAgent = MOBILE_USER_AGENT) {
  const { stdout } = await execFileAsync('curl.exe', ['-L', '--compressed', '--max-time', '20', '-A', userAgent, '-H', 'Accept-Language: ko-KR,ko;q=0.9,en-US;q=0.7,en;q=0.6', url], { encoding: 'buffer', maxBuffer: 8 * 1024 * 1024 });
  return decodeResponse(stdout, 'text/html; charset=utf-8');
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

function isLikelySignalTitle(title) {
  return title.length >= 4 && title.length <= 160 && !/(로그인|회원가입|공지사항|메뉴|검색|이전|다음|댓글|추천)$/i.test(title);
}

function hash(value) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) result = (result * 31 + value.charCodeAt(index)) >>> 0;
  return result.toString(36);
}
