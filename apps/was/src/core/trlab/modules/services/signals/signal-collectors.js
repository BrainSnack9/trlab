import { cleanText, decodeEntities, extractAnchors, extractCommunitySignals, fetchText, makeSignal, normalizeUrl, stripTags, textBetween } from './collector-utils.js';
import { getRedditSubreddits, getTopicalSeeds } from '#trlab/modules/services/trends/trend-seeds';

export const collectorMap = {
  google: collectGoogleTrends, serp: collectSearchSerp, dcinside: collectDcInside,
  fmkorea: collectFmKorea, theqoo: collectTheQoo,
  natepann: collectNatePann,
  bobaedream: collectBobaeDream,
  reddit: collectReddit, ruliweb: collectRuliweb,
  inven: () => collectAnchors('Inven', 'https://www.inven.co.kr/webzine/news/', 'https://www.inven.co.kr', ['/webzine/news/'], 21),
  mlbpark: collectMlbPark,
  clien: collectClien
};

export const sourceNames = Object.fromEntries(Object.entries(collectorMap).map(([id]) => [id, {
  google: 'Google Trends', serp: 'Search SERP', dcinside: 'DCInside', fmkorea: 'FMKorea',
  theqoo: 'TheQoo', natepann: 'Nate Pann', bobaedream: 'BobaeDream', reddit: 'Reddit',
  ruliweb: 'Ruliweb', inven: 'Inven', mlbpark: 'MLBPark', clien: 'Clien'
}[id]]));

async function collectGoogleTrends() {
  const xml = await fetchText('https://trends.google.com/trending/rss?geo=KR');
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 20).map((match) => {
    const block = match[1];
    return makeSignal({
      source: 'Google Trends',
      title: textBetween(block, 'title'),
      url: textBetween(block, 'ht:news_item_url') || 'https://trends.google.com/trending?geo=KR',
      metric: textBetween(block, 'ht:approx_traffic'),
      publishedAt: textBetween(block, 'pubDate'),
      summary: textBetween(block, 'ht:news_item_title'),
      type: 'trend-rss'
    });
  }).filter((item) => item.title);
  return { source: 'Google Trends', status: 'ok', items };
}

async function collectSearchSerp(context = {}) {
  const trendPayload = await collectGoogleTrends();
  const trendSeeds = trendPayload.items.slice(0, 8).map((item) => item.title);
  const topicalSearchSeeds = getTopicalSeeds(context.areas);
  const seeds = [...trendSeeds, ...topicalSearchSeeds];
  const settled = await Promise.allSettled(seeds.map((seed) => collectGoogleNewsForSeed(seed, topicalSearchSeeds.includes(seed))));
  const seen = new Set();
  const items = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []).filter((item) => {
    const key = `${item.url}|${item.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 48);
  return { source: 'Search SERP', status: 'ok', items };
}

async function collectGoogleNewsForSeed(seed, topical = false) {
  const xml = await fetchText(`https://news.google.com/rss/search?hl=ko&gl=KR&ceid=KR:ko&q=${encodeURIComponent(seed)}`);
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 3).map((match) => {
    const block = match[1];
    return makeSignal({ source: 'Search SERP', title: textBetween(block, 'title'), url: textBetween(block, 'link'), metric: seed, publishedAt: textBetween(block, 'pubDate'), summary: cleanText(stripTags(textBetween(block, 'description'))), type: topical ? 'topical-serp' : 'google-news-serp' });
  }).filter((item) => item.title && item.url);
}

async function collectAnchors(source, url, baseUrl, include, limit) {
  const html = await fetchText(url);
  return { source, status: 'ok', items: extractAnchors(html, { source, baseUrl, include, limit }) };
}

async function collectCommunitySections(source, baseUrl, sections, include, limit = 36) {
  const settled = await Promise.allSettled(sections.map(async (section) => {
    const html = await fetchText(section.url);
    return extractCommunitySignals(html, { source, baseUrl, include, limit: section.limit ?? 18, section: section.label, requireMetrics: section.requireMetrics ?? true });
  }));
  const seen = new Set();
  const items = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : [])
    .filter((item) => {
      const key = `${item.url}|${item.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
  return { source, status: 'ok', items };
}

function collectNatePann() {
  return collectCommunitySections('Nate Pann', 'https://pann.nate.com', [
    { label: '톡커들의 선택 실시간', url: 'https://pann.nate.com/talk/ranking' },
    { label: '톡커들의 선택 일간', url: 'https://pann.nate.com/talk/ranking/d' },
    { label: '오늘의 톡', url: 'https://pann.nate.com/today/talk' }
  ], ['/talk/3'], 42);
}

function collectTheQoo() {
  return collectCommunitySections('TheQoo', 'https://theqoo.net', [
    { label: 'HOT 전체', url: 'https://theqoo.net/hot' },
    { label: 'HOT 이슈', url: 'https://theqoo.net/hot/category/24788' },
    { label: 'HOT 정보', url: 'https://theqoo.net/hot/category/24784' },
    { label: 'HOT 뷰티', url: 'https://theqoo.net/hot/category/2987494262' }
  ], ['/hot/'], 42);
}

function collectDcInside() {
  return collectCommunitySections('DCInside', 'https://www.dcinside.com', [
    { label: '실베 랭킹', url: 'https://www.dcinside.com/' },
    { label: '실베 최신', url: 'https://gall.dcinside.com/board/lists/?id=dcbest' }
  ], ['board/view/?id=dcbest'], 36);
}

function collectBobaeDream() {
  return collectCommunitySections('BobaeDream', 'https://www.bobaedream.co.kr', [
    { label: '베스트글 실시간', url: 'https://www.bobaedream.co.kr/list?code=best' },
    { label: '베스트글 주간', url: 'https://www.bobaedream.co.kr/board/bulletin/list.php?code=best&vdate=w' },
    { label: '베스트글 월간', url: 'https://www.bobaedream.co.kr/board/bulletin/list.php?code=best&vdate=m' }
  ], ['/view?code=best'], 42);
}

function collectRuliweb() {
  return collectCommunitySections('Ruliweb', 'https://bbs.ruliweb.com', [
    { label: '실시간 베스트', url: 'https://bbs.ruliweb.com/best/humor_only?orderby=best_id&view=list' },
    { label: '추천순 베스트', url: 'https://bbs.ruliweb.com/best/humor_only?orderby=recommend&range=&view=list' },
    { label: '조회순 베스트', url: 'https://bbs.ruliweb.com/best/humor_only?orderby=readcount&range=&view=list' },
    { label: '댓글순 베스트', url: 'https://bbs.ruliweb.com/best/humor_only?orderby=replycount&range=&view=list' }
  ], ['/best/board/'], 42);
}

function collectMlbPark() {
  return collectCommunitySections('MLBPark', 'https://mlbpark.donga.com', [
    { label: '불펜 최다추천', url: 'https://mlbpark.donga.com/mp/best.php?b=bullpen&m=like', requireMetrics: false },
    { label: '불펜 최고조회', url: 'https://mlbpark.donga.com/mp/best.php?b=bullpen&m=view', requireMetrics: false },
    { label: '불펜 최다댓글', url: 'https://mlbpark.donga.com/mp/best.php?b=bullpen&m=reply', requireMetrics: false },
    { label: '불펜 최신', url: 'https://mlbpark.donga.com/mp/b.php?p=1&m=list&b=bullpen' }
  ], ['id='], 36);
}

function collectClien() {
  return collectCommunitySections('Clien', 'https://www.clien.net', [
    { label: '모두의공원 최신', url: 'https://www.clien.net/service/board/park?od=T31&po=0' },
    { label: '모두의공원 공감순', url: 'https://www.clien.net/service/board/park?od=T33&po=0' },
    { label: '모두의공원 댓글순', url: 'https://www.clien.net/service/board/park?od=T34&po=0' }
  ], ['/service/board/park/'], 36);
}

async function collectFmKorea() {
  const latest = await collectFmKoreaBest('https://m.fmkorea.com/best', '포텐 최신순');
  await sleep(5000);
  const popular = await collectFmKoreaBest('https://m.fmkorea.com/best2', '포텐 화제순');
  const seen = new Set();
  const items = [...latest, ...popular].filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  }).slice(0, 40);
  return { source: 'FMKorea', status: 'ok', items };
}

async function collectFmKoreaBest(url, metric) {
  const html = await fetchText(url, 'TrLab research crawler 0.1');
  if (isFmKoreaSecurityPage(html)) throw new Error('FMKorea security check is active. Retry later.');
  return parseFmKoreaBest(html, metric);
}

function isFmKoreaSecurityPage(html) {
  return /보안\s*시스템|잠시만\s*기다려|Just a moment|cf-browser-verification|challenges\.cloudflare/i.test(html);
}

function parseFmKoreaBest(html, metric) {
  return [...html.matchAll(/<li\b[^>]*class=["'][^"']*\bli\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => parseFmKoreaItem(match[1], metric))
    .filter(Boolean);
}

function parseFmKoreaItem(block, metric) {
  const anchor = block.match(/<h3\b[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>[\s\S]*?<a\b([^>]*)>([\s\S]*?)<\/a>/i);
  const href = anchor?.[1]?.match(/\bhref=["']([^"']+)["']/i)?.[1] ?? '';
  const title = cleanText(stripTags(anchor?.[2] ?? '')).replace(/\s*\[\d+\]\s*$/, '');
  const url = normalizeUrl(decodeEntities(href), 'https://m.fmkorea.com');
  if (!url || !title) return null;
  const category = textFromSelector(block, 'category');
  const relativeTime = textFromSelector(block, 'regdate');
  const author = textFromSelector(block, 'author').replace(/^\/\s*/, '');
  const comments = numberFromText(textFromSelector(block, 'comment_count'));
  const votes = numberFromText(textFromSelector(block, 'voted_count'));
  const thumbnail = thumbnailFromBlock(block);
  const metricLabel = [
    metric,
    Number.isFinite(comments) && `댓글 ${comments}`,
    Number.isFinite(votes) && `추천 ${votes}`
  ].filter(Boolean).join(' · ');
  const summary = [
    category && `카테고리 ${category}`,
    relativeTime && `시간 ${relativeTime}`,
    author && `작성자 ${author}`,
    Number.isFinite(comments) && `댓글 ${comments}`,
    Number.isFinite(votes) && `추천 ${votes}`,
    thumbnail && `썸네일 ${thumbnail}`
  ].filter(Boolean).join(' · ');
  return makeSignal({ source: 'FMKorea', title, url, metric: metricLabel, summary, type: 'fmkorea-mobile-best' });
}

function textFromSelector(block, className) {
  const pattern = new RegExp(`<span\\b[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/span>`, 'i');
  return cleanText(stripTags(block.match(pattern)?.[1] ?? ''));
}

function numberFromText(value) {
  const match = `${value ?? ''}`.replace(/,/g, '').match(/\d+/);
  return match ? Number(match[0]) : null;
}

function thumbnailFromBlock(block) {
  const img = block.match(/<img\b([^>]*)>/i)?.[1] ?? '';
  const src = img.match(/\bdata-original=["']([^"']+)["']/i)?.[1] ?? img.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? '';
  if (!src) return '';
  if (src.startsWith('//')) return `https:${src}`;
  return normalizeUrl(src, 'https://m.fmkorea.com');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function collectReddit(context = {}) {
  const settled = await Promise.allSettled(getRedditSubreddits(context.areas).map(collectRedditSubreddit));
  const items = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []).slice(0, 72);
  return { source: 'Reddit', status: 'ok', items };
}

async function collectRedditSubreddit(subreddit) {
  const xml = await fetchText(`https://www.reddit.com/r/${subreddit}/hot/.rss?limit=8`);
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => {
    const block = match[1];
    return makeSignal({ source: 'Reddit', title: textBetween(block, 'title'), url: textBetween(block, 'link') || `https://www.reddit.com/r/${subreddit}`, metric: `r/${subreddit}`, publishedAt: textBetween(block, 'updated'), summary: cleanText(stripTags(textBetween(block, 'content'))).slice(0, 240), type: 'reddit-rss' });
  }).filter((item) => item.title);
}
