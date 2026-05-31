import { getDb } from './db';
import { repairDeep } from './text-repair';

export function planIdFor(candidate) {
  const key = candidate?.id || candidate?.keyword || candidate?.label || 'content';
  return `plan-${hash(key)}`;
}

export function getContentPlan(candidate) {
  const id = planIdFor(candidate);
  const row = getDb().prepare('SELECT * FROM content_plans WHERE id = ?').get(id);
  return row ? rowToPlan(row) : null;
}

export function saveContentPlan(candidate, plan) {
  const now = new Date().toISOString();
  const id = planIdFor(candidate);
  getDb().prepare(`
    INSERT INTO content_plans (id, candidate_id, keyword, plan_json, candidate_json, provider, status, created_at, updated_at)
    VALUES (@id, @candidateId, @keyword, @planJson, @candidateJson, @provider, 'draft', @now, @now)
    ON CONFLICT(id) DO UPDATE SET
      plan_json = excluded.plan_json,
      candidate_json = excluded.candidate_json,
      provider = excluded.provider,
      updated_at = excluded.updated_at
  `).run({
    id,
    candidateId: candidate?.id ?? '',
    keyword: candidate?.label ?? candidate?.keyword ?? '',
    planJson: JSON.stringify(plan),
    candidateJson: JSON.stringify(candidate ?? {}),
    provider: plan?.provider ?? '',
    now
  });
  return getContentPlan(candidate);
}

export function listContentPlans(limit = 30) {
  return getDb().prepare('SELECT * FROM content_plans ORDER BY updated_at DESC LIMIT ?').all(limit).map(rowToPlan);
}

function rowToPlan(row) {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    keyword: row.keyword,
    provider: row.provider,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    plan: repairDeep(parseJson(row.plan_json, {})),
    candidate: repairDeep(parseJson(row.candidate_json, {}))
  };
}

function parseJson(value, fallback) {
  try { return JSON.parse(value || ''); } catch { return fallback; }
}

function hash(value = '') {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) result = (result * 31 + value.charCodeAt(index)) >>> 0;
  return result.toString(36);
}
