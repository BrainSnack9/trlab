import { all, get, run } from '#trlab/libraries/storage/index';
import { desc, eq } from 'drizzle-orm';
import { getPostgresClient } from '#trlab/libraries/storage/postgres';
import { contentImagesTable, ensurePostgresSchema } from '#trlab/libraries/storage/postgres-schema';
import { shouldUseSupabaseDatabase } from '#trlab/modules/configs/env';
import { planIdFor } from './content-plan-store.js';

export async function saveContentImageResult(payload, image) {
  if (shouldUseSupabaseDatabase()) return savePostgresContentImageResult(payload, image);
  const record = normalizeImageRecord(payload, image);
  await run(`
    INSERT INTO content_images (
      id, plan_id, card_key, url, provider, model, prompt, status,
      warnings_json, payload_json, image_json, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      url = excluded.url,
      provider = excluded.provider,
      model = excluded.model,
      prompt = excluded.prompt,
      status = excluded.status,
      warnings_json = excluded.warnings_json,
      payload_json = excluded.payload_json,
      image_json = excluded.image_json,
      updated_at = excluded.updated_at
  `, [
    record.id,
    record.planId,
    record.cardKey,
    record.url,
    record.provider,
    record.model,
    record.prompt,
    record.status,
    JSON.stringify(record.warnings),
    JSON.stringify(record.payload),
    JSON.stringify(record.image),
    record.createdAt,
    record.updatedAt
  ]);
  return getContentImage(record.id);
}

export async function getContentImage(id) {
  if (shouldUseSupabaseDatabase()) return getPostgresContentImage(id);
  const row = await get('SELECT * FROM content_images WHERE id = ?', [id]);
  return row ? sqliteRowToImage(row) : null;
}

export async function listContentImages({ planId = '', limit = 60 } = {}) {
  if (shouldUseSupabaseDatabase()) return listPostgresContentImages({ planId, limit });
  const rows = planId
    ? await all('SELECT * FROM content_images WHERE plan_id = ? ORDER BY created_at DESC LIMIT ?', [planId, limit])
    : await all('SELECT * FROM content_images ORDER BY created_at DESC LIMIT ?', [limit]);
  return rows.map(sqliteRowToImage);
}

async function savePostgresContentImageResult(payload, image) {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  const record = normalizeImageRecord(payload, image);
  await db.insert(contentImagesTable)
    .values(record)
    .onConflictDoUpdate({
      target: contentImagesTable.id,
      set: {
        url: record.url,
        provider: record.provider,
        model: record.model,
        prompt: record.prompt,
        status: record.status,
        warnings: record.warnings,
        payload: record.payload,
        image: record.image,
        updatedAt: record.updatedAt
      }
    });
  return getPostgresContentImage(record.id);
}

async function getPostgresContentImage(id) {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  const rows = await db.select().from(contentImagesTable).where(eq(contentImagesTable.id, id)).limit(1);
  return rows[0] ? postgresRowToImage(rows[0]) : null;
}

async function listPostgresContentImages({ planId = '', limit = 60 } = {}) {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  const query = db.select().from(contentImagesTable);
  const rows = planId
    ? await query.where(eq(contentImagesTable.planId, planId)).orderBy(desc(contentImagesTable.createdAt)).limit(limit)
    : await query.orderBy(desc(contentImagesTable.createdAt)).limit(limit);
  return rows.map(postgresRowToImage);
}

function normalizeImageRecord(payload = {}, image = {}) {
  const now = new Date().toISOString();
  const planId = inferPlanId(payload);
  const cardKey = inferCardKey(payload);
  const id = image.id || `image-${hash(`${planId}:${cardKey}:${image.url}:${image.prompt}`)}`;
  return {
    id,
    planId,
    cardKey,
    url: image.url,
    provider: image.provider ?? '',
    model: image.model ?? '',
    prompt: image.prompt ?? '',
    status: image.url ? 'ready' : 'failed',
    warnings: Array.isArray(image.warnings) ? image.warnings : [],
    payload: sanitizePayload(payload),
    image: { ...image, id },
    createdAt: now,
    updatedAt: now
  };
}

function inferPlanId(payload = {}) {
  if (payload.plan?.id) return `${payload.plan.id}`;
  if (payload.candidate) return planIdFor(payload.candidate);
  if (payload.plan?.candidate) return planIdFor(payload.plan.candidate);
  if (payload.studio?.selectedCandidate) return planIdFor(payload.studio.selectedCandidate);
  const candidate = {
    id: payload.studio?.selectedCandidateId || payload.plan?.candidateId || payload.card?.candidateId,
    keyword: payload.studio?.selectedKeyword || payload.plan?.keyword || payload.card?.keyword || payload.card?.title
  };
  return candidate.id || candidate.keyword ? planIdFor(candidate) : '';
}

function inferCardKey(payload = {}) {
  const card = payload.card ?? {};
  return [
    payload.index ?? card.index ?? '',
    card.role ?? '',
    card.layout ?? '',
    card.title ?? ''
  ].map((part) => `${part}`.trim()).filter(Boolean).join(':').slice(0, 180);
}

function sanitizePayload(payload = {}) {
  return {
    studio: payload.studio ?? {},
    plan: payload.plan ?? {},
    card: payload.card ?? {},
    style: payload.style ?? {},
    index: payload.index,
    editInstruction: payload.editInstruction,
    previousImagePrompt: payload.previousImagePrompt
  };
}

function sqliteRowToImage(row) {
  return {
    id: row.id,
    planId: row.plan_id,
    cardKey: row.card_key,
    url: row.url,
    provider: row.provider,
    model: row.model,
    prompt: row.prompt,
    status: row.status,
    warnings: parseJson(row.warnings_json, []),
    payload: parseJson(row.payload_json, {}),
    image: parseJson(row.image_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function postgresRowToImage(row) {
  return {
    id: row.id,
    planId: row.planId,
    cardKey: row.cardKey,
    url: row.url,
    provider: row.provider,
    model: row.model,
    prompt: row.prompt,
    status: row.status,
    warnings: Array.isArray(row.warnings) ? row.warnings : [],
    payload: row.payload ?? {},
    image: row.image ?? {},
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function parseJson(value, fallback) {
  try {
    const parsed = JSON.parse(value || '');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function hash(value = '') {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) result = (result * 31 + value.charCodeAt(index)) >>> 0;
  return result.toString(36);
}
