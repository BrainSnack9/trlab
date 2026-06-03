export const sourceWeights = {
  'Google Trends': 14, 'Search SERP': 14, FMKorea: 18, TheQoo: 15,
  'Nate Pann': 14, Reddit: 12, DCInside: 14, Ruliweb: 12,
  Inven: 8, BobaeDream: 12, MLBPark: 10, Clien: 10
};

export const interestAreas = [
  ['auto', '자동차', ['자동차', '전기차', '테슬라', '현대차', '기아', '배터리']],
  ['fashion', '패션', ['패션', '코디', '신발', '가방', '브랜드', '룩북']],
  ['beauty', '뷰티', ['뷰티', '화장품', '피부', '메이크업', '향수']],
  ['food', '음식', ['음식', '맛집', '카페', '요리', '레시피']],
  ['health', '건강', ['건강', '운동', '식단', '영양제', '수면']],
  ['travel', '여행', ['여행', '항공', '호텔', '마카오', '축제', '관광']],
  ['education', '교육', ['교육', '학교', '입시', '수능', '강의']],
  ['entertainment', '엔터', ['배우', '드라마', '영화', '아이돌', '방송']],
  ['sports', '스포츠', ['야구', '축구', '리버풀', '선수', '경기']],
  ['game', '게임', ['게임', 'LCK', 'MSI', '스팀', 'e스포츠', '페이즈']],
  ['economy', '경제', ['경제', '부동산', '금리', '소비', '물가']],
  ['finance', '금융/투자', ['금융', '주식', '코인', '환율', '투자']],
  ['tech', '테크/AI', ['AI', '반도체', '엔비디아', '하이닉스', 'ChatGPT', 'OpenAI']],
  ['shopping', '소비/쇼핑', ['소비', '쇼핑', '할인', '쿠폰', '구매']],
  ['local', '지역/공간', ['지역', '공간', '상권', '서울', '부산']],
  ['brand', '브랜드/기업', ['브랜드', '기업', '삼성전자', '네이버', '카카오']],
  ['life', '라이프', ['생활', '일상', '관광', '트렌드']]
].map(([id, label, keywords]) => ({ id, label, keywords }));

export const adultPattern = /(19금|19세|19禁|성인|노출|야짤|ㅇㅎ|후방|후방주의|음란|선정)/i;
export const politicsPattern = /(대통령|민주당|국민의힘|선거|국회|정당|후보|투표|사전\s*투표|이재명|조국|한동훈)/i;
export const riskPattern = /(사망|살인|폭행|마약|혐오|전쟁|범죄|논란|루머|북한|사기|군사|분쟁|제재)/i;
export const incidentPattern = /(화재|누출|불화수소|대피|부상|사망|사고|폭발|중독|수사|압수수색|구속|기소|범죄|폭행|살인|마약)/i;
export const spamPattern = /(카지노|토토|바카라|슬롯|보증금|먹튀|성인|19금|도박|노말\s*보상|실용적인\s*접근법)/i;
export const storyCuePattern = /(이유|방법|가격|할인|출시|발표|공개|지원금|결제|비교|전망|체크|순위|위기|신청|주의|선택|변화|전략|강화|논란|반응|문제|정리|분석|영향|비결|확장|성장|개편|인상|인하|예약|스펙|업데이트)/i;
export const marketingCuePattern = /(가격|할인|출시|지원금|결제|비교|전망|체크|위기|신청|선택|변화|전략|분석|영향|비결|확장|성장|개편|인상|인하|예약|스펙|업데이트|AI|반도체|브랜드|기업|소비|구매|여행|뷰티|건강|교육|투자|부동산|금리|환율)/i;
export const lowIntentCuePattern = /(ㅋㅋ|ㄷㄷ|짤|명언|반응|근황|실시간|제약|뻘글|건강이상설|이상설|고양이|강아지|아이돌|피지컬|리센느|경기|조롱)/i;
export const weakBareKeywordPattern = /^(AI|MSI|KBO|LCK|MLB|NBA|OTT|VR|AR|UX|ChatGPT|Claude|하이닉스|마카오|삼성전자|반도체|그래픽카드|온라인몰|네이버페이)$/i;
export const weakContentKeywordPattern = /^(강아지|건강이상설|이상설|아이돌|리센느|피지컬|만달로리안|예능|치지직|Ronny|ㅋㅋ|ㄷㄷ)$/i;
export const broadKeywordPattern = /^(대한민국|한국|국내|해외|미국|일본|중국|서울|우리나라|시장|기업|회사|제품|서비스|기술|이슈|문제|상황|코스피|주식|경제|target|finds|target finds|parenting products|pet gadgets|viral product sold out|미국 MZ가 사는 물건|미국에서 갑자기 뜬 브랜드|아이와 갈만한 곳|일본 주부 필수템)$/i;

export const allowedShortKeywords = new Set(['ai', 'kbo', 'lck', 'mlb', 'nba', 'ott', 'vr', 'ar', 'ux', 'msi']);
export const allowedEnglishKeywords = new Set(['anthropic', 'chatgpt', 'openai', 'claude', 'nvidia', 'palantir', 'tesla', 'apple', 'google', 'meta']);
export const canonicalKeywordMap = new Map([
  ['palantir', '팔란티어'], ['nvidia', '엔비디아'], ['nvda', '엔비디아'],
  ['btc', '비트코인'], ['bitcoin', '비트코인'], ['kbo', 'KBO'], ['lck', 'LCK'],
  ['삼성전자 하이닉스', '삼성전자·하이닉스 AI 반도체'], ['하이닉스 삼성전자', '삼성전자·하이닉스 AI 반도체'],
  ['네이버페이', '네이버페이']
]);
export const areaOverrideMap = new Map([
  ['치지직', 'tech'], ['스트로베리', 'tech'], ['anthropic', 'tech'],
  ['AI 검색', 'tech'], ['생성형 AI', 'tech'], ['AI 반도체', 'tech'],
  ['삼성전자', 'brand'], ['하이닉스', 'brand'], ['msi', 'game'], ['페이즈', 'game'],
  ['마카오', 'travel'], ['민생지원금', 'local'], ['도파민', 'health'], ['건강 식품', 'health'],
  ['스타벅스', 'shopping'], ['콜드컵', 'shopping'], ['곰돌이컵', 'shopping'], ['품절', 'shopping'], ['대란템', 'shopping'],
  ['올리브영', 'beauty'], ['올영', 'beauty'], ['K뷰티', 'beauty'], ['K-Beauty', 'beauty'], ['화장품', 'beauty'],
  ['출산', 'life'], ['육아', 'life'], ['어린이집', 'life'], ['부모급여', 'life'],
  ['반려동물', 'life'], ['강아지', 'life'], ['고양이', 'life'], ['펫', 'life']
]);

export const stopWords = new Set('최근 오늘 이번 사람들 사람입니다 관련 영상 사진 있는 없는 하는 하는 가장 진짜 그냥 이유 얼마나 대박 난리난 난리 난리남 화제의 분위기 고급진 예쁜 예뻐진 핫한 뜨는 떠오른 인기있는 좋다는 좋았던 때문에 받았어요 차별받았어요 차별받음 억울해요 ㄷㄷ jpg gif vs the and of will with from this that about 현재 방금 근황 있습니다 입니다 했던 썼던 풀었다는 따르면 밝혔다 공개 시작 공포에 터졌는데 키운다 소비와 일으킨 우리나라 한국어임에도 물어보는거임 아마존서 target finds targetfinds mp4'.split(' '));
export const noiseKeywords = new Set('뉴스 속보 단독 조회수 게시글 커뮤니티 갤러리 포텐 유튜브 인스타 네이버 다음 nate osen co kr 공식 요약 정리 리뷰 추천 인기 메뉴 로그인 회원가입 연합뉴스 조선일보 중앙일보 동아일보 매일경제'.split(' '));
export const genericKeywords = new Set('한국 국내 해외 미국 일본 중국 서울 코리아 대한민국 우리나라 사람 사용자 소비자 아이 부모 회사 기업 시장 가격 브랜드 제품 서비스 기술 업계 이슈 문제 결과 상황 종목 모두 모바일 인터넷 지역 계획 트렌드 코스피 경제 주식 분위기 반응 화제 이국적인 고급진 난리난 대란 핫플 핫템 차별 차별받았어요 받았어요 억울해요 하소연 일으킨 한국어임에도 물어보는거임 아마존서 target finds parenting products pet gadgets viral product sold out'.split(' '));
