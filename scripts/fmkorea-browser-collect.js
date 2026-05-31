import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { extractAnchors } from '../src/lib/collector-utils.js';

const BASE_URL = process.env.TRLAB_URL ?? 'http://localhost:5173';
const PROFILE_DIR = path.join(process.cwd(), 'data', 'fmkorea-profile');
const CHROME_PATHS = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA ?? '', 'Google\\Chrome\\Application\\chrome.exe')
].filter(Boolean);

const HEADLESS = process.env.FMKOREA_HEADLESS !== '0';
const AUTH_MODE = process.argv.includes('--auth');
const TARGET_URL = 'https://www.fmkorea.com/index.php?mid=best';

await collect();
process.exit(0);

async function collect() {
  const startedAt = new Date().toISOString();
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  const browser = await chromium.launchPersistentContext(PROFILE_DIR, {
    executablePath: findChrome(),
    headless: AUTH_MODE ? false : HEADLESS,
    viewport: { width: 1280, height: 900 },
    locale: 'ko-KR'
  });
  try {
    const page = browser.pages()[0] ?? await browser.newPage();
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    if (AUTH_MODE) await waitForUser(page);
    const html = await page.content();
    const items = extractAnchors(html, { source: 'FMKorea', baseUrl: 'https://www.fmkorea.com', include: ['/best/'], limit: 30, type: 'fmkorea-browser-best' });
    if (!items.length && /보안\s*시스템|잠시만\s*기다려|security\s*check/i.test(html)) throw new Error('FMKorea security check is still active.');
    await importSignals({ startedAt, finishedAt: new Date().toISOString(), items, reason: AUTH_MODE ? 'fmkorea-browser-auth' : 'fmkorea-browser-worker' });
    console.log(`FMKorea browser collect: ${items.length} items`);
  } finally {
    await browser.close();
  }
}

async function importSignals(payload) {
  const response = await fetch(`${BASE_URL}/api/signals/import`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ source: 'FMKorea', status: 'ok', ...payload }),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`import failed: ${response.status}`);
}

async function waitForUser(page) {
  console.log('FMKorea 창에서 포텐터짐 게시글 목록이 보이는 상태까지 기다린 뒤 Enter를 눌러주세요.');
  await new Promise((resolve) => process.stdin.once('data', resolve));
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

function findChrome() {
  const chrome = CHROME_PATHS.find((candidate) => candidate && fs.existsSync(candidate));
  if (!chrome) throw new Error('Chrome executable not found. Set CHROME_PATH in .env.local.');
  return chrome;
}
