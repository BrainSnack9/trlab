import { all, get, run } from '#trlab/libraries/storage/index';
import { repairDeep } from '#trlab/modules/helpers/text-repair';

export const PLAN_VERSION = 'v6';

export function planIdFor(candidate) {
  const key = candidate?.id || candidate?.keyword || candidate?.label || 'content';
  return `plan-${PLAN_VERSION}-${hash(key)}`;
}

export async function getContentPlan(candidate) {
  const id = planIdFor(candidate);
  const row = await get('SELECT * FROM content_plans WHERE id = ?', [id]);
  return row ? rowToPlan(row) : null;
}

export async function saveContentPlan(candidate, plan) {
  const now = new Date().toISOString();
  const id = planIdFor(candidate);
  await run(`
    INSERT INTO content_plans (id, candidate_id, keyword, plan_json, candidate_json, provider, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      plan_json = excluded.plan_json,
      candidate_json = excluded.candidate_json,
      provider = excluded.provider,
      updated_at = excluded.updated_at
  `, [
    id,
    candidate?.id ?? '',
    candidate?.label ?? candidate?.keyword ?? '',
    JSON.stringify(plan),
    JSON.stringify(candidate ?? {}),
    plan?.provider ?? '',
    now,
    now
  ]);
  return getContentPlan(candidate);
}

export async function listContentPlans(limit = 30) {
  const rows = await all('SELECT * FROM content_plans ORDER BY updated_at DESC LIMIT ?', [limit]);
  return rows.map(rowToPlan);
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
