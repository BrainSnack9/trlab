export const cardStyles = {
  map: {
    name: '지역 비교 맵',
    desc: '강남/홍콩/도쿄처럼 지역이나 시장을 비교해 보여줄 때',
    bg: '#f7f7f2', ink: '#111111', accent: '#d12b2b', sub: '#2563eb',
    slots: ['후크 제목', '비교 지도/범위', '지역 라벨', '확인 지표']
  },
  ranking: {
    name: '밈 팩트체크 보드',
    desc: '@koreanmedicalmemed처럼 짧은 주장, 숫자, 반박을 강하게 보여줄 때',
    bg: '#ffffff', ink: '#080808', accent: '#e11d48', sub: '#2563eb',
    slots: ['짧은 주장', '숫자/근거 보드', '반박 문장', '체크 라벨']
  },
  tree: {
    name: '저장 기준 트리',
    desc: '독자가 구매/투자/선택 기준을 저장하게 만들 때',
    bg: '#f1f8e8', ink: '#19320d', accent: '#4f7f1a', sub: '#2453ff',
    slots: ['기준 질문', '분기 노드', '선택 조건', '저장 CTA']
  },
  note: {
    name: '핸드드로잉 리서치',
    desc: '@twojob_angel처럼 흰 배경, 짧은 메모, 비교 자료를 손으로 정리한 느낌',
    bg: '#fffaf3', ink: '#211816', accent: '#ef6f8f', sub: '#7c5b4a',
    slots: ['짧은 후크', '자료 칩', '메모 본문', '저장 기준']
  },
  photo: {
    name: '파워 포토 훅',
    desc: '@power_biolife처럼 사진/어두운 그라데이션 위에 반전 한 문장을 크게 꽂을 때',
    bg: '#09090b', ink: '#ffffff', accent: '#facc15', sub: '#e5e7eb',
    slots: ['풀블리드 사진', '반전 한 문장', '큰 숫자/사실', '강조 라벨']
  },
  story: {
    name: '매거진 포토 후크',
    desc: '@artart.today처럼 사진/사례를 앞세우고 짧은 제목으로 끌어당길 때',
    bg: '#ffffff', ink: '#111111', accent: '#222222', sub: '#6b7280',
    slots: ['사진 영역', '짧은 제목', '맥락 문장', '계정 시그니처']
  }
};

export function autoStyle(studio, plan) {
  if (plan?.referenceStyle === 'handdrawn_research') return 'note';
  if (plan?.referenceStyle === 'magazine_story') return 'story';
  if (plan?.referenceStyle === 'meme_factcheck') return 'ranking';
  if (plan?.referenceStyle === 'photo_hook') return 'photo';
  const text = `${studio?.label ?? ''} ${studio?.category ?? ''} ${studio?.summary ?? ''}`;
  if (/지역|부동산|아파트|상권|캠퍼스|지도|거리|서울|경기/.test(text)) return 'map';
  if (/ETF|투자|주식|금리|환율|선택|성향/.test(text)) return 'tree';
  if (/순위|랭킹|성적표|지표|통계|비교|시장/.test(text)) return 'ranking';
  if (/이야기|사례|사람|역사|사고|구조/.test(text)) return 'story';
  return 'ranking';
}

export function styleTraits(key) {
  return {
    map: ['지역명 칩', '비교 축', '지도 질감', '확인 지표'],
    ranking: ['짧은 주장', '굵은 숫자', '팩트체크', '체크 라벨'],
    tree: ['판단 질문', '분기 기준', '체크리스트', '저장 CTA'],
    note: ['흰 여백', '메모 칩', '손글씨 무드', '저장 기준'],
    photo: ['사진 풀블리드', '반전 문장', '큰 흰 제목', '강조 라벨'],
    story: ['사진 표지', '짧은 제목', '사례 중심', '매거진 톤']
  }[key] ?? [];
}

export function templateSlots(style) {
  return style?.slots ?? ['제목', '본문', '강조', '메모'];
}

export function referenceVisualGuide(referenceStyle) {
  return {
    handdrawn_research: {
      account: '@twojob_angel',
      cover: '흰 여백 위 짧은 주제명과 편집자 관찰 한 줄',
      body: '손으로 정리한 듯한 자료 칩, 비교표, 메모 주석',
      proof: '근거는 내부 판단에만 사용하고 카드에는 노출하지 않음',
      typography: '굵은 제목 + 메모체 느낌의 짧은 본문',
      avoid: 'PPT식 도형 과다, 원문 제목 복붙, 긴 문단'
    },
    photo_hook: {
      account: '@power_biolife',
      cover: '사진 풀블리드 또는 어두운 그라데이션 위 반전 한 문장',
      body: '한 장에 사실 하나씩, 큰 숫자와 짧은 설명',
      proof: '검증 정보는 내부 판단에만 사용하고 카드에는 노출하지 않음',
      typography: '큰 흰색 제목, 대비 강한 강조 라벨',
      avoid: '밋밋한 리포트 배경, 표지의 긴 근거 문장'
    },
    magazine_story: {
      account: '@artart.today',
      cover: '매거진 표지처럼 사진/장면을 크게 쓰고 짧은 제목',
      body: '문화/브랜드 맥락을 장면처럼 나누는 에디토리얼 구성',
      proof: '검증 정보는 내부 판단에만 사용',
      typography: '간결한 산세리프 제목, 넓은 여백',
      avoid: '차트 과다, 밈 말투, 과한 장식'
    },
    meme_factcheck: {
      account: '@koreanmedicalmemed',
      cover: '짧은 키워드와 말풍선식 문제 제기',
      body: '주장/확인/오해를 보드처럼 강하게 구분',
      proof: '검증 정보는 내부 판단에만 사용',
      typography: '짧고 굵은 문장, 빨강/파랑 대비',
      avoid: '애매한 감상평, 근거 없는 단정, 긴 설명문'
    }
  }[referenceStyle] ?? {
    account: 'reference carousel',
    cover: '짧고 강한 표지 후크',
    body: '한 카드 한 역할, 시각 요소 하나',
    proof: '검증 정보는 내부 판단에만 사용',
    typography: '굵은 제목과 짧은 본문',
    avoid: '긴 문단, 랜덤 장식, 원문 복붙'
  };
}
