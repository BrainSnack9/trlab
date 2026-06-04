import { all, run } from '#trlab/libraries/storage/index';
import { desc, eq } from 'drizzle-orm';
import { getPostgresClient } from '#trlab/libraries/storage/postgres';
import { candidateFeedbackTable, ensurePostgresSchema } from '#trlab/libraries/storage/postgres-schema';
import { shouldUseSupabaseDatabase } from '#trlab/modules/configs/env';

const actionWeights = new Map([
  ['view', 1],
  ['select', 4],
  ['queue', 9],
  ['positive', 12],
  ['plan', 16],
  ['reject', -16],
  ['hide', -10]
]);

export async function saveCandidateFeedback(payload = {}) {
  const record = normalizeFeedback(payload);
  if (!record.keyword) throw new Error('Missing feedback keyword');
  if (shouldUseSupabaseDatabase()) return savePostgresFeedback(record);
  await run(`
    INSERT INTO candidate_feedback (
      candidate_id, keyword, keyword_key, action, weight, profile_id, area_id, reason, source, candidate_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    record.candidateId,
    record.keyword,
    record.keywordKey,
    record.action,
    record.weight,
    record.profileId,
    record.areaId,
    record.reason,
    record.source,
    JSON.stringify(record.candidate),
    record.createdAt
  ]);
  return record;
}

export async function getCandidateFeedbackSummary({ limit = 500 } = {}) {
  const rows = shouldUseSupabaseDatabase()
    ? await listPostgresFeedback(limit)
    : await all('SELECT * FROM candidate_feedback ORDER BY created_at DESC LIMIT ?', [limit]);
  return summarizeFeedback(rows.map(rowToFeedback));
}

export async function deleteCandidateFeedback({ candidateId } = {}) {
  if (!candidateId) return { deleted: 0 };
  if (shouldUseSupabaseDatabase()) {
    await ensurePostgresSchema();
    const db = getPostgresClient();
    await db.delete(candidateFeedbackTable).where(eq(candidateFeedbackTable.candidateId, candidateId));
    return { deleted: 1 };
  }
  await run('DELETE FROM candidate_feedback WHERE candidate_id = ?', [candidateId]);
  return { deleted: 1 };
}

function normalizeFeedback(payload) {
  const candidate = payload.candidate ?? {};
  const keyword = compact(payload.keyword ?? candidate.keyword ?? candidate.label);
  const action = normalizeAction(payload.action);
  const profile = candidate.channelFit?.bestProfile ?? {};
  const area = candidate.area ?? {};
  return {
    candidateId: compact(payload.candidateId ?? candidate.id),
    keyword,
    keywordKey: keywordKey(keyword),
    action,
    weight: actionWeights.get(action) ?? 0,
    profileId: compact(payload.profileId ?? profile.id),
    areaId: compact(payload.areaId ?? area.id),
    reason: compact(payload.reason, 120),
    source: compact(payload.source ?? 'ui', 40),
    candidate: compactCandidate(candidate),
    createdAt: new Date().toISOString()
  };
}

async function savePostgresFeedback(record) {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  await db.insert(candidateFeedbackTable).values({
    candidateId: record.candidateId,
    keyword: record.keyword,
    keywordKey: record.keywordKey,
    action: record.action,
    weight: record.weight,
    profileId: record.profileId,
    areaId: record.areaId,
    reason: record.reason,
    source: record.source,
    candidate: record.candidate,
    createdAt: record.createdAt
  });
  return record;
}

async function listPostgresFeedback(limit) {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  return db.select().from(candidateFeedbackTable).orderBy(desc(candidateFeedbackTable.createdAt)).limit(limit);
}

function summarizeFeedback(rows) {
  const summary = { keywords: {}, profiles: {}, areas: {}, total: rows.length };
  rows.forEach((row, index) => {
    const decay = Math.max(0.35, 1 - index / 900);
    add(summary.keywords, row.keywordKey, row.weight * decay);
    add(summary.profiles, row.profileId, row.weight * decay);
    add(summary.areas, row.areaId, row.weight * decay);
  });
  return summary;
}

export function getFeedbackBias(candidate, summary = {}) {
  const keyBias = summary.keywords?.[keywordKey(candidate.keyword)] ?? 0;
  const profileBias = summary.profiles?.[candidate.channelFit?.bestProfile?.id] ?? 0;
  const areaBias = summary.areas?.[candidate.area?.id] ?? 0;
  const total = keyBias
    ? keyBias + profileBias * 0.12 + areaBias * 0.06
    : profileBias * 0.45 + areaBias * 0.22;
  return Math.max(-24, Math.min(20, Math.round(total)));
}

export function applyFeedbackBias(candidate, summary) {
  const bias = getFeedbackBias(candidate, summary);
  if (!bias) return candidate;
  const next = {
    ...candidate,
    feedback: { bias },
    scoring: {
      ...candidate.scoring,
      feedback: bias,
      total: clamp((candidate.scoring?.total ?? candidate.score ?? 0) + bias, 1, 100)
    },
    score: clamp((candidate.score ?? 0) + bias, 1, 100),
    validation: {
      ...candidate.validation,
      score: clamp((candidate.validation?.score ?? candidate.score ?? 0) + Math.round(bias * 0.7), 1, 100)
    }
  };
  return next;
}

function rowToFeedback(row) {
  return {
    keyword: row.keyword,
    keywordKey: row.keywordKey ?? row.keyword_key,
    action: row.action,
    weight: Number(row.weight ?? 0),
    profileId: row.profileId ?? row.profile_id ?? '',
    areaId: row.areaId ?? row.area_id ?? '',
    createdAt: row.createdAt ?? row.created_at
  };
}

function add(target, key, value) {
  if (!key) return;
  target[key] = (target[key] ?? 0) + value;
}

function normalizeAction(action) {
  const value = `${action ?? ''}`.toLowerCase();
  return actionWeights.has(value) ? value : 'view';
}

export function keywordKey(value) {
  return `${value ?? ''}`.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

function compactCandidate(candidate = {}) {
  return {
    id: candidate.id,
    keyword: candidate.keyword,
    label: candidate.label,
    area: candidate.area,
    production: candidate.production,
    channelFit: candidate.channelFit,
    sources: candidate.sources,
    sampleTitles: (candidate.sampleTitles ?? []).slice(0, 5)
  };
}

function compact(value, limit = 80) {
  const text = `${value ?? ''}`.replace(/\s+/g, ' ').trim();
  return text.length > limit ? text.slice(0, limit) : text;
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}
