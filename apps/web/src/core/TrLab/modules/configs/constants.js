import { Layers3, Lightbulb, Radar, SearchCheck, ServerCog } from 'lucide-react';

export const steps = [
  ['dashboard', '트렌드 감지', '제작 후보', Radar],
  ['search', '검색 검증', '근거 확인', SearchCheck],
  ['studio', '콘텐츠 설계', '아이디어', Lightbulb],
  ['cardnews', '카드뉴스 제작', '시나리오', Layers3]
];

export const utilitySteps = [
  ['collection', '수집 관리', '채널/저장소', ServerCog]
];

export const interestAreas = [
  ['auto', '자동차', ['자동차', '전기차', '테슬라', '현대차', '기아', '배터리']],
  ['fashion', '패션', ['패션', '코디', '신발', '가방', '브랜드', '룩북']],
  ['beauty', '뷰티', ['뷰티', '화장품', '피부', '메이크업', '향수']],
  ['food', '음식', ['음식', '맛집', '카페', '요리', '레시피']],
  ['health', '건강', ['건강', '운동', '식단', '영양제', '수면']],
  ['travel', '여행', ['여행', '항공', '호텔', '일본', '마카오', '축제']],
  ['parenting', '육아', ['육아', '아이', '아기', '엄마', '아빠', '키즈']],
  ['education', '교육', ['교육', '학교', '입시', '수능', '강의']],
  ['entertainment', '엔터', ['배우', '드라마', '영화', '아이돌', '예능']],
  ['sports', '스포츠', ['야구', '축구', '리버풀', '선수', '경기']],
  ['game', '게임', ['게임', 'LCK', 'MSI', '스팀', '콘솔', 'e스포츠']],
  ['economy', '경제', ['경제', '부동산', '금리', '소비', '주가']],
  ['finance', '금융/투자', ['금융', '주식', '코인', '환율', '투자']],
  ['tech', '테크/AI', ['AI', '반도체', '엔비디아', '하이닉스', '칩셋', 'ChatGPT']],
  ['shopping', '소비/쇼핑', ['소비', '쇼핑', '할인', '쿠폰', '영업일']],
  ['home', '인테리어/가전', ['인테리어', '가전', '청소기', '냉장고']],
  ['pet', '반려동물', ['강아지', '고양이', '펫', '사료']],
  ['work', '취업/직장', ['취업', '직장', '이직', '채용', '퇴사']],
  ['local', '지역/공간', ['지역', '공간', '상권', '서울', '부산']],
  ['culture', '문화/전시', ['전시', '공연', '책', '페스티벌']],
  ['brand', '브랜드/기업', ['브랜드', '기업', '삼성전자', '네이버', '카카오']],
  ['life', '라이프', ['생활', '일상', '관광', '가족']]
].map(([id, label, keywords]) => ({ id, label, keywords }));

export const exclusionAreas = [
  ['politics', '정치', ['정치', '대통령', '민주당', '국민의힘', '선거', '국회']],
  ['incident', '사건사고', ['사고', '사망', '범죄', '폭행', '살인', '화재']],
  ['controversy', '논란/갈등', ['논란', '갈등', '분노', '폭로', '악플']],
  ['adult', '성인물', ['19금', '19세', '성인', '노출', 'ㅇㅎ', '야짤', '음란']]
].map(([id, label, keywords]) => ({ id, label, keywords }));

export const channelProfiles = [
  ['us-consumer', '미국 소비 트렌드', '품절템, 대란템, 해외 구매 욕구를 만드는 상품 신호'],
  ['parenting', '육아 트렌드', '부모가 저장하고 구매로 이어지는 장소, 지원금, 육아템 신호'],
  ['pet', '반려동물 트렌드', '반려인이 반복 소비하는 펫용품, 보험, 병원, 해외 시장 신호']
].map(([id, label, description]) => ({ id, label, description }));

export const defaultSelectedProfiles = channelProfiles.map((profile) => profile.id);
export const defaultSelectedAreas = [];
export const defaultExcludedAreas = ['politics', 'incident', 'controversy', 'adult'];

export const collectableSourceIds = [
  'google', 'serp', 'dcinside', 'fmkorea', 'theqoo', 'natepann', 'bobaedream',
  'reddit', 'ruliweb', 'inven', 'mlbpark', 'clien'
];

export const sourceNameById = {
  google: 'Google Trends', serp: 'Search SERP', dcinside: 'DCInside',
  fmkorea: 'FMKorea', theqoo: 'TheQoo', natepann: 'Nate Pann',
  bobaedream: 'BobaeDream', reddit: 'Reddit', ruliweb: 'Ruliweb',
  inven: 'Inven', mlbpark: 'MLBPark', clien: 'Clien'
};

export const sourceMetaById = {
  google: ['검색 트렌드', 'Google Trends RSS'], serp: ['검색 트렌드', 'Google News RSS'],
  dcinside: ['커뮤니티', '실베/실갤 인기'], fmkorea: ['커뮤니티', '포텐 최신/화제'],
  theqoo: ['커뮤니티', 'HOT 전체/카테고리'], natepann: ['커뮤니티', '톡커선택/오늘의 톡'],
  bobaedream: ['커뮤니티', '베스트 실시간/주간/월간'], reddit: ['글로벌 커뮤니티', '서브레딧 RSS'],
  ruliweb: ['커뮤니티', '실시간/추천/조회/댓글 베스트'], inven: ['게임/테크', '게임 뉴스'],
  mlbpark: ['커뮤니티', '불펜 추천/조회/댓글'], clien: ['커뮤니티', '모두의공원 최신/공감/댓글']
};

export const initialSources = [
  ...collectableSourceIds.map((id) => ({ id, name: sourceNameById[id], interval: 20, status: '수집 가능' })),
  { id: 'instagram', name: 'Instagram', interval: 60, status: 'API/로그인 필요' },
  { id: 'threads', name: 'Threads', interval: 60, status: 'API/로그인 필요' }
];

export const radarColors = ['#6366f1', '#0ea5e9', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#14b8a6', '#f59e0b', '#ec4899', '#22c55e'];
