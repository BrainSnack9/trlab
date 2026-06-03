import { env, getWasBaseUrl } from '#trlab/modules/configs/env';
import { logger } from '#trlab/libraries/logger/logger';

const DEFAULT_INTERVAL = env.COLLECT_EVERY_MINUTES;
const MIN_INTERVAL = 5;
const MAX_INTERVAL = 240;
const MAX_EVENTS = 40;

const state = {
  enabled: false,
  running: false,
  intervalMinutes: DEFAULT_INTERVAL,
  timer: null,
  startedAt: null,
  nextRunAt: null,
  currentRun: null,
  lastRun: null,
  events: []
};

export function getCollectorRuntimeStatus() {
  return publicStatus();
}

export async function updateCollectorRuntime(action, payload = {}) {
  if (action === 'start') return startCollectorRuntime(payload);
  if (action === 'stop') return stopCollectorRuntime();
  if (action === 'configure') return configureCollectorRuntime(payload);
  if (action === 'collect-now') return collectNow(payload);
  return { error: 'invalid_action', message: 'Unsupported collector action' };
}

function startCollectorRuntime(payload = {}) {
  const intervalMinutes = normalizeInterval(payload.intervalMinutes ?? state.intervalMinutes);
  state.enabled = true;
  state.intervalMinutes = intervalMinutes;
  state.startedAt = state.startedAt ?? new Date().toISOString();
  scheduleNextRun();
  pushEvent({ type: 'scheduler-started', status: 'ok', message: `${intervalMinutes} minute interval enabled` });
  return publicStatus();
}

function stopCollectorRuntime() {
  if (state.timer) clearTimeout(state.timer);
  state.timer = null;
  state.enabled = false;
  state.nextRunAt = null;
  state.startedAt = null;
  pushEvent({ type: 'scheduler-stopped', status: 'ok', message: 'scheduled collection stopped' });
  return publicStatus();
}

function configureCollectorRuntime(payload = {}) {
  const intervalMinutes = normalizeInterval(payload.intervalMinutes ?? state.intervalMinutes);
  state.intervalMinutes = intervalMinutes;
  if (state.enabled) scheduleNextRun();
  pushEvent({ type: 'scheduler-configured', status: 'ok', message: `${intervalMinutes} minute interval configured` });
  return publicStatus();
}

async function collectNow(payload = {}) {
  runCollection(payload.reason ?? 'manual-runtime', { force: payload.force === true }).catch((error) => {
    logger.error({ err: error }, 'runtime collect failed');
  });
  return publicStatus();
}

function scheduleNextRun() {
  if (state.timer) clearTimeout(state.timer);
  if (!state.enabled) return;
  const delay = state.intervalMinutes * 60 * 1000;
  state.nextRunAt = new Date(Date.now() + delay).toISOString();
  state.timer = setTimeout(() => {
    state.timer = null;
    runCollection('scheduled-runtime').finally(() => {
      if (state.enabled) scheduleNextRun();
    });
  }, delay);
}

async function runCollection(reason, { force = false } = {}) {
  if (state.running && !force) {
    pushEvent({ type: 'collect-skipped', status: 'skipped', message: 'collection already running' });
    return;
  }
  const runId = `collect-${Date.now()}`;
  const startedAt = new Date().toISOString();
  state.running = true;
  state.currentRun = { id: runId, reason, startedAt, status: 'running' };
  pushEvent({ type: 'collect-started', status: 'running', reason, startedAt, message: 'collection started' });
  try {
    const response = await fetch(`${getWasBaseUrl()}/api/signals/collect?reason=${encodeURIComponent(reason)}&exclude=fmkorea`, { cache: 'no-store' });
    const data = await response.json();
    const finishedAt = new Date().toISOString();
    const ok = data.sources?.filter((source) => source.status === 'ok').length ?? 0;
    const failed = data.sources?.filter((source) => source.status !== 'ok').length ?? 0;
    state.lastRun = { id: runId, reason, startedAt, finishedAt, status: response.ok ? 'ok' : 'failed', count: data.count ?? 0, ok, failed, sources: data.sources ?? [] };
    pushEvent({ type: 'collect-finished', status: state.lastRun.status, reason, startedAt, finishedAt, count: data.count ?? 0, ok, failed, message: `collected ${data.count ?? 0} signals` });
  } catch (error) {
    const finishedAt = new Date().toISOString();
    state.lastRun = { id: runId, reason, startedAt, finishedAt, status: 'failed', count: 0, ok: 0, failed: 0, error: error.message };
    pushEvent({ type: 'collect-failed', status: 'failed', reason, startedAt, finishedAt, error: error.message, message: error.message });
  } finally {
    state.running = false;
    state.currentRun = null;
  }
}

function normalizeInterval(value) {
  const interval = Number(value);
  if (!Number.isFinite(interval)) return DEFAULT_INTERVAL;
  return Math.max(MIN_INTERVAL, Math.min(MAX_INTERVAL, Math.round(interval)));
}

function pushEvent(event) {
  state.events = [{ id: `${Date.now()}-${state.events.length}`, at: new Date().toISOString(), ...event }, ...state.events].slice(0, MAX_EVENTS);
}

function publicStatus() {
  return {
    enabled: state.enabled,
    running: state.running,
    intervalMinutes: state.intervalMinutes,
    minIntervalMinutes: MIN_INTERVAL,
    maxIntervalMinutes: MAX_INTERVAL,
    startedAt: state.startedAt,
    nextRunAt: state.nextRunAt,
    currentRun: state.currentRun,
    lastRun: state.lastRun,
    events: state.events
  };
}
