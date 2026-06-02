import { all, get, write } from '#trlab/libraries/storage/index';

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
    scoring: { growthPotential: 16, contentExpandability: 18, aiProductionEase: 16, adValue: 17, groupBuyFit: 20, brandExtensionFit: 18 }
  }
];

export async function getChannelProfiles({ enabledOnly = false } = {}) {
  await ensureDefaultProfiles();
  const rows = await all(`
    SELECT id, label, description, seeds_json AS seedsJson, reddit_json AS redditJson,
           keywords_json AS keywordsJson, scoring_json AS scoringJson, enabled,
           created_at AS createdAt, updated_at AS updatedAt
    FROM channel_profiles
    ${enabledOnly ? 'WHERE enabled = 1' : ''}
    ORDER BY created_at ASC
  `);
  return rows.map(fromRow);
}

export async function saveChannelProfile(input) {
  const now = new Date().toISOString();
  const profile = normalizeProfile(input);
  await write((database) => {
    database.run(`
      INSERT INTO channel_profiles (
        id, label, description, seeds_json, reddit_json, keywords_json, scoring_json, enabled, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        label = excluded.label,
        description = excluded.description,
        seeds_json = excluded.seeds_json,
        reddit_json = excluded.reddit_json,
        keywords_json = excluded.keywords_json,
        scoring_json = excluded.scoring_json,
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
      profile.enabled ? 1 : 0,
      now,
      now
    ]);
  });
  return getChannelProfile(profile.id);
}

export async function getChannelProfile(id) {
  const row = await get(`
    SELECT id, label, description, seeds_json AS seedsJson, reddit_json AS redditJson,
           keywords_json AS keywordsJson, scoring_json AS scoringJson, enabled,
           created_at AS createdAt, updated_at AS updatedAt
    FROM channel_profiles
    WHERE id = ?
  `, [id]);
  return row ? fromRow(row) : null;
}

export async function deleteChannelProfile(id) {
  await write((database) => database.run('DELETE FROM channel_profiles WHERE id = ?', [id]));
  return { id };
}

async function ensureDefaultProfiles() {
  const row = await get('SELECT COUNT(*) AS count FROM channel_profiles');
  if ((row?.count ?? 0) > 0) return;
  const now = new Date().toISOString();
  await write((database) => {
    defaultChannelProfiles.forEach((profile) => {
      database.run(`
        INSERT INTO channel_profiles (
          id, label, description, seeds_json, reddit_json, keywords_json, scoring_json, enabled, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `, [
        profile.id,
        profile.label,
        profile.description,
        JSON.stringify(profile.seeds),
        JSON.stringify(profile.reddit),
        JSON.stringify(profile.keywords),
        JSON.stringify(profile.scoring),
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
    enabled: Boolean(row.enabled),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
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
