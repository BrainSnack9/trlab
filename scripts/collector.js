const BASE_URL = process.env.TRLAB_URL ?? 'http://localhost:5173';
const COLLECT_EVERY_MINUTES = Number(process.env.COLLECT_EVERY_MINUTES ?? 30);
const RANK_TIMES = (process.env.RANK_TIMES ?? '00:00,06:00,12:00,18:00').split(',').map(parseTime).sort(compareTime);
const TEST_MODE = process.env.COLLECTOR_TEST === '1';

let collectTimer;
let rankTimer;

async function collectAll(reason = 'scheduled-30m') {
  const started = new Date();
  try {
    const response = await fetch(`${BASE_URL}/api/signals/collect?reason=${reason}&exclude=fmkorea`, { cache: 'no-store' });
    const data = await response.json();
    const ok = data.sources?.filter((source) => source.status === 'ok').length ?? 0;
    const failed = data.sources?.filter((source) => source.status !== 'ok').length ?? 0;
    log(`${stamp(started)} collect all: ${data.count ?? 0} items, ok ${ok}, failed ${failed}`);
    await collectFmKoreaBrowser();
  } catch (error) {
    log(`${stamp(started)} collect all failed: ${error.message}`, true);
  }
}

async function collectFmKoreaBrowser() {
  try {
    const { spawn } = await import('node:child_process');
    const child = spawn(process.execPath, ['scripts/fmkorea-browser-collect.js'], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', (data) => log(data.toString().trim()));
    child.stderr.on('data', (data) => log(data.toString().trim(), true));
  } catch (error) {
    log(`${stamp()} FMKorea browser collect failed: ${error.message}`, true);
  }
}

async function processRanking(reason = 'scheduled-rank') {
  const started = new Date();
  try {
    const url = `${BASE_URL}/api/trends/rank?verify=1&verifyLimit=8&ai=1&aiLimit=8&limit=8&reason=${reason}`;
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();
    const ai = data.ai?.enabled ? `${data.ai.provider} ${data.ai.analyzed}` : 'off';
    log(`${stamp(started)} trend rank: input ${data.inputCount ?? 0}, candidates ${data.candidateCount ?? 0}, ai ${ai}`);
  } catch (error) {
    log(`${stamp(started)} trend rank failed: ${error.message}`, true);
  } finally {
    scheduleNextRanking();
  }
}

function start() {
  log(`TrLab collector started: ${BASE_URL}`);
  log(`collection: every ${TEST_MODE ? '30 seconds' : `${COLLECT_EVERY_MINUTES} minutes`}`);
  log(`trend reflection: ${RANK_TIMES.map(formatTime).join(', ')}`);
  setTimeout(() => collectAll('worker-start'), 1500);
  collectTimer = setInterval(() => collectAll(), TEST_MODE ? 30000 : COLLECT_EVERY_MINUTES * 60000);
  scheduleNextRanking();
}

function scheduleNextRanking() {
  if (rankTimer) clearTimeout(rankTimer);
  const next = getNextRankTime();
  rankTimer = setTimeout(() => processRanking(`scheduled-${formatTime(next)}`), TEST_MODE ? 45000 : next - Date.now());
  log(`next trend reflection: ${TEST_MODE ? '45 seconds' : next.toISOString()}`);
}

function getNextRankTime() {
  const now = new Date();
  const today = RANK_TIMES.map(({ hour, minute }) => atTime(now, hour, minute)).find((time) => time > now);
  if (today) return today;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  return atTime(tomorrow, RANK_TIMES[0].hour, RANK_TIMES[0].minute);
}

function atTime(base, hour, minute) {
  const date = new Date(base);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function parseTime(value) {
  const [hour, minute] = value.trim().split(':').map(Number);
  return { hour, minute };
}

function compareTime(a, b) {
  return (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute);
}

function formatTime(value) {
  const hour = value.hour ?? value.getHours();
  const minute = value.minute ?? value.getMinutes();
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function stop() {
  if (collectTimer) clearInterval(collectTimer);
  if (rankTimer) clearTimeout(rankTimer);
  log('TrLab collector stopped.');
  process.exit(0);
}

function stamp(date = new Date()) {
  return `[${date.toISOString()}]`;
}

function log(message, error = false) {
  (error ? console.error : console.log)(message);
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

start();
