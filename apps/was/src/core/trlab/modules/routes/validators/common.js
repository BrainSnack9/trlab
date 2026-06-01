import { z } from 'zod';

export const booleanFlagSchema = z
  .string()
  .optional()
  .transform((value) => value !== '0');

export const positiveIntParam = (fallback, max = Number.MAX_SAFE_INTEGER) =>
  z
    .string()
    .optional()
    .transform((value) => Number(value ?? fallback))
    .pipe(z.number().int().positive().max(max));

export function parseSearchParams(request, schema) {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  return schema.parse(params);
}

export async function parseJsonBody(request, schema) {
  const body = await request.json();
  return schema.parse(body);
}

export function badRequest(error) {
  return Response.json({
    error: 'bad_request',
    message: error instanceof Error ? error.message : 'Invalid request'
  }, { status: 400 });
}
