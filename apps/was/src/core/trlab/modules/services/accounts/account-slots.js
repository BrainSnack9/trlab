import { all, write } from '#trlab/libraries/storage/index';
import { asc, eq, inArray } from 'drizzle-orm';
import { getPostgresClient } from '#trlab/libraries/storage/postgres';
import { accountSlotsTable, ensurePostgresSchema } from '#trlab/libraries/storage/postgres-schema';
import { shouldUseSupabaseDatabase } from '#trlab/modules/configs/env';

export async function getAccountSlots() {
  if (shouldUseSupabaseDatabase()) return getPostgresAccountSlots();
  await cleanupLegacyDefaultSlots();
  const rows = await all(`
    SELECT id, label, profile_id AS profileId, sort_order AS sortOrder, created_at AS createdAt, updated_at AS updatedAt
    FROM account_slots
    ORDER BY sort_order ASC, id ASC
  `);
  return rows.map(fromRow);
}

export async function saveAccountSlots(inputSlots = []) {
  if (shouldUseSupabaseDatabase()) return savePostgresAccountSlots(inputSlots);
  const now = new Date().toISOString();
  const slots = normalizeSlots(inputSlots);
  const ids = slots.map((slot) => slot.id);
  await write((database) => {
    if (ids.length) {
      const placeholders = ids.map(() => '?').join(', ');
      database.run(`DELETE FROM account_slots WHERE id NOT IN (${placeholders})`, ids);
    } else {
      database.run('DELETE FROM account_slots');
    }
    slots.forEach((slot, index) => {
      database.run(`
        INSERT INTO account_slots (id, label, profile_id, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          label = excluded.label,
          profile_id = excluded.profile_id,
          sort_order = excluded.sort_order,
          updated_at = excluded.updated_at
      `, [slot.id, slot.label, slot.profileId, index, now, now]);
    });
  });
  return getAccountSlots();
}

async function getPostgresAccountSlots() {
  await ensurePostgresSchema();
  await cleanupPostgresLegacyDefaultSlots();
  const db = getPostgresClient();
  const rows = await db.select().from(accountSlotsTable).orderBy(asc(accountSlotsTable.sortOrder), asc(accountSlotsTable.id));
  return rows.map(fromPostgresRow);
}

async function savePostgresAccountSlots(inputSlots = []) {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  const now = new Date().toISOString();
  const slots = normalizeSlots(inputSlots);
  const ids = slots.map((slot) => slot.id);
  if (ids.length) {
    const deletedIds = await getDeletedPostgresSlotIds(ids);
    if (deletedIds.length) await db.delete(accountSlotsTable).where(inArray(accountSlotsTable.id, deletedIds));
  } else {
    await db.delete(accountSlotsTable);
  }
  for (const [index, slot] of slots.entries()) {
    await db.insert(accountSlotsTable)
      .values({
        id: slot.id,
        label: slot.label,
        profileId: slot.profileId,
        sortOrder: index,
        createdAt: now,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: accountSlotsTable.id,
        set: {
          label: slot.label,
          profileId: slot.profileId,
          sortOrder: index,
          updatedAt: now
        }
      });
  }
  return getPostgresAccountSlots();
}

async function getDeletedPostgresSlotIds(nextIds) {
  const db = getPostgresClient();
  const rows = await db.select({ id: accountSlotsTable.id }).from(accountSlotsTable);
  const nextIdSet = new Set(nextIds);
  return rows.map((row) => row.id).filter((id) => !nextIdSet.has(id));
}

async function cleanupLegacyDefaultSlots() {
  const rows = await all(`
    SELECT id, label, profile_id AS profileId
    FROM account_slots
    ORDER BY sort_order ASC, id ASC
  `);
  if (!isBlankLegacyDefaultSet(rows)) return;
  await write((database) => {
    database.run('DELETE FROM account_slots');
  });
}

async function cleanupPostgresLegacyDefaultSlots() {
  const db = getPostgresClient();
  const rows = await db.select({
    id: accountSlotsTable.id,
    label: accountSlotsTable.label,
    profileId: accountSlotsTable.profileId
  }).from(accountSlotsTable).orderBy(asc(accountSlotsTable.sortOrder), asc(accountSlotsTable.id));
  if (!isBlankLegacyDefaultSet(rows)) return;
  await db.delete(accountSlotsTable);
}

function isBlankLegacyDefaultSet(rows) {
  if (!rows.length) return false;
  return rows.every((row, index) => {
    const number = index + 1;
    return row.id === `account-${number}` && row.label === `계정 ${number}` && !clean(row.profileId);
  });
}

function normalizeSlots(slots = []) {
  const input = Array.isArray(slots) ? slots : [];
  const seen = new Set();
  return input.map((slot, index) => {
    const id = uniqueId(clean(slot?.id) || `account-${index + 1}`, seen);
    return {
      id,
      label: clean(slot?.label) || `계정 ${index + 1}`,
      profileId: clean(slot?.profileId ?? slot?.profile_id),
      sortOrder: index
    };
  });
}

function uniqueId(base, seen) {
  const normalized = base.replace(/[^a-zA-Z0-9_-]/g, '-') || `account-${seen.size + 1}`;
  let id = normalized;
  let index = 2;
  while (seen.has(id)) {
    id = `${normalized}-${index}`;
    index += 1;
  }
  seen.add(id);
  return id;
}

function fromRow(row) {
  return {
    id: row.id,
    label: row.label,
    profileId: row.profileId ?? '',
    sortOrder: Number(row.sortOrder) || 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function fromPostgresRow(row) {
  return {
    id: row.id,
    label: row.label,
    profileId: row.profileId ?? '',
    sortOrder: Number(row.sortOrder) || 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function clean(value) {
  return `${value ?? ''}`.replace(/\s+/g, ' ').trim();
}
