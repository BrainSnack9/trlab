import './load-env.js';
import { z } from 'zod';

const blankToUndefined = (value) => (value === '' ? undefined : value);
const optionalString = z.preprocess(blankToUndefined, z.string().optional());
const optionalUrl = z.preprocess(blankToUndefined, z.string().url().optional());

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().optional(),
  WAS_PORT: z.coerce.number().int().positive().default(5174),
  TRLAB_URL: optionalUrl,
  WAS_URL: optionalUrl,
  COLLECT_EVERY_MINUTES: z.coerce.number().int().positive().default(30),
  RANK_TIMES: z.string().default(''),
  COLLECTOR_TEST: optionalString,
  SUPABASE_URL: optionalUrl,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  DATABASE_PROVIDER: z.enum(['sqlite', 'supabase']).default('sqlite'),
  DATABASE_URL: optionalUrl,
  SUPABASE_DB_HOST: optionalString,
  SUPABASE_DB_PORT: z.coerce.number().int().positive().optional(),
  SUPABASE_DB_NAME: optionalString,
  SUPABASE_DB_USER: optionalString,
  SUPABASE_DB_PASSWORD: optionalString,
  LOG_LEVEL: z.string().default('info')
});

export const env = envSchema.parse(process.env);

export function getWasPort() {
  return env.PORT ?? env.WAS_PORT;
}

export function getWasBaseUrl() {
  return env.TRLAB_URL ?? env.WAS_URL ?? `http://localhost:${getWasPort()}`;
}

export function hasSupabaseConfig() {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export function hasPostgresConfig() {
  return Boolean(env.DATABASE_URL || (env.SUPABASE_DB_HOST && env.SUPABASE_DB_PASSWORD));
}

export function shouldUseSupabaseDatabase() {
  return env.DATABASE_PROVIDER === 'supabase' && hasPostgresConfig();
}
