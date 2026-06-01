import ky from 'ky';

const api = ky.create({
  timeout: 120000,
  retry: {
    limit: 1,
    methods: ['get'],
    statusCodes: [408, 429, 500, 502, 503, 504]
  },
  hooks: {
    beforeError: [
      async (error) => {
        const { response } = error;
        if (response?.headers.get('content-type')?.includes('application/json')) {
          const body = await response.json().catch(() => null);
          error.message = body?.message ?? body?.error ?? error.message;
        }
        return error;
      }
    ]
  }
});

export function getLatestSignals() {
  return api.get('/api/signals/latest', { cache: 'no-store' }).json();
}

export function getLatestTrendSnapshot() {
  return api.get('/api/trends/latest', { cache: 'no-store' }).json();
}

export function rankTrends() {
  return api.get('/api/trends/rank', {
    cache: 'no-store',
    searchParams: {
      verify: '0',
      ai: '1',
      aiLimit: '8',
      limit: '8',
      save: '1',
      reason: 'manual-rank'
    }
  }).json();
}

export function collectSignals({ source, reason, areas } = {}) {
  const searchParams = new URLSearchParams();
  if (source) searchParams.set('source', source);
  if (reason) searchParams.set('reason', reason);
  if (areas?.length) searchParams.set('areas', areas.join(','));
  return api.get('/api/signals/collect', { cache: 'no-store', searchParams }).json();
}

export function collectFmKoreaWithBrowser({ auth = true } = {}) {
  return api.get('/api/signals/fmkorea-browser', {
    cache: 'no-store',
    timeout: 180000,
    searchParams: { auth: auth ? '1' : '0' }
  }).json();
}

export function verifySearch({ query, type = '검증형' }) {
  return api.get('/api/search/verify', {
    cache: 'no-store',
    searchParams: {
      q: query,
      type
    }
  }).json();
}

export function getTrendHistory(limit = 60) {
  return api.get('/api/trends/history', {
    cache: 'no-store',
    searchParams: { limit }
  }).json();
}

export function createContentPlan(payload, { refresh = false } = {}) {
  return api.post(apiPath('/api/content/plan'), {
    searchParams: refresh ? { refresh: '1' } : undefined,
    json: sanitizeContentPlanPayload(payload)
  }).json();
}

export function generateContentImage(payload) {
  return api.post('/api/content/image', { json: payload }).json();
}

function sanitizeContentPlanPayload(payload = {}) {
  return {
    id: payload.id,
    label: cleanText(payload.label ?? payload.keyword),
    keyword: cleanText(payload.keyword ?? payload.label),
    category: payload.category,
    rank: payload.rank,
    score: payload.score,
    production: payload.production,
    validation: payload.validation,
    aiAnalysis: payload.aiAnalysis,
    evidence: (payload.evidence ?? []).slice(0, 5).map((item) => ({
      source: item.source,
      title: cleanText(item.title),
      metric: cleanText(item.metric),
      url: item.url
    })),
    sampleTitles: (payload.sampleTitles ?? []).slice(0, 5).map(cleanText),
    sources: payload.sources ?? [],
    summary: cleanText(payload.summary),
    searchVerification: payload.searchVerification ? {
      query: cleanText(payload.searchVerification.query),
      checkedAt: payload.searchVerification.checkedAt,
      verification: payload.searchVerification.verification,
      sources: (payload.searchVerification.sources ?? []).map((source) => ({
        source: source.source,
        status: source.status,
        count: source.count,
        error: source.error
      })),
      results: (payload.searchVerification.results ?? []).slice(0, 5).map((result) => ({
        source: result.source,
        title: cleanText(result.title),
        snippet: cleanText(result.snippet),
        url: result.url,
        publishedAt: result.publishedAt
      }))
    } : undefined
  };
}

function cleanText(value) {
  return `${value ?? ''}`
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function apiPath(path) {
  if (typeof window === 'undefined') return path;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://${window.location.hostname}:5174${path}`;
  }
  return path;
}
