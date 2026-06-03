import { generateAIJson, hasAIProvider } from '#trlab/modules/services/ai/ai-providers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const fieldConfig = {
  seeds: {
    label: '검색 시드',
    max: 10,
    fallback: (base) => [`${base} 최신`, `${base} 체크리스트`, `${base} 추천`, `${base} 비교`, `${base} 주의사항`, `${base} 인스타 콘텐츠`]
  },
  reddit: {
    label: '레딧 채널',
    max: 6,
    fallback: () => ['InstagramMarketing', 'socialmedia', 'content_marketing']
  },
  keywords: {
    label: '판정 키워드',
    max: 12,
    fallback: (base) => [base, '저장', '공유', '추천', '비교', '체크리스트', '후기', '주의사항']
  },
  goals: {
    label: '성장 목표',
    max: 6,
    fallback: () => ['저장 유도', '공유 유도', '팔로우 전환', '댓글 질문 유도']
  },
  preferredFormats: {
    label: '선호 포맷',
    max: 8,
    fallback: () => ['체크리스트형', '비교형', '랭킹형', '실수 방지형', '전후 변화형']
  },
  avoidKeywords: {
    label: '제외 키워드',
    max: 8,
    fallback: () => ['정치', '성인', '루머', '혐오', '과장 광고']
  },
  decisionRules: {
    label: '선정 기준',
    max: 8,
    fallback: () => ['검색 근거가 확인될 것', '저장할 기준이 명확할 것', '제목 후보 3개 이상으로 확장 가능할 것', '계정 타깃이 바로 이해할 수 있을 것']
  }
};

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    suggestions: { type: 'array', items: { type: 'string' } }
  },
  required: ['suggestions']
};

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const field = clean(body.field);
  const config = fieldConfig[field];
  if (!config) return Response.json({ error: 'invalid_field', message: '추천할 프로필 항목이 올바르지 않습니다.' }, { status: 400 });

  const profile = body.profile && typeof body.profile === 'object' ? body.profile : {};
  const context = clean(body.context);
  const providerResult = await suggestItems({ profile, field, config, context });
  const suggestions = normalizeItems(providerResult.suggestions, fallbackItems(profile, field, config), config.max);

  return Response.json({ field, label: config.label, suggestions, provider: providerResult.provider });
}

async function suggestItems({ profile, field, config, context }) {
  if (!hasAIProvider()) return { provider: 'fallback', suggestions: fallbackItems(profile, field, config) };
  try {
    const prompt = JSON.stringify({
      task: 'Suggest concise Instagram trend-collection profile items. Return JSON only.',
      field,
      fieldLabel: config.label,
      profile: summarizeProfile(profile),
      context,
      rules: [
        '기존 항목과 의미가 겹치지 않는 후보만 제안',
        '검색 시드와 키워드는 한국어 중심으로, 필요할 때만 짧은 영어 포함',
        '각 항목은 바로 DB에 저장할 수 있는 짧은 문자열',
        '정치, 성인, 루머, 혐오, 과장 광고를 강화하는 후보 금지',
        `suggestions는 ${config.max}개 이하`
      ]
    });
    const result = await generateAIJson(prompt, {
      schema,
      schemaName: 'channel_profile_tune_items',
      promptCacheKey: `trlab_channel_profile_tune_${field}_v1`
    });
    return { provider: result.provider, suggestions: result.data?.suggestions };
  } catch {
    return { provider: 'fallback', suggestions: fallbackItems(profile, field, config) };
  }
}

function summarizeProfile(profile) {
  return {
    id: clean(profile.id),
    label: clean(profile.label),
    description: clean(profile.description),
    seeds: list(profile.seeds).slice(0, 12),
    reddit: list(profile.reddit).slice(0, 8),
    keywords: list(profile.keywords).slice(0, 16),
    strategy: {
      audience: clean(profile.strategy?.audience),
      goals: list(profile.strategy?.goals).slice(0, 6),
      voice: clean(profile.strategy?.voice),
      preferredFormats: list(profile.strategy?.preferredFormats).slice(0, 8),
      avoidKeywords: list(profile.strategy?.avoidKeywords).slice(0, 8),
      decisionRules: list(profile.strategy?.decisionRules).slice(0, 8)
    }
  };
}

function fallbackItems(profile, field, config) {
  const base = clean(profile.label || profile.description || '계정');
  return config.fallback(base).filter((item) => !existingItems(profile, field).has(item));
}

function existingItems(profile, field) {
  const values = ['goals', 'preferredFormats', 'avoidKeywords', 'decisionRules'].includes(field)
    ? profile.strategy?.[field]
    : profile[field];
  return new Set(list(values));
}

function normalizeItems(value, fallback, max) {
  const blocked = /정치|성인|루머|혐오|도박|선정적/i;
  const items = list(value)
    .map((item) => item.replace(/^[-•\d.\s]+/, '').trim())
    .filter((item) => item.length >= 2 && item.length <= 40)
    .filter((item) => !blocked.test(item));
  const merged = [...items, ...fallback].filter(Boolean);
  return [...new Set(merged)].slice(0, max);
}

function list(value) {
  const source = Array.isArray(value) ? value : `${value ?? ''}`.split(/\n|,/);
  return source.map(clean).filter(Boolean);
}

function clean(value) {
  return `${value ?? ''}`.replace(/\s+/g, ' ').trim();
}
