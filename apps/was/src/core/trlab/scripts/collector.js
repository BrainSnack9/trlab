import cron from 'node-cron';
import { logger } from '#trlab/libraries/logger/logger';
import { env, getWasBaseUrl } from '#trlab/modules/configs/env';

const BASE_URL = getWasBaseUrl();
const COLLECT_EVERY_MINUTES = env.COLLECT_EVERY_MINUTES;
const RANK_TIMES = env.RANK_TIMES.split(',').map(parseTime).sort(compareTime);
const TEST_MODE = env.COLLECTOR_TEST === '1';

let collectTimer;
let rankTimer;
let collectTask;
const rankTasks = [];

async function collectAll(reason = 'scheduled-30m') {
  const started = new Date();
  try {
    const response = await fetch(`${BASE_URL}/api/signals/collect?reason=${reason}&exclude=fmkorea`, { cache: 'no-store' });
    const data = await response.json();
    const ok = data.sources?.filter((source) => source.status === 'ok').length ?? 0;
    const failed = data.sources?.filter((source) => source.status !== 'ok').length ?? 0;
    log('info', 'collect all finished', { startedAt: started.toISOString(), count: data.count ?? 0, ok, failed });
    await collectFmKoreaBrowser();
  } catch (error) {
    log('error', 'collect all failed', { err: error, startedAt: started.toISOString() });
  }
}

async function collectFmKoreaBrowser() {
  try {
    const { spawn } = await import('node:child_process');
    const child = spawn(process.execPath, ['src/core/trlab/scripts/fmkorea-browser-collect.js'], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', (data) => log('info', data.toString().trim()));
    child.stderr.on('data', (data) => log('error', data.toString().trim()));
  } catch (error) {
    log('error', 'FMKorea browser collect failed', { err: error });
  }
}

async function processRanking(reason = 'scheduled-rank') {
  const started = new Date();
  try {
    const url = `${BASE_URL}/api/trends/rank?verify=0&ai=1&aiLimit=8&limit=8&reason=${reason}`;
    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();
    const ai = data.ai?.enabled ? `${data.ai.provider} ${data.ai.analyzed}` : 'off';
    log('info', 'trend rank finished', { startedAt: started.toISOString(), input: data.inputCount ?? 0, candidates: data.candidateCount ?? 0, ai });
  } catch (error) {
    log('error', 'trend rank failed', { err: error, startedAt: started.toISOString() });
  }
}

function start() {
  log('info', 'TrLab collector started', { baseUrl: BASE_URL });
  log('info', 'collection schedule ready', { every: TEST_MODE ? '30 seconds' : `${COLLECT_EVERY_MINUTES} minutes` });
  log('info', 'trend reflection schedule ready', { times: RANK_TIMES.map(formatTime) });
  setTimeout(() => collectAll('worker-start'), 1500);
  if (TEST_MODE) {
    collectTimer = setInterval(() => collectAll(), 30000);
    rankTimer = setInterval(() => processRanking('scheduled-test'), 45000);
    return;
  }
  collectTask = cron.schedule(`*/${COLLECT_EVERY_MINUTES} * * * *`, () => collectAll(), { name: 'collect-signals' });
  RANK_TIMES.forEach((time) => {
    rankTasks.push(cron.schedule(`${time.minute} ${time.hour} * * *`, () => processRanking(`scheduled-${formatTime(time)}`), { name: `rank-${formatTime(time)}` }));
  });
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
  collectTask?.stop();
  rankTasks.forEach((task) => task.stop());
  log('info', 'TrLab collector stopped');
  process.exit(0);
}

function log(level, message, meta = {}) {
  logger[level](meta, message);
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

start();
