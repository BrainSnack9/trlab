import { z } from 'zod';
import { booleanFlagSchema, positiveIntParam } from './common.js';

export const collectSignalsQuerySchema = z.object({
  source: z.string().optional(),
  reason: z.string().optional(),
  exclude: z.string().default(''),
  areas: z.string().default('')
});

export const importSignalsBodySchema = z.object({
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  source: z.string().default('Manual Import'),
  status: z.string().default('ok'),
  error: z.string().default(''),
  reason: z.string().default('browser-import'),
  items: z.array(z.record(z.string(), z.unknown())).default([])
});

export const fmkoreaBrowserQuerySchema = z.object({
  auth: z.string().optional()
});

export const contentPlanBodySchema = z
  .record(z.string(), z.unknown())
  .refine((payload) => Boolean(payload?.label || payload?.keyword || payload?.manualBrief), 'Missing candidate');

export const contentImageBodySchema = z
  .object({
    card: z.record(z.string(), z.unknown()),
    studio: z.record(z.string(), z.unknown())
  })
  .passthrough();

export const searchVerifyQuerySchema = z.object({
  q: z.string().trim().min(1, 'Missing query'),
  type: z.string().trim().default('검증형')
});

export const latestTrendQuerySchema = z.object({
  scheduled: z.string().optional()
});

export const trendHistoryQuerySchema = z.object({
  limit: positiveIntParam(18, 60)
});

export const trendRankQuerySchema = z.object({
  limit: positiveIntParam(40, 100),
  verify: booleanFlagSchema,
  verifyLimit: positiveIntParam(5, 8),
  ai: booleanFlagSchema,
  aiLimit: positiveIntParam(8, 10),
  signalLimit: positiveIntParam(500, 2000),
  reason: z.string().default('manual-rank'),
  save: z.string().optional()
});
