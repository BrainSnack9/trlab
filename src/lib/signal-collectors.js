import { cleanText, extractAnchors, fetchText, fetchTextWithCurl, makeSignal, MOBILE_USER_AGENT, stripTags, textBetween } from './collector-utils';
import { getRedditSubreddits, getTopicalSeeds } from './trend-seeds';

export const collectorMap = {
  google: collectGoogleTrends, serp: collectSearchSerp, dcinside: () => collectAnchors('DCInside', 'https://www.dcinside.com/', 'https://www.dcinside.com', ['board/view/?id=dcbest', 'hit'], 16),
  fmkorea: collectFmKorea, theqoo: () => collectAnchors('TheQoo', 'https://theqoo.net/hot', 'https://theqoo.net', ['/hot/'], 20),
  natepann: () => collectAnchors('Nate Pann', 'https://pann.nate.com/talk/ranking', 'https://pann.nate.com', ['/talk/'], 30),
  bobaedream: () => collectAnchors('BobaeDream', 'https://www.bobaedream.co.kr/list?code=best', 'https://www.bobaedream.co.kr', ['/view?code=best'], 30),
  reddit: collectReddit, ruliweb: () => collectAnchors('Ruliweb', 'https://bbs.ruliweb.com/best?orderby=best_id&view=list', 'https://bbs.ruliweb.com', ['/best/board/'], 30),
  inven: () => collectAnchors('Inven', 'https://www.inven.co.kr/webzine/news/', 'https://www.inven.co.kr', ['/webzine/news/'], 21),
  arcalive: collectArcaLive, mlbpark: () => collectAnchors('MLBPark', 'https://mlbpark.donga.com/mp/b.php?p=1&m=list&b=bullpen', 'https://mlbpark.donga.com', ['/mp/b.php'], 30),
  clien: () => collectAnchors('Clien', 'https://www.clien.net/service/board/park?od=T31&po=0', 'https://www.clien.net', ['/service/board/park/'], 30)
};

export const sourceNames = Object.fromEntries(Object.entries(collectorMap).map(([id]) => [id, {
  google: 'Google Trends', serp: 'Search SERP', dcinside: 'DCInside', fmkorea: 'FMKorea',
  theqoo: 'TheQoo', natepann: 'Nate Pann', bobaedream: 'BobaeDream', reddit: 'Reddit',
  ruliweb: 'Ruliweb', inven: 'Inven', arcalive: 'ArcaLive', mlbpark: 'MLBPark', clien: 'Clien'
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

async function collectFmKorea() {
  const html = await fetchTextWithCurl('https://www.fmkorea.com/index.php?mid=best');
  if (/보안 시스템|security|잠시만 기다려/i.test(html)) throw new Error('FMKorea security check is active. Open FMKorea locally once, then retry.');
  return { source: 'FMKorea', status: 'ok', items: extractAnchors(html, { source: 'FMKorea', baseUrl: 'https://www.fmkorea.com', include: ['/best/'], limit: 30, type: 'fmkorea-best' }) };
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

async function collectArcaLive() {
  const html = await fetchTextWithCurl('https://arca.live/b/hotdeal?mode=best', MOBILE_USER_AGENT);
  return { source: 'ArcaLive', status: 'ok', items: extractAnchors(html, { source: 'ArcaLive', baseUrl: 'https://arca.live', include: ['/b/hotdeal/'], limit: 25, type: 'hotdeal-best' }) };
}
