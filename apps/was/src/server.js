import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { logger } from '#trlab/libraries/logger/logger';
import { getWasPort } from '#trlab/modules/configs/env';
import { routes } from '#trlab/modules/routes/index';

const PORT = getWasPort();
const generatedCardNewsDir = path.join(process.cwd(), 'public', 'generated', 'cardnews');

const server = http.createServer(async (incoming, outgoing) => {
  try {
    const request = await toWebRequest(incoming);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return send(outgoing, new Response(null, { status: 204 }));
    }

    if (url.pathname === '/health') {
      return send(outgoing, Response.json({ ok: true, service: 'trlab-was' }));
    }

    if (request.method === 'GET' && url.pathname.startsWith('/generated/cardnews/')) {
      return send(outgoing, await serveGeneratedCardNews(url.pathname));
    }

    const match = routes.find(([method, pattern]) => method === request.method && pattern.test(url.pathname));
    if (!match) return send(outgoing, Response.json({ error: 'not_found' }, { status: 404 }));

    const route = await import(new URL(match[2], import.meta.resolve('#trlab/modules/routes/index')).href);
    const response = await route[match[3]](request);
    return send(outgoing, response);
  } catch (error) {
    logger.error({ err: error }, 'request failed');
    return send(outgoing, Response.json({ error: 'internal_error', message: error.message }, { status: 500 }));
  }
});

server.listen(PORT, () => {
  logger.info({ port: PORT }, `TrLab WAS listening on http://localhost:${PORT}`);
});

async function toWebRequest(incoming) {
  const origin = `http://${incoming.headers.host ?? `localhost:${PORT}`}`;
  const url = new URL(incoming.url ?? '/', origin);
  const chunks = [];
  for await (const chunk of incoming) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const init = {
    method: incoming.method,
    headers: incoming.headers,
    body
  };
  if (body) init.duplex = 'half';
  return new Request(url, init);
}

async function send(outgoing, response) {
  outgoing.statusCode = response.status;
  outgoing.setHeader('Access-Control-Allow-Origin', '*');
  outgoing.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  outgoing.setHeader('Access-Control-Allow-Headers', 'content-type,authorization');
  response.headers.forEach((value, key) => outgoing.setHeader(key, value));
  const body = response.body ? Buffer.from(await response.arrayBuffer()) : Buffer.alloc(0);
  outgoing.end(body);
}

async function serveGeneratedCardNews(pathname) {
  const filename = decodeURIComponent(path.basename(pathname));
  if (!filename || filename === '.' || filename === '..') {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

  const filePath = path.join(generatedCardNewsDir, filename);
  if (!filePath.startsWith(`${generatedCardNewsDir}${path.sep}`)) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

  try {
    const body = await readFile(filePath);
    return new Response(body, {
      headers: {
        'content-type': contentTypeFor(filename),
        'cache-control': 'public, max-age=86400, immutable'
      }
    });
  } catch {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }
}

function contentTypeFor(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.svg') return 'image/svg+xml; charset=utf-8';
  return 'application/octet-stream';
}
