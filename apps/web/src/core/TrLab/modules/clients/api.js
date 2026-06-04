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

export function getLatestSignals({ analysisDate } = {}) {
  return api.get(apiPath('/api/signals/latest'), {
    cache: 'no-store',
    searchParams: analysisDate ? { analysisDate } : undefined
  }).json();
}

export function getSignalDateSummary(dates = []) {
  return api.get(apiPath('/api/signals/summary'), {
    cache: 'no-store',
    searchParams: { dates: dates.join(',') }
  }).json();
}

export function getLatestTrendSnapshot({ analysisDate } = {}) {
  return api.get(apiPath('/api/trends/latest'), {
    cache: 'no-store',
    searchParams: analysisDate ? { analysisDate } : undefined
  }).json();
}

export function rankTrends({ analysisDate } = {}) {
  return api.get(apiPath('/api/trends/rank'), {
    cache: 'no-store',
    searchParams: {
      verify: '1',
      verifyLimit: '5',
      ai: '1',
      aiLimit: '8',
      limit: '12',
      window: 'business-day',
      ...(analysisDate ? { analysisDate } : {}),
      save: '1',
      reason: 'manual-rank'
    }
  }).json();
}

export function recordCandidateFeedback(payload) {
  return api.post(apiPath('/api/trends/feedback'), {
    json: sanitizeCandidateFeedback(payload)
  }).json();
}

export function collectSignals({ source, reason, areas, profiles } = {}) {
  const searchParams = new URLSearchParams();
  if (source) searchParams.set('source', source);
  if (reason) searchParams.set('reason', reason);
  if (areas?.length) searchParams.set('areas', areas.join(','));
  if (profiles?.length) searchParams.set('profiles', profiles.join(','));
  return api.get(apiPath('/api/signals/collect'), { cache: 'no-store', searchParams }).json();
}

export function clearCollectedTrends() {
  return api.post(apiPath('/api/signals/clear')).json();
}

export function getDatabaseStatus() {
  return api.get(apiPath('/api/admin/db'), { cache: 'no-store' }).json();
}

export function runDatabaseAction(payload) {
  return api.post(apiPath('/api/admin/db'), { json: payload, timeout: 180000 }).json();
}

export function getCollectorRuntimeStatus() {
  return api.get(apiPath('/api/admin/collector'), { cache: 'no-store' }).json();
}

export function runCollectorRuntimeAction(payload) {
  return api.post(apiPath('/api/admin/collector'), { json: payload, timeout: 180000 }).json();
}

export function collectFmKoreaWithBrowser({ auth = true } = {}) {
  return api.get(apiPath('/api/signals/fmkorea-browser'), {
    cache: 'no-store',
    timeout: 180000,
    searchParams: { auth: auth ? '1' : '0' }
  }).json();
}

export function verifySearch({ query, type = '검증형' }) {
  return api.get(apiPath('/api/search/verify'), {
    cache: 'no-store',
    searchParams: {
      q: query,
      type
    }
  }).json();
}

export function getTrendHistory(limit = 60) {
  return api.get(apiPath('/api/trends/history'), {
    cache: 'no-store',
    searchParams: { limit }
  }).json();
}

export function getChannelProfiles() {
  return api.get(apiPath('/api/channel-profiles'), { cache: 'no-store' }).json();
}

export function getAccountSlots() {
  return api.get(apiPath('/api/accounts/slots'), { cache: 'no-store' }).json();
}

export function saveAccountSlots(slots) {
  return api.post(apiPath('/api/accounts/slots'), { json: { slots } }).json();
}

export function saveChannelProfile(profile) {
  return api.post(apiPath('/api/channel-profiles'), { json: profile }).json();
}

export function suggestChannelProfile(title) {
  return api.post(apiPath('/api/channel-profiles/suggest'), { json: { title } }).json();
}

export function tuneChannelProfile({ profile, field, context }) {
  return api.post(apiPath('/api/channel-profiles/tune'), { json: { profile, field, context } }).json();
}

export function deleteChannelProfile(id) {
  return api.delete(apiPath('/api/channel-profiles'), { searchParams: { id } }).json();
}

export function createContentPlan(payload, { refresh = false } = {}) {
  return api.post(apiPath('/api/content/plan'), {
    searchParams: refresh ? { refresh: '1' } : undefined,
    json: sanitizeContentPlanPayload(payload)
  }).json();
}

export function generateContentImage(payload) {
  return api.post(apiPath('/api/content/image'), { json: payload }).json();
}

export function listContentImages({ planId, limit = 60 } = {}) {
  const searchParams = new URLSearchParams();
  if (planId) searchParams.set('planId', planId);
  if (limit) searchParams.set('limit', String(limit));
  return api.get(apiPath('/api/content/image'), { cache: 'no-store', searchParams }).json();
}

export function previewContentImagePrompt(payload) {
  return api.post(apiPath('/api/content/image'), { json: { ...payload, preview: true } }).json();
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
    selectedHookTitle: cleanText(payload.selectedHookTitle),
    sourceMode: payload.sourceMode,
    channelName: cleanText(payload.channelName),
    manualBrief: payload.manualBrief ? {
      topic: cleanText(payload.manualBrief.topic),
      prompt: cleanText(payload.manualBrief.prompt),
      channelName: cleanText(payload.manualBrief.channelName),
      audience: cleanText(payload.manualBrief.audience),
      tone: cleanText(payload.manualBrief.tone),
      cardCount: Number(payload.manualBrief.cardCount) || undefined
    } : undefined,
    cardCount: Number(payload.cardCount) || undefined,
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

function sanitizeCandidateFeedback(payload = {}) {
  const candidate = payload.candidate ?? {};
  return {
    action: payload.action,
    keyword: cleanText(payload.keyword ?? candidate.keyword ?? candidate.label),
    candidateId: cleanText(payload.candidateId ?? candidate.id),
    profileId: cleanText(payload.profileId ?? candidate.channelFit?.bestProfile?.id),
    areaId: cleanText(payload.areaId ?? candidate.area?.id),
    reason: cleanText(payload.reason),
    source: cleanText(payload.source ?? 'web'),
    candidate: sanitizeFeedbackCandidate(candidate)
  };
}

function sanitizeFeedbackCandidate(candidate = {}) {
  return {
    id: candidate.id,
    keyword: cleanText(candidate.keyword ?? candidate.label),
    label: cleanText(candidate.label ?? candidate.keyword),
    area: candidate.area,
    production: candidate.production,
    channelFit: candidate.channelFit,
    sources: candidate.sources ?? [],
    sampleTitles: (candidate.sampleTitles ?? []).slice(0, 5).map(cleanText)
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
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
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
