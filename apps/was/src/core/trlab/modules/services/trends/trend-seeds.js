export const seedGroups = {
  tech: ['AI 검색 최적화 브랜드 노출', '생성형 AI 업무 자동화 사례', '반도체 AI 수요 전망'],
  brand: ['AI 검색 최적화 브랜드 노출', '브랜드 소비자 반응 변화', '기업 AI 도입 사례'],
  economy: ['소비 트렌드 가격 인상 변화', '국민연금 국내주식 비중 변화', '물가 소비 패턴 변화'],
  finance: ['국민연금 국내주식 비중 변화', '금리 환율 투자 전략', '코스피 투자 전략 변화'],
  health: ['건강 식품 주의 효과 비교', '비만치료제 식품 시장 변화', '수면 영양제 효과 비교'],
  beauty: ['올리브영 K뷰티 해외 반응', 'K뷰티 미국 시장 확장', '화장품 성분 소비 트렌드'],
  shopping: ['소비 트렌드 가격 인상 변화', '할인 특가 소비자 반응', '리셀 중고 명품 소비 트렌드'],
  travel: ['여행 결제 QR 관광 협업', '일본 여행 소비 변화', '항공권 호텔 가격 전망'],
  auto: ['전기차 배터리 가격 전망', '자동차 구독 서비스 변화', '현대차 기아 전기차 전략'],
  education: ['교육 AI 학습 서비스 변화', '생성형 AI 교육 활용 사례', '직장인 온라인 강의 트렌드'],
  local: ['소상공인 지원금 신청 혜택', '지역 상권 소비 회복', '관광 지원금 신청 방법']
};

export const redditGroups = {
  tech: ['artificial', 'ChatGPT', 'singularity', 'technology', 'SaaS', 'SEO'],
  brand: ['marketing', 'Entrepreneur', 'SaaS', 'SEO'],
  economy: ['personalfinance', 'investing', 'Entrepreneur'],
  finance: ['personalfinance', 'investing'],
  health: ['SkincareAddiction', 'nutrition', 'Fitness'],
  beauty: ['SkincareAddiction', 'AsianBeauty'],
  shopping: ['frugalmalefashion', 'BuyItForLife'],
  travel: ['travel', 'JapanTravel'],
  auto: ['electricvehicles', 'cars'],
  education: ['ChatGPT', 'edtech'],
  local: ['Entrepreneur', 'smallbusiness']
};

export function getTopicalSeeds(areaIds = []) {
  return pickByAreas(seedGroups, areaIds);
}

export function getRedditSubreddits(areaIds = []) {
  return pickByAreas(redditGroups, areaIds);
}

function pickByAreas(groups, areaIds) {
  const ids = areaIds.length ? areaIds : Object.keys(groups);
  return [...new Set(ids.flatMap((id) => groups[id] ?? []))];
}
