export const cardStyles = {
  map: {
    name: '지도·반경 리포트',
    desc: '부동산/지역/기업 입지처럼 거리, 범위, 위치를 보여줄 때',
    bg: '#f5f5f5', ink: '#050505', accent: '#c40000', sub: '#1646a3',
    slots: ['초대형 제목', '반경/지도 영역', '지역 라벨', '출처 라인']
  },
  ranking: {
    name: '숫자 랭킹 보드',
    desc: '주가, 지표, 순위, 비교 데이터를 강하게 보여줄 때',
    bg: '#ffffff', ink: '#080808', accent: '#d90000', sub: '#0756b8',
    slots: ['헤드라인', '숫자 그리드', '해석 본문', '강조 배지']
  },
  tree: {
    name: '사다리 결정트리',
    desc: '선택지, 투자 성향, 구매 기준을 흐름도로 정리할 때',
    bg: '#edf7d8', ink: '#19320d', accent: '#4f7f1a', sub: '#2453ff',
    slots: ['질문 제목', '분기 노드', '선택 기준', '행동 유도']
  },
  note: {
    name: '재테크 노트',
    desc: '친근한 설명, 체크리스트, 초보자 가이드에 적합',
    bg: '#fff8f5', ink: '#211816', accent: '#f27493', sub: '#8a5b50',
    slots: ['에피소드 번호', '중앙 제목', '짧은 설명', '체크 포인트']
  },
  story: {
    name: '사진+스토리 매거진',
    desc: '흥미로운 사례, 인물, 서사형 콘텐츠에 적합',
    bg: '#ffffff', ink: '#111111', accent: '#222222', sub: '#777777',
    slots: ['상단 이미지', '제목', '스토리 본문', '계정 시그니처']
  }
};

export function autoStyle(studio) {
  const text = `${studio?.label ?? ''} ${studio?.category ?? ''} ${studio?.summary ?? ''}`;
  if (/지역|부동산|아파트|상권|캠퍼스|지도|거리|서울|경기/.test(text)) return 'map';
  if (/ETF|투자|주식|금리|환율|선택|성향/.test(text)) return 'tree';
  if (/순위|랭킹|성적표|지표|통계|비교|시장/.test(text)) return 'ranking';
  if (/이야기|사례|사람|역사|사고|구조/.test(text)) return 'story';
  return 'ranking';
}

export function styleTraits(key) {
  return {
    map: ['초대형 헤드라인', '빨강/파랑 그룹 비교', '지도 질감', '라벨 다량 배치'],
    ranking: ['굵은 숫자', '격자 표', '빨강 강조', '출처 라인'],
    tree: ['YES/NO 분기', '연결선', '선택지 박스', '마지막 행동 유도'],
    note: ['여백 많은 종이톤', '짧은 문답', '밑줄 강조', '초보자 친화'],
    story: ['상단 이미지', '긴 본문', '계정형 헤더', '저장 가치 있는 서사']
  }[key] ?? [];
}

export function templateSlots(style) {
  return style?.slots ?? ['제목', '본문', '강조', '출처'];
}
