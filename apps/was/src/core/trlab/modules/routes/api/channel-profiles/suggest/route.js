import { generateAIJson, hasAIProvider } from '#trlab/modules/services/ai/ai-providers';
import { saveChannelProfile } from '#trlab/modules/services/channel-profiles/channel-profiles';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const profileSuggestionSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    profile: {
      type: 'object',
      additionalProperties: false,
      properties: {
        id: { type: 'string' },
        label: { type: 'string' },
        description: { type: 'string' },
        seeds: { type: 'array', items: { type: 'string' } },
        reddit: { type: 'array', items: { type: 'string' } },
        keywords: { type: 'array', items: { type: 'string' } },
        strategy: {
          type: 'object',
          additionalProperties: false,
          properties: {
            audience: { type: 'string' },
            goals: { type: 'array', items: { type: 'string' } },
            voice: { type: 'string' },
            preferredFormats: { type: 'array', items: { type: 'string' } },
            avoidKeywords: { type: 'array', items: { type: 'string' } },
            decisionRules: { type: 'array', items: { type: 'string' } }
          },
          required: ['audience', 'goals', 'voice', 'preferredFormats', 'avoidKeywords', 'decisionRules']
        }
      },
      required: ['id', 'label', 'description', 'seeds', 'reddit', 'keywords', 'strategy']
    }
  },
  required: ['profile']
};

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const title = clean(body.title);
  const save = body.save === true;
  if (!title) return Response.json({ error: 'missing_title', message: '프로필 제목을 입력해 주세요.' }, { status: 400 });
  const suggestion = await suggestProfile(title);
  const profile = normalizeSuggestion(suggestion.profile ?? suggestion, title);
  if (save) return Response.json({ profile: await saveChannelProfile(profile), provider: suggestion.provider ?? 'fallback', saved: true });
  return Response.json({ profile, provider: suggestion.provider ?? 'fallback', saved: false });
}

async function suggestProfile(title) {
  if (!hasAIProvider()) return { provider: 'fallback', profile: fallbackProfile(title) };
  try {
    const prompt = JSON.stringify({
      task: 'Create one Instagram account profile for trend collection and ranking. Return JSON only.',
      title,
      rules: [
        'id는 짧은 kebab-case',
        'seeds는 검색 수집에 쓸 한국어/영어 검색어 8~12개',
        'reddit는 관련 subreddit 이름 3~6개',
        'keywords는 랭킹 적합도 판단용 키워드 10~16개',
        'strategy는 타깃, 저장/공유/팔로우 목표, 말투, 선호 포맷, 제외 키워드, 선정 기준',
        '정치/성인/루머/혐오/사건사고 확산을 피한다',
        '토큰을 아끼기 위해 각 문장은 짧게'
      ]
    });
    const result = await generateAIJson(prompt, {
      schema: profileSuggestionSchema,
      schemaName: 'channel_profile_suggestion',
      promptCacheKey: 'trlab_channel_profile_suggestion_v1'
    });
    return { provider: result.provider, profile: result.data?.profile };
  } catch {
    return { provider: 'fallback', profile: fallbackProfile(title) };
  }
}

function normalizeSuggestion(profile, title) {
  const fallback = fallbackProfile(title);
  return {
    id: slugify(profile?.id || title),
    label: clean(profile?.label) || fallback.label,
    description: clean(profile?.description) || fallback.description,
    seeds: list(profile?.seeds, fallback.seeds).slice(0, 14),
    reddit: list(profile?.reddit, fallback.reddit).slice(0, 8),
    keywords: list(profile?.keywords, fallback.keywords).slice(0, 18),
    strategy: {
      audience: clean(profile?.strategy?.audience) || fallback.strategy.audience,
      goals: list(profile?.strategy?.goals, fallback.strategy.goals).slice(0, 5),
      voice: clean(profile?.strategy?.voice) || fallback.strategy.voice,
      preferredFormats: list(profile?.strategy?.preferredFormats, fallback.strategy.preferredFormats).slice(0, 6),
      avoidKeywords: list(profile?.strategy?.avoidKeywords, fallback.strategy.avoidKeywords).slice(0, 8),
      decisionRules: list(profile?.strategy?.decisionRules, fallback.strategy.decisionRules).slice(0, 8)
    },
    scoring: { growthPotential: 16, contentExpandability: 17, aiProductionEase: 16, adValue: 14, groupBuyFit: 12, brandExtensionFit: 14 },
    enabled: true
  };
}

function fallbackProfile(title) {
  const label = title.replace(/\s*계정$/i, '').trim() || title;
  const keyword = label.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  return {
    id: slugify(keyword),
    label: keyword,
    description: `${keyword} 계정용 저장형 트렌드 수집 프로필`,
    seeds: [`${keyword} 트렌드`, `${keyword} 체크리스트`, `${keyword} 추천`, `${keyword} 비교`, `${keyword} 주의사항`, `${keyword} 인스타 콘텐츠`, `${keyword} 저장용 정보`, `${keyword} 최신 이슈`],
    reddit: ['InstagramMarketing', 'socialmedia', 'content_marketing'],
    keywords: keyword.split(/\s+/).filter(Boolean).concat(['저장', '공유', '추천', '비교', '체크리스트', '트렌드']),
    strategy: {
      audience: `${keyword} 정보를 저장하고 비교하는 인스타 사용자`,
      goals: ['저장', '공유', '팔로우 전환'],
      voice: '짧고 근거 있는 정보형 톤',
      preferredFormats: ['체크리스트형', '비교형', '랭킹형'],
      avoidKeywords: ['정치', '성인', '루머', '혐오', '사건사고'],
      decisionRules: ['바로 저장할 기준이 있을 것', '검색 근거가 있을 것', '제목 후보로 3개 이상 확장 가능할 것']
    }
  };
}

function list(value, fallback = []) {
  const source = Array.isArray(value) ? value : `${value ?? ''}`.split(/\n|,/);
  const cleaned = source.map(clean).filter(Boolean);
  return cleaned.length ? [...new Set(cleaned)] : fallback;
}

function clean(value) {
  return `${value ?? ''}`.replace(/\s+/g, ' ').trim();
}

function slugify(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9가-힣]+/gi, '-').replace(/^-|-$/g, '') || `profile-${Date.now()}`;
}
