import { all, get, run } from '#trlab/libraries/storage/index';
import { desc, eq } from 'drizzle-orm';
import { getPostgresClient } from '#trlab/libraries/storage/postgres';
import { contentPlansTable, ensurePostgresSchema } from '#trlab/libraries/storage/postgres-schema';
import { shouldUseSupabaseDatabase } from '#trlab/modules/configs/env';
import { repairDeep } from '#trlab/modules/helpers/text-repair';

export const PLAN_VERSION = 'v6';

export function planIdFor(candidate) {
  const key = candidate?.id || candidate?.keyword || candidate?.label || 'content';
  return `plan-${PLAN_VERSION}-${hash(key)}`;
}

export async function getContentPlan(candidate) {
  if (shouldUseSupabaseDatabase()) return getPostgresContentPlan(candidate);
  const id = planIdFor(candidate);
  const row = await get('SELECT * FROM content_plans WHERE id = ?', [id]);
  return row ? rowToPlan(row) : null;
}

export async function saveContentPlan(candidate, plan) {
  if (shouldUseSupabaseDatabase()) return savePostgresContentPlan(candidate, plan);
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
  if (shouldUseSupabaseDatabase()) return listPostgresContentPlans(limit);
  const rows = await all('SELECT * FROM content_plans ORDER BY updated_at DESC LIMIT ?', [limit]);
  return rows.map(rowToPlan);
}

async function getPostgresContentPlan(candidate) {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  const id = planIdFor(candidate);
  const rows = await db.select().from(contentPlansTable).where(eq(contentPlansTable.id, id)).limit(1);
  return rows[0] ? postgresRowToPlan(rows[0]) : null;
}

async function savePostgresContentPlan(candidate, plan) {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  const now = new Date().toISOString();
  const id = planIdFor(candidate);
  await db.insert(contentPlansTable)
    .values({
      id,
      candidateId: candidate?.id ?? '',
      keyword: candidate?.label ?? candidate?.keyword ?? '',
      plan,
      candidate: candidate ?? {},
      provider: plan?.provider ?? '',
      status: 'draft',
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: contentPlansTable.id,
      set: {
        plan,
        candidate: candidate ?? {},
        provider: plan?.provider ?? '',
        updatedAt: now
      }
    });
  return getPostgresContentPlan(candidate);
}

async function listPostgresContentPlans(limit = 30) {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  const rows = await db.select().from(contentPlansTable).orderBy(desc(contentPlansTable.updatedAt)).limit(limit);
  return rows.map(postgresRowToPlan);
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

function postgresRowToPlan(row) {
  return {
    id: row.id,
    candidateId: row.candidateId,
    keyword: row.keyword,
    provider: row.provider,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    plan: repairDeep(row.plan ?? {}),
    candidate: repairDeep(row.candidate ?? {})
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
