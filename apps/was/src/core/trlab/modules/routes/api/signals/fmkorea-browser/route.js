import { spawn } from 'node:child_process';
import { saveCollectionResult } from '#trlab/modules/services/signals/signal-store';
import { badRequest, parseSearchParams } from '#trlab/modules/routes/validators/common';
import { fmkoreaBrowserQuerySchema } from '#trlab/modules/routes/validators/schemas';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  let query;
  try {
    query = parseSearchParams(request, fmkoreaBrowserQuerySchema);
  } catch (error) {
    return badRequest(error);
  }

  try {
    const result = await runBrowserCollector(query.auth === '1');
    const payload = {
      source: 'FMKorea',
      status: 'ok',
      error: '',
      items: result.items ?? []
    };
    await saveCollectionResult({
      payloads: [payload],
      startedAt: result.startedAt ?? new Date().toISOString(),
      finishedAt: result.finishedAt ?? new Date().toISOString(),
      reason: result.reason ?? 'fmkorea-browser'
    });

    return Response.json({
      ok: true,
      source: 'FMKorea',
      count: payload.items.length,
      items: payload.items
    });
  } catch (error) {
    return Response.json({
      ok: false,
      source: 'FMKorea',
      error: error instanceof Error ? error.message : 'FMKorea browser collect failed'
    }, { status: 500 });
  }
}

function runBrowserCollector(authMode) {
  return new Promise((resolve, reject) => {
    const args = ['src/core/trlab/scripts/fmkorea-browser-collect.js', '--no-import'];
    if (authMode) args.push('--auth');
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        FMKOREA_AUTH_WAIT_MS: process.env.FMKOREA_AUTH_WAIT_MS ?? '45000',
        FMKOREA_HEADLESS: authMode ? '0' : process.env.FMKOREA_HEADLESS
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr.trim() || stdout.trim() || `collector exited with ${code}`));
      try {
        const jsonLine = stdout.trim().split('\n').reverse().find((line) => line.trim().startsWith('{'));
        if (!jsonLine) throw new Error(stdout.trim() || 'collector returned no JSON');
        resolve(JSON.parse(jsonLine));
      } catch (error) {
        reject(error);
      }
    });
  });
}
