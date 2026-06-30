export const cardStyles = {
  note: {
    name: '메모형 정보 카드',
    desc: '흰 여백, 짧은 메모, 자료 칩을 손으로 정리한 듯 보여주는 유형',
    bg: '#fffdf7', ink: '#201817', accent: '#ef6f8f', sub: '#7c5b4a',
    slots: ['짧은 후크', '메모 칩', '비교/자료 영역', '체크 기준'],
    imageGuide: 'clean white editorial note backplate, blank paper panels, subtle hand-organized research mood'
  },
  ranking: {
    name: '팩트체크 보드',
    desc: '짧은 주장, 근거, 오해/반박을 강하게 구분해서 보여주는 유형',
    bg: '#ffffff', ink: '#080808', accent: '#e11d48', sub: '#2563eb',
    slots: ['짧은 주장', '근거 보드', '오해/반박', '체크 라벨'],
    imageGuide: 'bold editorial board mood, red-blue contrast, blank overlay-safe zones only'
  },
  photo: {
    name: '실사 이미지 배경',
    desc: '카드 전체에 실제 사진 같은 배경을 깔고, 제목/본문을 강하게 얹는 방식',
    bg: '#09090b', ink: '#ffffff', accent: '#facc15', sub: '#e5e7eb',
    slots: ['풀블리드 실사 배경', '큰 제목', '짧은 본문', '강조 라벨'],
    imageGuide: 'topic-specific realistic full-bleed photo background, dark calm lower safe area, strong visual subject'
  },
  story: {
    name: '일러스트 배경',
    desc: '주제를 설명하는 삽화나 장면 일러스트를 배경/상단 비주얼로 쓰는 방식',
    bg: '#ffffff', ink: '#111111', accent: '#222222', sub: '#6b7280',
    slots: ['일러스트 장면', '짧은 제목', '본문 영역', '시그니처'],
    imageGuide: 'topic-specific editorial illustration scene, soft background depth, clear blank areas for title and body'
  }
};

export function autoStyle(studio, plan) {
  if (cardStyles[plan?.recommendedStyle]) return plan.recommendedStyle;
  if (cardStyles[plan?.visualStyle]) return plan.visualStyle;
  if (plan?.referenceStyle === 'handdrawn_research') return 'note';
  if (plan?.referenceStyle === 'meme_factcheck') return 'ranking';
  if (plan?.referenceStyle === 'photo_hook') return 'photo';
  if (plan?.referenceStyle === 'magazine_story') return 'story';
  const text = `${studio?.label ?? ''} ${studio?.category ?? ''} ${studio?.summary ?? ''}`;
  if (/육아용품|아기\s*욕조|욕조|유모차|젖병|카시트|기저귀|장난감|육아템|펫용품|자동급식기|제품|상품|브랜드|품절|아마존|틱톡|쇼핑|추천템|소비|생활용품|실사|사진/.test(text)) return 'photo';
  if (/의학|건강|질환|증상|영양제|식품|운동|다이어트|체중|성분|안전|팩트|오해|반박|검증/.test(text)) return 'ranking';
  if (/장소|여행|카페|놀이터|동네/.test(text)) return 'photo';
  if (/육아|아이|아기|부모|반려|강아지|고양이|생활|일러스트|삽화/.test(text)) return 'story';
  return 'note';
}

export function styleRecommendation(studio, plan) {
  const key = autoStyle(studio, plan);
  const text = `${studio?.label ?? ''} ${studio?.category ?? ''} ${studio?.summary ?? ''} ${plan?.coreAngle ?? ''} ${plan?.summary ?? ''}`;
  const reason = (() => {
    if (cardStyles[plan?.recommendedStyle] || cardStyles[plan?.visualStyle]) return '콘텐츠 설계에서 지정된 시각 유형입니다.';
    if (key === 'photo') return '실제 제품, 장소, 브랜드처럼 눈으로 보여줘야 하는 주제에 적합합니다.';
    if (key === 'story') return '육아 상황, 감정, 생활 장면처럼 맥락을 장면으로 보여주기 좋습니다.';
    if (key === 'ranking') return '오해, 성분, 건강, 안전처럼 근거와 반박을 나눠야 하는 주제에 적합합니다.';
    if (/비교|자료|트렌드|아이디어|사업|시장|흐름/.test(text)) return '정보를 짧은 메모와 자료 칩으로 정리하기 좋은 주제입니다.';
    return '카드 내용을 간결한 메모와 비교 자료로 정리하기 좋은 기본 유형입니다.';
  })();
  return { key, style: cardStyles[key], reason };
}

export function styleTraits(key) {
  return {
    note: ['흰 여백', '메모 칩', '손글씨 무드', '비교 자료'],
    ranking: ['짧은 주장', '근거 보드', '팩트체크', '오해 반박'],
    photo: ['실사 배경', '큰 제목', '어두운 하단', '강조 라벨'],
    story: ['일러스트 장면', '짧은 제목', '넓은 여백', '부드러운 톤']
  }[key] ?? [];
}

export function templateSlots(style) {
  return style?.slots ?? ['제목', '본문', '강조', '메모'];
}

export function referenceVisualGuide(referenceStyle) {
  return {
    handdrawn_research: {
      account: '메모형 정보 카드',
      cover: '흰 여백 위 짧은 주제명과 편집자 관찰 한 줄',
      body: '손으로 정리한 듯한 빈 자료 패널, 자료 칩, 메모 여백',
      proof: '근거는 내부 판단에만 사용하고 카드에는 노출하지 않음',
      typography: '굵은 제목 + 메모체 느낌의 짧은 본문',
      avoid: 'PPT식 도형 과다, 원문 제목 복붙, 긴 문단'
    },
    photo_hook: {
      account: '실사 이미지형',
      cover: '주제와 직접 연결되는 실사 느낌의 풀블리드 배경 위 큰 제목',
      body: '사진 배경 위에 짧은 본문과 강조 라벨을 얹는 구성',
      proof: '검증 정보는 내부 판단에만 사용하고 카드에는 노출하지 않음',
      typography: '큰 제목 + 대비 강한 짧은 본문',
      avoid: '무관한 스톡 사진, 흐린 배경만 있는 분위기 컷, 긴 근거 문장'
    },
    magazine_story: {
      account: '일러스트 장면형',
      cover: '주제를 설명하는 삽화나 장면 일러스트를 크게 사용',
      body: '일러스트 위/아래에 제목과 본문을 분리해 읽기 쉽게 배치',
      proof: '검증 정보는 내부 판단에만 사용하고 카드에는 노출하지 않음',
      typography: '간결한 제목 + 넓은 여백의 본문',
      avoid: '장식만 있는 추상 배경, 텍스트와 겹치는 복잡한 삽화, 원문 제목 복붙'
    },
    meme_factcheck: {
      account: '팩트체크 보드',
      cover: '짧은 키워드가 얹힐 빈 보드형 배경',
      body: '주장/확인/오해 텍스트가 들어갈 빈 영역을 강하게 구분',
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
