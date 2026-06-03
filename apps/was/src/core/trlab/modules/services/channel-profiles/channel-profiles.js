import { all, get, write } from '#trlab/libraries/storage/index';
import { asc, eq, sql } from 'drizzle-orm';
import { getPostgresClient } from '#trlab/libraries/storage/postgres';
import { channelProfilesTable, ensurePostgresSchema } from '#trlab/libraries/storage/postgres-schema';
import { shouldUseSupabaseDatabase } from '#trlab/modules/configs/env';

export const defaultChannelProfiles = [
  {
    id: 'us-consumer',
    label: '미국 소비 트렌드',
    description: '품절템, 대란템, 해외 구매 욕구를 만드는 상품 신호',
    seeds: [
      '미국에서 품절난 상품', '미국 MZ가 사는 물건', '미국 아마존 급상승 상품',
      '미국 틱톡 대란템', '미국에서 갑자기 뜬 브랜드', 'tiktok made me buy it',
      'amazon trending products', 'viral product sold out', 'target finds', 'costco finds',
      '일본 품절템', '일본 주부 필수템', '일본 편의점 신상',
      '중국 라이브커머스 대박 상품', '중국에서 많이 팔린 제품'
    ],
    reddit: ['BuyItForLife', 'frugalmalefashion', 'AsianBeauty', 'SkincareAddiction', 'Costco', 'AmazonFinds'],
    keywords: ['품절', '대란템', '아마존', '틱톡', 'MZ', '브랜드', '공동구매', '구매', 'sold out', 'viral', 'amazon', 'tiktok'],
    strategy: {
      audience: '해외 소비 트렌드를 빠르게 따라가고 저장형 쇼핑 정보를 좋아하는 인스타 사용자',
      goals: ['저장', '공유', '구매 전환'],
      voice: '짧고 실용적인 큐레이션 톤',
      preferredFormats: ['랭킹형', '비교형', '체크리스트형'],
      avoidKeywords: ['도박', '성인', '루머', '정치'],
      decisionRules: ['실제 구매 이유가 보일 것', '상품명/브랜드/가격/비교 기준 중 하나가 있을 것']
    },
    scoring: { growthPotential: 18, contentExpandability: 18, aiProductionEase: 16, adValue: 16, groupBuyFit: 20, brandExtensionFit: 18 }
  },
  {
    id: 'parenting',
    label: '육아 트렌드',
    description: '부모가 저장하고 구매로 이어지는 장소, 지원금, 육아템 신호',
    seeds: [
      '미국 부모들이 쓰는 육아템', '실제 만족도 높은 육아템', '돈 아끼는 육아템',
      '신생아 부모들이 많이 사는 제품', '아이와 갈만한 곳', '유모차 가능한 카페',
      '키즈카페 실내 놀이터', '부모급여 놓치면 손해', '육아 지원금',
      'baby gear parents love', 'newborn essentials', 'parenting products', 'stroller friendly cafe'
    ],
    reddit: ['Parenting', 'NewParents', 'Mommit', 'Daddit', 'BabyBumps'],
    keywords: ['육아', '부모', '아기', '신생아', '유모차', '키즈', '어린이집', '지원금', '부모급여', 'baby', 'parenting'],
    strategy: {
      audience: '저장할 기준과 혜택 정보를 찾는 부모/예비 부모',
      goals: ['저장', '공유', '신뢰 형성'],
      voice: '불안을 키우지 않고 기준을 알려주는 차분한 톤',
      preferredFormats: ['체크리스트형', '비교형', '지원금 정리형'],
      avoidKeywords: ['맘충', '혐오', '사망', '범죄', '정치'],
      decisionRules: ['부모가 바로 확인할 기준이 있을 것', '지원/장소/제품 중 행동으로 이어질 정보가 있을 것']
    },
    scoring: { growthPotential: 17, contentExpandability: 17, aiProductionEase: 15, adValue: 18, groupBuyFit: 19, brandExtensionFit: 16 }
  },
  {
    id: 'pet',
    label: '반려동물 트렌드',
    description: '반려인이 반복 소비하는 펫용품, 보험, 병원, 해외 시장 신호',
    seeds: [
      '미국 강아지들이 좋아하는 장난감', '일본 고양이 집사 필수템', '미국에서 매출 폭발한 자동 급식기',
      '해외에서 유행하는 산책용품', '미국 반려인들이 많이 구매한 제품',
      '반려동물 보험', '반려동물 병원', '해외 펫 산업', '일본 펫 트렌드',
      'pet gadgets', 'dog toys trending', 'cat automatic feeder', 'pet insurance trend'
    ],
    reddit: ['dogs', 'cats', 'Dogtraining', 'CatAdvice', 'Pets'],
    keywords: ['강아지', '고양이', '반려', '펫', '간식', '장난감', '자동급식기', '보험', '병원', 'pet', 'dog', 'cat'],
    strategy: {
      audience: '반려동물 용품과 건강 정보를 저장하고 비교하는 보호자',
      goals: ['저장', '공유', '구매 전환'],
      voice: '귀엽지만 기준은 분명한 큐레이션 톤',
      preferredFormats: ['추천형', '비교형', '주의 체크형'],
      avoidKeywords: ['학대', '사망', '혐오', '루머'],
      decisionRules: ['반려동물 보호자가 살지 말지 판단할 기준이 있을 것', '제품/보험/병원/건강 중 하나로 확장 가능할 것']
    },
    scoring: { growthPotential: 16, contentExpandability: 18, aiProductionEase: 16, adValue: 17, groupBuyFit: 20, brandExtensionFit: 18 }
  }
];

export async function getChannelProfiles({ enabledOnly = false } = {}) {
  if (shouldUseSupabaseDatabase()) return getPostgresChannelProfiles({ enabledOnly });
  await ensureDefaultProfiles();
  const rows = await all(`
    SELECT id, label, description, seeds_json AS seedsJson, reddit_json AS redditJson,
           keywords_json AS keywordsJson, scoring_json AS scoringJson, strategy_json AS strategyJson, enabled,
           created_at AS createdAt, updated_at AS updatedAt
    FROM channel_profiles
    ${enabledOnly ? 'WHERE enabled = 1' : ''}
    ORDER BY created_at ASC
  `);
  return rows.map(fromRow);
}

export async function saveChannelProfile(input) {
  if (shouldUseSupabaseDatabase()) return savePostgresChannelProfile(input);
  const now = new Date().toISOString();
  const profile = normalizeProfile(input);
  await write((database) => {
    database.run(`
      INSERT INTO channel_profiles (
        id, label, description, seeds_json, reddit_json, keywords_json, scoring_json, strategy_json, enabled, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        label = excluded.label,
        description = excluded.description,
        seeds_json = excluded.seeds_json,
        reddit_json = excluded.reddit_json,
        keywords_json = excluded.keywords_json,
        scoring_json = excluded.scoring_json,
        strategy_json = excluded.strategy_json,
        enabled = excluded.enabled,
        updated_at = excluded.updated_at
    `, [
      profile.id,
      profile.label,
      profile.description,
      JSON.stringify(profile.seeds),
      JSON.stringify(profile.reddit),
      JSON.stringify(profile.keywords),
      JSON.stringify(profile.scoring),
      JSON.stringify(profile.strategy),
      profile.enabled ? 1 : 0,
      now,
      now
    ]);
  });
  return getChannelProfile(profile.id);
}

export async function getChannelProfile(id) {
  if (shouldUseSupabaseDatabase()) return getPostgresChannelProfile(id);
  const row = await get(`
    SELECT id, label, description, seeds_json AS seedsJson, reddit_json AS redditJson,
           keywords_json AS keywordsJson, scoring_json AS scoringJson, strategy_json AS strategyJson, enabled,
           created_at AS createdAt, updated_at AS updatedAt
    FROM channel_profiles
    WHERE id = ?
  `, [id]);
  return row ? fromRow(row) : null;
}

export async function deleteChannelProfile(id) {
  if (shouldUseSupabaseDatabase()) return deletePostgresChannelProfile(id);
  await write((database) => database.run('DELETE FROM channel_profiles WHERE id = ?', [id]));
  return { id };
}

async function getPostgresChannelProfiles({ enabledOnly = false } = {}) {
  await ensurePostgresSchema();
  await ensurePostgresDefaultProfiles();
  const db = getPostgresClient();
  const query = db.select().from(channelProfilesTable);
  const rows = enabledOnly
    ? await query.where(eq(channelProfilesTable.enabled, 1)).orderBy(asc(channelProfilesTable.createdAt))
    : await query.orderBy(asc(channelProfilesTable.createdAt));
  return rows.map(fromPostgresRow);
}

async function savePostgresChannelProfile(input) {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  const now = new Date().toISOString();
  const profile = normalizeProfile(input);
  await db.insert(channelProfilesTable)
    .values({
      id: profile.id,
      label: profile.label,
      description: profile.description,
      seeds: profile.seeds,
      reddit: profile.reddit,
      keywords: profile.keywords,
      scoring: profile.scoring,
      strategy: profile.strategy,
      enabled: profile.enabled ? 1 : 0,
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: channelProfilesTable.id,
      set: {
        label: profile.label,
        description: profile.description,
        seeds: profile.seeds,
        reddit: profile.reddit,
        keywords: profile.keywords,
        scoring: profile.scoring,
        strategy: profile.strategy,
        enabled: profile.enabled ? 1 : 0,
        updatedAt: now
      }
    });
  return getPostgresChannelProfile(profile.id);
}

async function getPostgresChannelProfile(id) {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  const rows = await db.select().from(channelProfilesTable).where(eq(channelProfilesTable.id, id)).limit(1);
  return rows[0] ? fromPostgresRow(rows[0]) : null;
}

async function deletePostgresChannelProfile(id) {
  await ensurePostgresSchema();
  const db = getPostgresClient();
  await db.delete(channelProfilesTable).where(eq(channelProfilesTable.id, id));
  return { id };
}

async function ensurePostgresDefaultProfiles() {
  const db = getPostgresClient();
  const rows = await db.select({ count: sql`count(*)` }).from(channelProfilesTable);
  if (Number(rows[0]?.count ?? 0) > 0) return;
  const now = new Date().toISOString();
  await db.insert(channelProfilesTable).values(defaultChannelProfiles.map((profile) => ({
    id: profile.id,
    label: profile.label,
    description: profile.description,
    seeds: profile.seeds,
    reddit: profile.reddit,
    keywords: profile.keywords,
    scoring: profile.scoring,
    strategy: profile.strategy ?? defaultStrategyFor(profile.id),
    enabled: 1,
    createdAt: now,
    updatedAt: now
  })));
}

async function ensureDefaultProfiles() {
  const row = await get('SELECT COUNT(*) AS count FROM channel_profiles');
  if ((row?.count ?? 0) > 0) return;
  const now = new Date().toISOString();
  await write((database) => {
    defaultChannelProfiles.forEach((profile) => {
      database.run(`
        INSERT INTO channel_profiles (
          id, label, description, seeds_json, reddit_json, keywords_json, scoring_json, strategy_json, enabled, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `, [
        profile.id,
        profile.label,
        profile.description,
        JSON.stringify(profile.seeds),
        JSON.stringify(profile.reddit),
        JSON.stringify(profile.keywords),
        JSON.stringify(profile.scoring),
        JSON.stringify(profile.strategy ?? defaultStrategyFor(profile.id)),
        now,
        now
      ]);
    });
  });
}

function normalizeProfile(input = {}) {
  const label = clean(input.label);
  const id = clean(input.id) || slugify(label);
  return {
    id,
    label: label || id,
    description: clean(input.description),
    seeds: toList(input.seeds),
    reddit: toList(input.reddit),
    keywords: toList(input.keywords),
    scoring: input.scoring && typeof input.scoring === 'object' && !Array.isArray(input.scoring) ? input.scoring : {},
    strategy: normalizeStrategy(input.strategy, id),
    enabled: input.enabled !== false
  };
}

function fromRow(row) {
  return {
    id: row.id,
    label: row.label,
    description: row.description ?? '',
    seeds: parseJson(row.seedsJson, []),
    reddit: parseJson(row.redditJson, []),
    keywords: parseJson(row.keywordsJson, []),
    scoring: parseJson(row.scoringJson, {}),
    strategy: normalizeStrategy(parseJson(row.strategyJson, {}), row.id),
    enabled: Boolean(row.enabled),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function fromPostgresRow(row) {
  return {
    id: row.id,
    label: row.label,
    description: row.description ?? '',
    seeds: Array.isArray(row.seeds) ? row.seeds : [],
    reddit: Array.isArray(row.reddit) ? row.reddit : [],
    keywords: Array.isArray(row.keywords) ? row.keywords : [],
    scoring: row.scoring && typeof row.scoring === 'object' && !Array.isArray(row.scoring) ? row.scoring : {},
    strategy: normalizeStrategy(row.strategy, row.id),
    enabled: Boolean(row.enabled),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function normalizeStrategy(value = {}, profileId = '') {
  const fallback = defaultStrategyFor(profileId);
  const strategy = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    audience: clean(strategy.audience) || fallback.audience,
    goals: toList(strategy.goals?.length ? strategy.goals : fallback.goals),
    voice: clean(strategy.voice) || fallback.voice,
    preferredFormats: toList(strategy.preferredFormats?.length ? strategy.preferredFormats : fallback.preferredFormats),
    avoidKeywords: toList(strategy.avoidKeywords?.length ? strategy.avoidKeywords : fallback.avoidKeywords),
    decisionRules: toList(strategy.decisionRules?.length ? strategy.decisionRules : fallback.decisionRules)
  };
}

function defaultStrategyFor(profileId = '') {
  return defaultChannelProfiles.find((profile) => profile.id === profileId)?.strategy ?? {
    audience: '저장할 만한 정보를 찾는 인스타 사용자',
    goals: ['저장', '공유'],
    voice: '짧고 명확한 정보형 톤',
    preferredFormats: ['체크리스트형', '비교형'],
    avoidKeywords: ['정치', '성인', '루머', '혐오'],
    decisionRules: ['검색 근거가 있을 것', '콘텐츠 제목으로 확장 가능할 것']
  };
}

function toList(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return `${value ?? ''}`.split(/\n|,/).map(clean).filter(Boolean);
}

function parseJson(value, fallback) {
  try {
    const parsed = JSON.parse(value || '');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function clean(value) {
  return `${value ?? ''}`.replace(/\s+/g, ' ').trim();
}

function slugify(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9가-힣]+/gi, '-').replace(/^-|-$/g, '') || `profile-${Date.now()}`;
}
