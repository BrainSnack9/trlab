import { describe, expect, it } from 'vitest';
import { __contentPlannerTestUtils, createContentPlan, normalizeContentPlanForTest } from './content-planner.js';

const candidate = {
  id: 'candidate-fmkorea-kospi-chip',
  label: '반도체가 코스피에 미치는 영향',
  keyword: '반도체 코스피',
  category: 'finance',
  sources: ['FMKorea 포텐 최신순', 'DCInside'],
  scoring: { communityReaction: 19 },
  evidence: [
    { title: '반도체 아니면 코스피 설명이 안 된다는 댓글 반응', comments: 86, votes: 140 },
    { title: '삼성전자와 SK하이닉스 비중을 따로 봐야 한다는 의견 반복', comments: 52, votes: 92 }
  ],
  sampleTitles: [
    '반도체 없으면 코스피 상승률이 달라 보이는 이유',
    '외국인 수급이 반도체에 몰린다는 커뮤니티 반응'
  ],
  searchVerification: {
    query: '반도체 코스피 비중 삼성전자 SK하이닉스',
    verification: {
      keyFindings: [
        '삼성전자와 SK하이닉스가 코스피 시가총액에서 큰 비중을 차지한다',
        '반도체 업황 전망에 따라 지수 체감이 달라진다'
      ]
    },
    results: [
      { title: '반도체 대형주와 코스피 지수 영향 분석', source: '검색 검증' }
    ]
  },
  production: {
    suggestedAngle: '코스피를 볼 때 반도체 포함/제외 관점으로 나눠보는 카드뉴스'
  }
};

describe('createContentPlan fallback carousel', () => {
  it('creates reference-style 4:5 carousel planning fields without visible planning labels', async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    const originalProvider = process.env.AI_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_PROVIDER;

    let plan;
    try {
      plan = await createContentPlan(candidate);
    } finally {
      if (originalKey) process.env.OPENAI_API_KEY = originalKey;
      if (originalProvider) process.env.AI_PROVIDER = originalProvider;
    }

    expect(plan.referenceStyle).toBe('handdrawn_research');
    expect(plan.referencePattern.deckLength).toContain('9~11장');
    expect(plan.referencePattern.proofRhythm).toContain('내부 판단');
    expect(plan.carouselBlueprint.length).toBeGreaterThanOrEqual(5);
    expect(plan.cards.length).toBeGreaterThanOrEqual(5);
    expect(plan.cards.map((card) => card.role)).toEqual([
      'cover',
      'community_signal',
      'comparison',
      'data_scene',
      'checklist'
    ]);
    expect(plan.cards.every((card) => card.layout && card.visualType && card.sourceLine !== undefined && card.visualItems?.length)).toBe(true);
    expect(plan.cards.find((card) => card.role === 'data_scene')?.dataPoint).toContain('댓글 86개');
    expect(plan.cards.find((card) => card.role === 'data_scene')?.dataPoint).toContain('추천 140개');
    expect(plan.cards.map((card) => card.body).join('\n')).not.toMatch(/근거:|해석:|실행:|데이터:/);
    expect(plan.captionFirstLine.length).toBeLessThanOrEqual(35);
    expect(plan.captionBody).toContain('반응');
    expect(plan.captionCTA).toContain('저장');
    expect(plan.hashtags.length).toBeGreaterThanOrEqual(5);
    expect(plan.hashtags.every((tag) => tag.startsWith('#'))).toBe(true);
  });

  it('keeps manual natural-language briefs at the requested card count', async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    const originalProvider = process.env.AI_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_PROVIDER;

    let plan;
    try {
      plan = await createContentPlan({
        id: 'manual-stretching',
        label: '퇴근 후 10분 스트레칭',
        keyword: '퇴근 후 10분 스트레칭',
        sourceMode: 'manual',
        cardCount: 4,
        summary: '직장인이 바로 따라할 수 있는 4컷 카드뉴스',
        manualBrief: {
          topic: '퇴근 후 10분 스트레칭',
          prompt: '각 컷은 동작 하나와 주의점 하나로 구성',
          cardCount: 4,
          audience: '앉아서 일하는 직장인',
          tone: '친근하고 실용적으로'
        },
        sources: ['manual']
      });
    } finally {
      if (originalKey) process.env.OPENAI_API_KEY = originalKey;
      if (originalProvider) process.env.AI_PROVIDER = originalProvider;
    }

    expect(plan.cards).toHaveLength(4);
    expect(plan.carouselBlueprint).toHaveLength(4);
    expect(plan.cards.at(-1).role).toBe('checklist');
  });

  it('carries template production settings into generated cards and visual briefs', async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    const originalProvider = process.env.AI_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_PROVIDER;

    let plan;
    try {
      plan = await createContentPlan({
        id: 'manual-instatoon-template',
        label: '직장인 점심값 절약 루틴',
        sourceMode: 'manual',
        manualBrief: {
          topic: '직장인 점심값 절약 루틴',
          prompt: '인스타툰처럼 공감 상황과 반전으로 구성',
          cardCount: 6,
          audience: '점심값 부담이 큰 20~30대 직장인',
          tone: '공감형'
        },
        contentSetup: {
          template: {
            id: 'instatoon-empathy',
            label: '인스타툰 공감형',
            formatSignal: '컷툰 / 대화형',
            canvas: '4:5 1080x1350',
            platformSpecs: [
              { platform: 'Instagram', canvas: '4:5 1080x1350', safeArea: '상하 96px, 좌우 72px', behavior: '첫 컷 훅과 저장 가치가 중요' }
            ],
            editorControls: [
              ['배경', ['장소', '시간대', '소품', '명도']],
              ['캐릭터', ['주인공', '표정', '포즈', '위치']],
              ['말풍선', ['대사량', '꼬리 방향', '속마음', '간격']],
              ['컷 연출', ['그리드', '반전 컷', 'CTA 컷', '장면 연결']]
            ],
            productionFlow: [
              ['레퍼런스', '비슷한 톤의 컷툰, 캐릭터 시트, 말풍선 예시를 모읍니다.'],
              ['배경 선택', '주요 장소, 시간대, 소품 밀도, 명도를 먼저 고정합니다.'],
              ['캐릭터 만들기', '주인공 생김새, 표정 세트, 포즈, 컷별 위치를 정합니다.']
            ],
            layoutSlots: [
              ['배경 영역', '카드 전체를 채우되 문구 안전 여백을 남깁니다.'],
              ['캐릭터 영역', '주인공은 중앙 또는 우측에 배치합니다.'],
              ['말풍선 영역', '말풍선은 상단 또는 측면에 1~2개만 둡니다.']
            ],
            channelStrategy: [
              ['Instagram', ['첫 컷 훅을 가장 크게', '4:5 세로형 우선']],
              ['Threads', ['이미지 안 문구는 짧게', '댓글로 이어지는 문장']]
            ],
            templateBlueprint: {
              format: '컷툰 캐러셀',
              idealCards: '5~7컷',
              planningRule: '상황-감정-반전-정리-저장-CTA 흐름을 기본으로 잡습니다.',
              bestFor: ['공감 상황', '짧은 대화'],
              productionChecklist: ['캐릭터 표정 세트 고정', '말풍선 1~2개 제한'],
              cardBlueprints: [
                ['표지/상황 컷', '큰 표정과 짧은 질문으로 멈추게 만듭니다.', ['인물 1명', '짧은 훅']],
                ['감정 컷', '속마음과 표정 변화로 공감을 만듭니다.', ['말풍선', '표정 확대']]
              ],
              platformExport: [
                { platform: 'Instagram', ratios: ['4:5', '1:1'], exportCheck: ['모든 컷 비율 통일', '첫 컷 중앙 크롭 확인'] }
              ]
            },
            production: {
              nextStep: '배경 선택과 캐릭터 설정부터 시작',
              groups: [
                ['배경', ['일상 장소', '시간대']],
                ['캐릭터', ['주인공 1명', '표정 세트']],
                ['말풍선', ['대사량', '위치']],
                ['컷 연출', ['2x2 장면', '반전 컷 강조']]
              ]
            },
            cardPlan: [
              ['상황', '공감 가능한 문제 장면을 1컷으로 제시'],
              ['감정', '주인공 표정과 속마음으로 체류 시간 확보'],
              ['반전', '예상과 다른 깨달음이나 웃음 포인트'],
              ['정리', '핵심 메시지를 짧은 문장으로 고정'],
              ['저장', '다시 볼 이유를 체크리스트로 전환'],
              ['CTA', '댓글/저장/공유 행동 유도']
            ]
          },
          templateSettings: {
            배경: ['일상 장소'],
            캐릭터: ['주인공 1명'],
            말풍선: ['대사량'],
            '컷 연출': ['2x2 장면']
          }
        }
      });
    } finally {
      if (originalKey) process.env.OPENAI_API_KEY = originalKey;
      if (originalProvider) process.env.AI_PROVIDER = originalProvider;
    }

    expect(plan.cards).toHaveLength(6);
    expect(plan.contentSetup.templateId).toBe('instatoon-empathy');
    expect(plan.contentSetup.templateEditorControls[0]).toEqual(['배경', ['장소', '시간대', '소품', '명도']]);
    expect(plan.contentSetup.templatePlatformSpecs[0].platform).toBe('Instagram');
    expect(plan.contentSetup.templateProductionFlow[1][0]).toBe('배경 선택');
    expect(plan.contentSetup.templateLayoutSlots[0][0]).toBe('배경 영역');
    expect(plan.contentSetup.templateChannelStrategy[0][0]).toBe('Instagram');
    expect(plan.contentSetup.templateBlueprint.format).toBe('컷툰 캐러셀');
    expect(plan.contentSetup.templateBlueprint.cardBlueprints[0][0]).toBe('표지/상황 컷');
    expect(plan.contentSetup.templateBlueprint.platformExport[0].exportCheck).toContain('첫 컷 중앙 크롭 확인');
    expect(plan.templateEditorControls[1][0]).toBe('캐릭터');
    expect(plan.templateProductionFlow[2][0]).toBe('캐릭터 만들기');
    expect(plan.templateLayoutSlots[1][0]).toBe('캐릭터 영역');
    expect(plan.templateChannelStrategy[1][1]).toContain('댓글로 이어지는 문장');
    expect(plan.templateBlueprint.productionChecklist).toContain('말풍선 1~2개 제한');
    expect(plan.contentSetup.templateSettings.배경).toContain('일상 장소');
    expect(plan.cards.map((card) => card.templateSlot)).toEqual(['상황', '감정', '반전', '정리', '저장', 'CTA']);
    expect(plan.cards[1].layout).toBe('toon_panel');
    expect(plan.cards[0].visualBrief.backgroundPrompt).toContain('Template production settings');
    expect(plan.cards[0].visualBrief.composition).toContain('Template slot: 상황');
  });

  it('adds production-ready visual briefs for product cardnews planning', () => {
    const plan = normalizeContentPlanForTest({
      referenceStyle: 'photo_hook',
      productionBrief: {
        contentCategory: 'beauty',
        designConcept: '미국 Gen Z 립오일 카드뉴스',
        pexelsStrategy: { globalQueries: ['lip gloss makeup pouch flat lay'] }
      },
      cards: [
        { title: '미국 Gen Z 파우치템', body: '립스틱보다 립오일을 더 자주 꺼내요.', visualItems: ['립오일', '파우치'] },
        { title: '정답은 립오일', body: '색은 살짝, 광은 촉촉하게 남기는 제품이에요.', visualItems: ['립오일', '틴티드 립밤'] },
        { title: '왜 손이 갈까', body: '꾸민 티는 덜 나지만 얼굴은 생기 있어 보여요.', visualItems: ['사용감', '광택'] },
        { title: '검색어로 보면', body: 'lip oil, tinted balm 같은 키워드로 찾아요.', visualItems: ['lip oil', 'tinted balm'] },
        { title: '구매 전 체크', body: '보습감\n발색 정도\n덧바르기 쉬운가', visualItems: ['보습감', '발색'] }
      ]
    }, {
      label: '미국 Gen Z 파우치에 립스틱보다 많이 들어있는 것',
      selectedHookTitle: '미국 Gen Z 파우치에 립스틱보다 많이 들어있는 것',
      evidence: [{ title: 'lip oil tinted balm beauty trend' }]
    });

    expect(plan.productionBrief.contentCategory).toBe('beauty');
    expect(plan.productionBrief.designConcept).toContain('미국 Gen Z 립오일');
    expect(plan.productionBrief.pexelsStrategy.globalQueries[0]).toContain('lip gloss');
    expect(plan.cards.every((card) => card.visualBrief?.backgroundPrompt && card.visualBrief?.pexelsQuery)).toBe(true);
    expect(plan.cards[1].visualBrief.productCandidates.some((item) => item.name.includes('rhode'))).toBe(true);
    expect(plan.cards[1].visualBrief.negativePrompt).toContain('no logo');
  });

  it('keeps longer reference-like AI responses up to 12 cards and inserts a why-now beat', () => {
    const longAiPlan = {
      referenceStyle: 'photo_hook',
      referencePattern: {
        deckLength: '10장',
        coverRhythm: '사진 위 반전 한 줄',
        bodyRhythm: '사실을 한 장씩 공개',
        proofRhythm: '검증 정보는 내부 판단에만 사용',
        endingRhythm: '저장 기준 3개'
      },
      cards: Array.from({ length: 10 }, (_, index) => ({
        title: ['코스피 착시', '댓글이 말한 것', '왜 지금일까', '비교해야 보여요', '숫자는 하나면 돼요', '오해하면 망해요', '내 이야기화', '반응 다시 보기', '내 기준으로 바꾸기', '이렇게 만들기'][index],
        body: '댓글 86개 반응을 먼저 확인하고, 코스피 전체와 반도체 제외 비교 기준과 숫자를 같이 봐야 해요.',
        dataPoint: '댓글 86개',
        visualItems: ['댓글 반응', '비교 기준', '숫자']
      }))
    };

    const plan = normalizeContentPlanForTest(longAiPlan, candidate);

    expect(plan.cards).toHaveLength(10);
    expect(plan.cards.map((card) => card.role)).toEqual([
      'cover',
      'community_signal',
      'why_now',
      'comparison',
      'data_scene',
      'misconception',
      'content_angle',
      'community_signal',
      'content_angle',
      'checklist'
    ]);
    expect(plan.cards[2].layout).toBe('handwritten_research');
    expect(plan.referencePattern.coverRhythm).toContain('사진 위 반전');
  });

  it('preserves a complete AI carousel flow instead of forcing fixed middle roles', () => {
    const mixedAiPlan = {
      referenceStyle: 'handdrawn_research',
      cards: [
        { role: 'cover', layout: 'cover_text', title: '코스피 착시', body: '지수만 보면 놓쳐요.' },
        { role: 'data_scene', layout: 'data_chart', title: '댓글이 먼저 갈렸다', body: '댓글 반응 86개와 추천 140개가 비교 축을 만들었어요.', dataPoint: '댓글 86개, 추천 140개', visualItems: ['댓글 86개', '추천 140개'] },
        { role: 'content_angle', layout: 'handwritten_research', title: '왜 이렇게 보일까', body: '반도체 비중이 커지면 전체 지수의 체감이 달라져요.' },
        { role: 'comparison', layout: 'comparison_board', title: '비교 카드', body: '코스피 전체와 반도체 제외 지표를 나눠봐요.' },
        { role: 'misconception', layout: 'quote_card', title: '오해하면 안 되는 점', body: '한 지표만 보고 시장 전체를 단정하면 흐름을 놓쳐요.' }
      ]
    };

    const plan = normalizeContentPlanForTest(mixedAiPlan, candidate);

    expect(plan.cards.map((card) => card.role)).toEqual([
      'cover',
      'data_scene',
      'content_angle',
      'comparison',
      'misconception'
    ]);
    expect(plan.cards.map((card) => card.layout)).toEqual([
      'cover_text',
      'data_chart',
      'handwritten_research',
      'comparison_board',
      'quote_card'
    ]);
  });

  it('fills short AI responses into a complete 5-card reference carousel by default', () => {
    const shortAiPlan = {
      referenceStyle: 'handdrawn_research',
      cards: [
        {
          title: '코스피 착시',
          body: '지수만 보면 오른 것 같지만 반도체를 빼면 다른 그림이 보여요.',
          dataPoint: '댓글 86개, 추천 140개',
          visualItems: ['코스피 전체', '반도체 제외']
        },
        {
          title: '댓글이 말한 것',
          body: '커뮤니티 반응은 반도체 비중을 따로 봐야 한다는 쪽에 몰렸어요.',
          dataPoint: '반도체 비중 언급 반복',
          visualItems: ['댓글 반응', '반복 언급']
        },
        {
          title: '비교해야 보여요',
          body: '코스피 전체와 반도체 제외 지표를 나눠보면 체감 차이가 선명해져요.',
          dataPoint: '반도체 포함/제외 비교',
          visualItems: ['코스피 전체', '반도체 제외']
        }
      ]
    };

    const plan = normalizeContentPlanForTest(shortAiPlan, candidate);

    expect(plan.cards).toHaveLength(5);
    expect(plan.cards.map((card) => card.role)).toEqual([
      'cover',
      'community_signal',
      'comparison',
      'data_scene',
      'checklist'
    ]);
    expect(plan.cards[3].layout).toBe('data_chart');
    expect(plan.cards[4].layout).toBe('checklist');
    expect(plan.cards.slice(1).every((card) => card.sourceLine)).toBe(true);
  });

  it('compacts report-like titles and keeps card body copy within carousel length', () => {
    const verbosePlan = {
      referenceStyle: 'handdrawn_research',
      hookTitles: [
        '반도체가 코스피에 미치는 영향 분석 콘텐츠 설계',
        '반도체 코스피 전망 정리 카드뉴스 기획안'
      ],
      cards: Array.from({ length: 7 }, (_, index) => ({
        title: index === 0
          ? '반도체가 코스피에 미치는 영향 분석 콘텐츠 설계'
          : `반도체 코스피 전망 정리 카드뉴스 기획안 ${index + 1}`,
        body: '댓글 86개 반응을 먼저 확인하고, 코스피 전체와 반도체 제외 지표를 비교해야 해요. 시점과 비교 기준을 같이 적어야 저장할 이유가 생겨요.',
        visualItems: ['코스피 전체', '반도체 제외', '외국인 수급', '댓글 반응'],
        dataPoint: '댓글 86개, 추천 140개',
        insight: '코스피 전체와 반도체 제외 지표를 나눠봐야 해요.',
        action: '비교 기준을 저장해요.'
      }))
    };

    const plan = normalizeContentPlanForTest(verbosePlan, candidate);

    expect(plan.hookTitles.every((title) => title.length <= 22)).toBe(true);
    expect(plan.cards[0].title.length).toBeLessThanOrEqual(16);
    expect(plan.cards.slice(1).every((card) => card.title.length <= 18)).toBe(true);
    expect(plan.cards[0].title).not.toMatch(/콘텐츠 설계|카드뉴스|영향 분석|전망 정리/);
    expect(plan.cards.every((card) => card.body.split('\n').length <= (card.role === 'cover' ? 2 : 3))).toBe(true);
  });

  it('keeps at least three non-topic hook titles in the required title slots', () => {
    const input = {
      id: 'manual-medical-study',
      label: '국시 해설 학습 서비스',
      keyword: '국시 해설 학습 서비스',
      category: 'education',
      contentSetup: { cardCount: 5 }
    };
    const plan = normalizeContentPlanForTest({
      referenceStyle: 'handdrawn_research',
      hookTitles: ['국시 해설 학습 서비스'],
      cards: Array.from({ length: 5 }, (_, index) => ({
        title: index === 0 ? '국시 해설 학습 서비스' : `학습 기준 ${index + 1}`,
        body: '틀린 이유와 다시 풀 기준을 분리해서 보면 오답 정리가 훨씬 선명해져요.',
        visualItems: ['오답', '해설', '복습 기준']
      }))
    }, input);

    expect(plan.hookTitles.length).toBeGreaterThanOrEqual(3);
    expect(plan.hookTitles).toEqual(expect.arrayContaining([
      '왜 해설을 봐도 불안할까',
      '틀린 이유가 보여야 해요',
      '오답 정리 기준 3가지'
    ]));
    expect(plan.hookTitles).not.toContain('국시 해설 학습 서비스');
    expect(plan.cards[0].title).not.toBe('국시 해설 학습 서비스');
  });

  it('rewrites flat report-like cover titles into short hook titles', () => {
    const plan = normalizeContentPlanForTest({
      referenceStyle: 'handdrawn_research',
      cards: Array.from({ length: 7 }, (_, index) => ({
        title: index === 0 ? '반도체가 코스피에 미치는 영향' : `비교해야 보여요 ${index + 1}`,
        body: '댓글 86개와 추천 140개 반응을 먼저 확인하고, 비교 기준과 숫자를 같이 봐야 해요.',
        dataPoint: '댓글 86개, 추천 140개',
        visualItems: ['댓글 반응', '추천 반응', '비교 기준']
      }))
    }, candidate);

    expect(plan.cards[0].title).toBe('이게 왜 떴을까');
    expect(plan.cards[0].title.length).toBeLessThanOrEqual(16);
  });

  it('removes copied source and evidence lines from visible card body', () => {
    const sourceLine = '근거: 반도체 아니면 코스피 설명이 안 된다는 댓글 반응';
    const echoPlan = {
      referenceStyle: 'handdrawn_research',
      cards: Array.from({ length: 7 }, (_, index) => ({
        title: index === 0 ? '코스피 착시' : `카드 ${index + 1}`,
        sourceLine,
        dataPoint: '댓글 86개, 추천 140개',
        body: `${sourceLine}\n댓글이 몰린 지점은 지수보다 체감 차이에 가까워요.\n반도체 포함과 제외를 나눠봐야 해요.`,
        visualItems: ['코스피 전체', '반도체 제외', '댓글 반응']
      }))
    };

    const plan = normalizeContentPlanForTest(echoPlan, candidate);

    expect(plan.cards.map((card) => card.body).join('\n')).not.toContain('반도체 아니면 코스피 설명이 안 된다는 댓글 반응');
    expect(plan.cards[1].body).toContain('댓글이 몰린 지점');
    expect(plan.cards[1].body).toContain('반도체 포함과 제외');
  });

  it('normalizes post caption package for publishing', () => {
    const plan = normalizeContentPlanForTest({
      referenceStyle: 'handdrawn_research',
      captionFirstLine: '#광고 반도체 코스피 영향 분석 콘텐츠 설계인데 너무 긴 첫 줄입니다',
      captionBody: '근거: 댓글 86개 반응을 바탕으로 비교 기준을 정리했어요.\n\n\n해석: 저장해두면 다음 이슈를 볼 때 도움이 됩니다.',
      captionCTA: '저장하고 댓글로 보고 싶은 비교 주제를 알려주세요. '.repeat(4),
      hashtags: ['#코스피', '반도체 투자', '카드뉴스']
    }, candidate);

    expect(plan.captionFirstLine).not.toContain('#');
    expect(plan.captionFirstLine.length).toBeLessThanOrEqual(35);
    expect(plan.captionBody).not.toMatch(/근거:|해석:/);
    expect(plan.captionBody.length).toBeGreaterThanOrEqual(120);
    expect(plan.captionBody).toMatch(/반응|비교|근거|저장|숫자/);
    expect(plan.captionCTA.length).toBeLessThanOrEqual(90);
    expect(plan.hashtags).toContain('#코스피');
    expect(plan.hashtags).toContain('#반도체투자');
    expect(plan.hashtags.every((tag) => /^#[\p{L}\p{N}_]+$/u.test(tag))).toBe(true);
  });

  it('turns daycare signals into parent empathy titles and card copy', () => {
    const plan = normalizeContentPlanForTest({}, {
      id: 'daycare-parent-issue',
      label: '어린이집 등원 이슈',
      keyword: '어린이집 등원 감기 첫돌 워킹맘',
      category: '육아 트렌드',
      summary: '부모가 실제로 겪는 등원 기준 이슈',
      sampleTitles: [
        '“감기 걸린 아이, 유치원 보내면 맘충?” 워킹맘 토로',
        '“한 시간만이라도 살 것 같았는데” 첫돌 전 어린이집 보낸 엄마의 반전'
      ],
      searchVerification: {
        verification: {
          keyFindings: [
            '유치원·어린이집 아침돌봄 지원 강화',
            '정부가 어린이집 미설치 기업 명단을 공표했다'
          ]
        }
      }
    });

    expect(plan.targetAudience).toContain('부모');
    expect(plan.hookTitles).toContain('감기 걸리면 어린이집 보내면 안 될까');
    expect(plan.cards[0].title).toBe('감기 걸리면 어린이집 보내면 안 될까');
    expect(plan.cards[0].visualPrompt).toContain('체온계');
    expect(plan.cards.find((card) => card.role === 'comparison')?.visualPrompt).toContain('빈 분할 패널');
    expect(plan.cards.at(-1).visualPrompt).toContain('빈 줄 영역');
    expect(plan.cards.at(-1).title).toBe('등원 전 체크 3개');
    expect(plan.cards.at(-1).emphasis).toBe('등원 판단 기준');
    const dataCard = plan.cards.find((card) => card.role === 'data_scene');
    if (dataCard) {
      expect(dataCard.body).toContain('확인된 수치가 없다면');
      expect(dataCard.body).not.toMatch(/요즘|임출육|twig24|뉴시스|\\.\\.\\./);
      expect(dataCard.visualPrompt).not.toMatch(/근거:|요즘|임출육|\\.\\.\\./);
      expect(dataCard.visualItems.join('\n')).not.toMatch(/Search SERP|요즘|임출육|twig24|가격\/비중|\\.\\.\\./);
    }
    expect(plan.carouselBlueprint.join('\n')).toContain('부모들이 실제로 막힌 지점');
    expect(plan.cards.map((card) => `${card.title} ${card.body}`).join('\n')).toMatch(/부모|등원|아이 컨디션|제도/);
    expect(plan.cards.map((card) => card.body).join('\n')).not.toMatch(/Search SERP|네이트판|기획|작성/);
  });

  it('turns baby product safety signals into safety-check titles', () => {
    const plan = normalizeContentPlanForTest({}, {
      id: 'baby-bath-safety',
      label: '환경호르몬 아기 욕조',
      keyword: '아기 욕조 환경호르몬 유해성분',
      category: '육아 트렌드',
      summary: '부모가 제품 안전 기준을 확인하려는 이슈',
      sampleTitles: [
        '똑똑한 소비자가 왜 환경호르몬 아기 욕조를 샀을까',
        '아기 욕조 유해성분 논란'
      ]
    });

    expect(plan.hookTitles).toContain('아기 욕조 정말 괜찮을까');
    expect(plan.cards[0].title).toBe('아기 욕조 정말 괜찮을까');
    expect(plan.cards.at(-1).title).toBe('구매 전 체크 3개');
    expect(plan.cards.at(-1).emphasis).toBe('구매 판단 기준');
    expect(plan.cards.map((card) => `${card.title} ${card.body}`).join('\n')).toMatch(/성분|사용 연령|대체품|유해성분/);
  });

  it('does not leak daycare evidence into baby bath safety cards when the selected title changes intent', () => {
    const mixedAiPlan = {
      referenceStyle: 'photo_hook',
      hookTitles: ['아기 욕조 유해성분 괜찮을까'],
      cards: [
        {
          role: 'cover',
          title: '아기 욕조 유해성분 괜찮을까',
          body: '소재·사용 조건·대체 기준\n유치원·어린이집 아침돌봄 지원 강화라는 원문 맥락에 사람들의 반응이 붙었어요.',
          sourceLine: '유치원·어린이집 아침돌봄 지원 강화…출근길 등원 돕는다 - 뉴시스',
          dataPoint: '제품 안전 이슈 보도 기반'
        },
        {
          role: 'checklist',
          title: '저장 기준 3개',
          body: '우리 집 상황과 맞나\n제도 기준이 있나\n아이 컨디션을 봤나'
        }
      ]
    };
    const plan = normalizeContentPlanForTest(mixedAiPlan, {
      id: 'mixed-daycare-baby-bath',
      label: '어린이집 등원 이슈',
      keyword: '어린이집 등원 감기 첫돌 워킹맘',
      category: '육아 트렌드',
      selectedHookTitle: '아기 욕조 유해성분 괜찮을까',
      sampleTitles: [
        '유치원·어린이집 아침돌봄 지원 강화…출근길 등원 돕는다 - 뉴시스',
        '“감기 걸린 아이, 유치원 보내면 맘충?” 워킹맘 토로'
      ]
    });

    const visible = [
      ...plan.cards.map((card) => `${card.title}\n${card.body}\n${card.sourceLine}\n${card.dataPoint}`),
      ...(plan.sourceNotes ?? [])
    ].join('\n');

    expect(plan.cards[0].title).toBe('아기 욕조 유해성분 괜찮을까');
    expect(plan.cards[0].visualPrompt).toContain('아기 욕조');
    expect(plan.cards.at(-1).visualPrompt).toContain('빈 줄 영역');
    expect(plan.cards.at(-1).body).toContain('성분 기준이 확인됐나');
    expect(visible).toMatch(/아기 욕조|성분|대체 기준|사용 연령/);
    expect(visible).not.toMatch(/어린이집|유치원|등원|돌봄|감기|아이 컨디션|제도 기준/);
  });

  it('uses the selected cover title as the top priority for product topics', () => {
    const plan = normalizeContentPlanForTest({}, {
      id: 'selected-title-product-priority',
      label: '어린이집 등원 이슈',
      keyword: '어린이집 등원 감기 워킹맘',
      category: '육아 트렌드',
      selectedHookTitle: '미국 아이 장난감 왜 팔릴까',
      sampleTitles: [
        '유치원·어린이집 아침돌봄 지원 강화',
        '감기 걸린 아이 유치원 등원 기준'
      ]
    });

    const visible = [
      plan.coreAngle,
      plan.summary,
      ...plan.hookTitles,
      ...plan.cards.map((card) => `${card.title}\n${card.body}\n${card.sourceLine}\n${card.dataPoint}`)
    ].join('\n');

    expect(plan.cards[0].title).toBe('미국 아이 장난감 왜 팔릴까');
    expect(plan.hookTitles).toContain('미국 아이 장난감 왜 팔릴까');
    expect(plan.cards[0].visualPrompt).toContain('쇼핑 매거진형');
    expect(plan.cards[0].visualPrompt).not.toContain('팔릴까을');
    expect(plan.cards[3].visualPrompt).toContain('빈 중앙 패널');
    expect(plan.cards.at(-1).title).toBe('사기 전 체크 3개');
    expect(visible).toMatch(/살 이유|구매|장바구니|왜 이걸 사갈까/);
    expect(visible).not.toMatch(/어린이집|유치원|등원|감기|성분 기준|사용 연령|대체품/);
  });

  it('rewrites weak K-beauty source copy into useful card-news body copy', () => {
    const badAiPlan = {
      cards: [
        {
          role: 'cover',
          title: 'K뷰티 성분 중심 소비',
          body: '[기자의 눈] LA 한복판에서 실감한 K뷰티 현주소\n미주중앙일보라는 원문 맥락에 사람들의 반응이 붙었어요.',
          dataPoint: '[기자의 눈] LA 한복판에서 실감한 K뷰티 현주소'
        },
        {
          role: 'why_now',
          title: '왜 성분부터 볼까',
          body: "올리브영, 美 본토 상륙…K뷰티 '수출'서 '유통 주도권' 경쟁으로\nv. daum.\nnet라는 원문 맥락에 사람들의 반응이 붙었어요.",
          dataPoint: "올리브영, 美 본토 상륙…K뷰티 '수출'서 '유통 주도권' 경쟁으로"
        },
        {
          role: 'community_signal',
          title: '후기가 움직인 이유',
          body: '"K뷰티 제품은 믿을 수 있는 성분으로 최고예요!" 같은 다양한 소비자 후기가 보여요.'
        },
        { role: 'comparison', title: '브랜드보다 기준', body: '출처명과 수집 채널을 보고 비교해야 합니다.' },
        { role: 'data_scene', title: '반응 지표', body: '카드뉴스 문구를 작성해야 합니다.' },
        { role: 'misconception', title: '오해 포인트', body: 'K뷰티의 미래를 알아보겠습니다.' },
        { role: 'content_angle', title: '콘텐츠 포인트', body: '다양한 소비자 후기 중심으로 설명해야 합니다.' },
        { role: 'checklist', title: '구매 전 체크', body: '확인할 지표를 넣어주세요.' }
      ]
    };

    const plan = normalizeContentPlanForTest(badAiPlan, {
      id: 'k-beauty-ingredient-consumption',
      label: 'K뷰티 성분 중심 소비',
      keyword: 'K뷰티 아마존 미국 소비 성분 효능 리뷰',
      category: '뷰티 트렌드',
      selectedHookTitle: 'K뷰티, 왜 성분부터 볼까',
      sampleTitles: [
        "올리브영, 美 본토 상륙…K뷰티 '수출'서 '유통 주도권' 경쟁으로",
        '[기자의 눈] LA 한복판에서 실감한 K뷰티 현주소'
      ]
    });

    const bodyCopy = plan.cards.map((card) => card.body).join('\n');

    expect(bodyCopy).toMatch(/성분|효능|리뷰|가격|구매 기준|사용감/);
    expect(bodyCopy).toMatch(/패키지보다 성분|브랜드명만 보면 이유가 흐려져요|선택 기준이 보여요/);
    expect(bodyCopy).not.toMatch(/저장 목록에 올라왔어요|원문 맥락|v\.\s*daum|믿을 수 있는 성분으로 최고|다양한 소비자 후기|카드뉴스 문구|알아보겠습니다/);
  });

  it('does not repeat the same strengthened body across K-beauty cards', () => {
    const plan = normalizeContentPlanForTest({
      cards: [
        { role: 'cover', title: '미국 아마존에서 K뷰티 제품이 강세!', body: 'K뷰티가 인기입니다.' },
        { role: 'why_now', title: '왜 이렇게 인기 있나', body: 'K뷰티가 인기입니다.' },
        { role: 'content_angle', title: '사용 장면', body: 'K뷰티가 인기입니다.' },
        { role: 'comparison', title: '타 브랜드 비교', body: 'K뷰티가 인기입니다.' },
        { role: 'checklist', title: '구매 체크리스트', body: 'K뷰티가 인기입니다.' }
      ]
    }, {
      id: 'k-beauty-repeated-weak-bodies',
      label: 'K뷰티 성분 중심 소비',
      keyword: 'K뷰티 아마존 미국 소비 성분 효능 리뷰',
      category: '뷰티 트렌드',
      selectedHookTitle: '미국 아마존에서 K뷰티 제품이 강세!',
      sampleTitles: [
        '“성분은 기본, 효능은 필수”… 더 까다로워진 美 뷰티 시장',
        'K뷰티 소비의 중심 이동',
        "K뷰티 '잔치'된 美 아마존 블프…1등부터 휩쓸었다"
      ]
    });

    const bodies = plan.cards.map((card) => card.body);
    const uniqueBodies = new Set(bodies.map((body) => body.replace(/\s+/g, ' ').trim()));

    expect(uniqueBodies.size).toBeGreaterThanOrEqual(4);
    expect(bodies.join('\n')).toMatch(/성분|효능|리뷰|가격|구매 기준|장바구니/);
    expect(bodies.join('\n')).not.toMatch(/저장 목록에 올라왔어요|단순 화제보다 반응의 방향/);
    expect(plan.cards[0].body).toMatch(/아쉬워요|마음이 움직였는지/);
  });

  it('writes parent reaction cards as concrete blocked moments instead of generic empathy copy', async () => {
    const originalKey = process.env.OPENAI_API_KEY;
    const originalProvider = process.env.AI_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_PROVIDER;

    let plan;
    try {
      plan = await createContentPlan({
        id: 'daycare-cold-parent-issue',
        label: '감기 걸리면 어린이집 보내면 안 될까',
        keyword: '어린이집 등원 감기 워킹맘 부모 현실',
        category: '육아 트렌드',
        selectedHookTitle: '감기 걸리면 어린이집 보내면 안 될까',
        evidence: [
          { title: '감기 걸린 아이 유치원 등원 기준과 워킹맘 토로' }
        ],
        sampleTitles: ['감기 걸린 아이, 유치원 보내면 괜찮을까']
      });
    } finally {
      if (originalKey) process.env.OPENAI_API_KEY = originalKey;
      if (originalProvider) process.env.AI_PROVIDER = originalProvider;
    }

    const reaction = plan.cards.find((card) => card.role === 'community_signal');

    expect(reaction?.title).toBe('부모들이 막힌 순간');
    expect(reaction?.body).toContain('출근 시간');
    expect(reaction?.body).toContain('기관 기준');
    expect(reaction?.body).not.toMatch(/정보보다 공감|우리 집도 이럴 때|저장돼요/);
    expect(reaction?.visualItems).toEqual(expect.arrayContaining(['출근 시간', '아이 컨디션', '기관 기준']));
    expect(plan.captionBody).toContain('기관 기준');
    expect(plan.captionBody).toContain('등원 전');
    expect(plan.captionBody).not.toMatch(/까은|제도 기준|반응, 비교 기준, 숫자 하나|확인할 숫자|단순히 많이 언급/);
  });

  it('creates a finished manual daycare shortage carousel without an AI provider', async () => {
    const providerKeys = ['OPENAI_API_KEY', 'GEMINI_API_KEY', 'ANTHROPIC_API_KEY', 'XAI_API_KEY', 'GROQ_API_KEY', 'DEEPSEEK_API_KEY', 'MISTRAL_API_KEY', 'DEEPINFRA_API_KEY'];
    const original = Object.fromEntries(providerKeys.map((key) => [key, process.env[key]]));
    const originalProvider = process.env.AI_PROVIDER;
    for (const key of providerKeys) delete process.env[key];
    delete process.env.AI_PROVIDER;

    let plan;
    try {
      plan = await createContentPlan({
        id: 'manual-daycare-shortage',
        label: '왜 어린이집은 늘 부족할까?',
        keyword: '어린이집 부족 대기 수요 부모 현실',
        category: '육아 트렌드',
        sourceMode: 'manual',
        cardCount: 5,
        selectedHookTitle: '왜 어린이집은 늘 부족할까?',
        summary: '부모들이 체감하는 어린이집 부족 문제를 저장형 카드뉴스로 설명',
        manualBrief: {
          topic: '왜 어린이집은 늘 부족할까?',
          prompt: '공급, 위치, 시간, 선호도 차이로 쉽게 풀어줘. 단정적인 통계 없이 구조를 설명하고 마지막은 부모가 확인할 기준으로 마무리.',
          cardCount: 5,
          audience: '어린이집 대기와 입소 문제를 겪는 부모',
          tone: '현실적이고 차분하게'
        },
        sources: ['manual']
      });
    } finally {
      for (const [key, value] of Object.entries(original)) {
        if (value) process.env[key] = value;
      }
      if (originalProvider) process.env.AI_PROVIDER = originalProvider;
    }

    expect(plan.provider).toBe('fallback');
    expect(plan.cards).toHaveLength(5);
    expect(plan.cards.map((card) => card.title)).toEqual([
      '왜 어린이집은 늘 부족할까?',
      '문제는 숫자보다 위치',
      '시간이 안 맞아도 부족',
      '정원만 늘리면 될까',
      '입소 전 볼 기준 3개'
    ]);
    expect(plan.cards[0].body).toContain('자리 수만의 문제');
    expect(plan.cards[1].visualPrompt).toContain('동네 지도');
    expect(plan.cards[2].visualPrompt).toContain('2열 시간표');
    expect(plan.cards[4].body).toContain('대기 순번만');
    expect(plan.captionBody).toContain('거리, 운영 시간, 실제 등하원 동선');
    expect(plan.hashtags).toEqual(expect.arrayContaining(['#어린이집입소', '#입소대기', '#육아현실']));
    expect(plan.cards.map((card) => `${card.title}\n${card.body}\n${card.visualPrompt}`).join('\n')).not.toMatch(/시작하기|실천할 때|Search SERP|네이트판/);
  });

  it('locks manual design cards to the planning story flow', () => {
    const storyFlow = [
      '오늘은 어떤 운동을 해볼까? / 오늘의 운동 루틴은 상체 운동!',
      '상체 운동 루틴 소개: 벤치프레스, 랫풀다운, 시티드 로우, 숄더프레스, 덤벨 컬, 트라이셉스 푸시다운.',
      '첫 번째 운동: 벤치프레스 / 가슴 근육을 기르는 기본 운동 / 팔을 뻗고 가슴까지 내리기.',
      '두 번째 운동: 랫풀다운 / 등을 넓게 만드는 운동 / 바를 자신의 가슴쪽으로 당기기.',
      '세 번째 운동: 시티드 로우 / 중심 근육 강화 운동 / 줄을 자신 쪽으로 당기기.',
      '네 번째 운동: 숄더프레스 / 어깨 근육 발달 운동 / 덤벨을 머리 위로 밀어 올리기.',
      '다섯 번째 운동: 덤벨 컬 / 이두근 강화 운동 / 덤벨을 어깨쪽으로 올리기.',
      '여섯 번째 운동: 트라이셉스 푸시다운 / 삼두근 강화 운동 / 로프를 아래로 당기기.',
      '운동 완료 후: 오늘도 상체 운동 완료! 꾸준히 하면 분명 달라질 거야!',
      '다음에는 하체 운동도 함께 해보자!'
    ].join('\n');

    const plan = normalizeContentPlanForTest({
      cards: [
        { role: 'cover', title: '운동 싫어하는 주인공', body: '오늘도 운동하기 싫은 표정으로 시작해요.' },
        { role: 'content_angle', title: '운동을 시작하는 모습', body: '주인공이 결심하는 장면을 보여줘요.' },
        { role: 'checklist', title: '마무리', body: '저장하세요.' }
      ]
    }, {
      sourceMode: 'manual',
      label: '집에서 하는 운동루틴',
      cardCount: 10,
      manualBrief: {
        topic: '집에서 하는 운동루틴',
        contentDirection: '상체 운동을 어떻게 하는지 운동 자세와 횟수 중심으로 보여준다.',
        cardCount: 10
      },
      planningDraft: {
        format: 'instatoon',
        cardCount: 10,
        storyFlow
      }
    });

    expect(plan.cards).toHaveLength(10);
    expect(plan.cards.map((card) => card.title)).toEqual([
      '오늘은 어떤 운동을 해볼까?',
      '상체 운동 루틴 소개',
      '첫 번째 운동',
      '두 번째 운동',
      '세 번째 운동',
      '네 번째 운동',
      '다섯 번째 운동',
      '여섯 번째 운동',
      '운동 완료 후',
      '다음에는 하체 운동도 함께 해보자!'
    ]);
    expect(plan.cards[2].body).toContain('벤치프레스');
    expect(plan.cards[3].body).toContain('랫풀다운');
    expect(plan.cards[7].body).toContain('트라이셉스 푸시다운');
    expect(plan.carouselBlueprint).toHaveLength(10);
    expect(plan.cards.map((card) => `${card.title}\n${card.body}`).join('\n')).not.toMatch(/운동 싫어하는 주인공|운동을 시작하는 모습/);
  });

  it('uses planning story flow count over stale 6-card template counts', () => {
    const storyFlow = [
      '1컷: 표지',
      '2컷: 벤치프레스',
      '3컷: 랫풀다운',
      '4컷: 시티드 로우',
      '5컷: 숄더프레스',
      '6컷: 덤벨 컬',
      '7컷: 트라이셉스 푸시다운',
      '8컷: 세트와 휴식',
      '9컷: 완료 장면',
      '10컷: 다음 루틴 예고'
    ].join('\n');

    const plan = normalizeContentPlanForTest({}, {
      sourceMode: 'manual',
      label: '집에서 하는 운동루틴',
      cardCount: 6,
      manualBrief: {
        topic: '집에서 하는 운동루틴',
        contentDirection: '상체 운동 루틴을 10컷으로 설명한다.',
        cardCount: 6
      },
      planningDraft: {
        cardCount: 6,
        storyFlow
      }
    });

    expect(plan.cards).toHaveLength(10);
    expect(plan.generation.requestedCardCount).toBe(10);
    expect(plan.carouselBlueprint).toHaveLength(10);
    expect(plan.cards[9].title).toBe('10컷');
  });

  it('adds verified omega-3 chart and table data to manual supplement carousels', async () => {
    const providerKeys = ['OPENAI_API_KEY', 'GEMINI_API_KEY', 'ANTHROPIC_API_KEY', 'XAI_API_KEY', 'GROQ_API_KEY', 'DEEPSEEK_API_KEY', 'MISTRAL_API_KEY', 'DEEPINFRA_API_KEY'];
    const original = Object.fromEntries(providerKeys.map((key) => [key, process.env[key]]));
    const originalProvider = process.env.AI_PROVIDER;
    for (const key of providerKeys) delete process.env[key];
    delete process.env.AI_PROVIDER;

    let plan;
    try {
      plan = await createContentPlan({
        id: 'manual-omega3-supplement',
        label: '오메가3 영양제는 꼭 먹어야할까?',
        keyword: '오메가3 EPA DHA ALA 영양제 권장 섭취량',
        category: '건강 정보',
        sourceMode: 'manual',
        cardCount: 5,
        selectedHookTitle: '오메가3 영양제는 꼭 먹어야할까?',
        summary: '오메가3 영양제가 꼭 필요한지 식단과 권장 섭취량 기준으로 설명',
        manualBrief: {
          topic: '오메가3 영양제는 꼭 먹어야할까?',
          prompt: '식단 비교 그래프, 오메가3 권장 섭취량, 영양제 효능 정보를 검증 데이터로 보여줘.',
          cardCount: 5
        }
      });
    } finally {
      for (const [key, value] of Object.entries(original)) {
        if (value) process.env[key] = value;
      }
      if (originalProvider) process.env.AI_PROVIDER = originalProvider;
    }

    expect(plan.provider).toBe('fallback');
    expect(plan.generation.visualDataEnrichment).toMatchObject({
      mode: 'curated_verified_profile',
      profiles: ['omega3_official_sources'],
      cardCount: 2
    });
    expect(plan.generation.visualDataEnrichment.cards).toEqual(expect.arrayContaining([
      expect.objectContaining({ page: 3, type: 'bar_chart', title: '식단으로 채우는 오메가3' }),
      expect.objectContaining({ page: 4, type: 'evidence_table', title: '보충제별 효능 근거' })
    ]));
    expect(plan.cards[2].role).toBe('data_scene');
    expect(plan.cards[2].visualData?.type).toBe('bar_chart');
    expect(plan.cards[2].visualData?.title).toBe('식단으로 채우는 오메가3');
    expect(plan.cards[2].visualData?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '아마씨유 1T', value: 7.26, display: 'ALA 7.26g' }),
      expect.objectContaining({ label: '연어 3oz', value: 1.83, display: 'DHA 1.24+EPA 0.59g' }),
      expect.objectContaining({ label: '피쉬오일', value: 0.3, display: 'EPA 0.18+DHA 0.12g' })
    ]));
    expect(plan.cards[2].visualData?.items.find((item) => item.label === '연어 3oz')?.segments).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'DHA', value: 1.24 }),
      expect.objectContaining({ label: 'EPA', value: 0.59 })
    ]));
    expect(plan.cards[2].visualData?.referenceLines).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '성인 남성 ALA AI', value: 1.6 }),
      expect.objectContaining({ label: '성인 여성 ALA AI', value: 1.1 })
    ]));
    expect(plan.cards[2].visualData?.callouts.join('\n')).toContain('EPA·DHA는 공식 권장량');
    expect(plan.cards[3].role).toBe('comparison');
    expect(plan.cards[3].visualData?.type).toBe('evidence_table');
    expect(plan.cards[3].visualData?.title).toBe('보충제별 효능 근거');
    expect(plan.cards[3].visualData?.rows.flat().join('\n')).toMatch(/알갈오일|피쉬오일|처방 오메가3|고중성지방|의료진/);
    expect(plan.cards[3].visualData?.sources.map((source) => source.label)).toEqual(expect.arrayContaining(['NIH ODS Omega-3 Health Professional Fact Sheet']));
  });

  it('preserves structured AI visualData for verified charts', () => {
    const plan = normalizeContentPlanForTest({
      cards: [
        {
          role: 'data_scene',
          layout: 'data_chart',
          title: '섭취 기준 비교',
          body: '기준이 있는 값만 따로 봐야 해요.',
          visualData: {
            type: 'bar_chart',
            title: '검증된 기준값',
            subtitle: '공식 기준',
            unit: 'g/day',
            items: [
              { label: 'A', value: 1.2, display: '1.2g', note: '공식' },
              { label: 'B', value: 0.8, display: '0.8g', note: '공식' }
            ],
            sources: [{ label: 'Official Source', url: 'https://example.com' }]
          }
        }
      ]
    }, {
      label: '영양 기준 테스트',
      keyword: '검증 데이터'
    });

    expect(plan.cards[0].visualData?.type).toBe('bar_chart');
    expect(plan.cards[0].visualData?.items).toHaveLength(2);
    expect(plan.cards[0].visualData?.sources[0]).toEqual({ label: 'Official Source', url: 'https://example.com' });
  });

  it('targets only data-like cards without existing visualData for AI enrichment', () => {
    const plan = normalizeContentPlanForTest({
      cards: [
        { role: 'cover', layout: 'cover_text', title: '표지는 제외', body: '본문' },
        { role: 'data_scene', layout: 'data_chart', title: '검색량 비교', body: '수치 비교가 필요해요.', visualPrompt: '검색량 그래프' },
        {
          role: 'comparison',
          layout: 'comparison_board',
          title: '이미 검증된 표',
          body: '이미 데이터가 있어요.',
          visualData: {
            type: 'evidence_table',
            title: '검증 표',
            columns: ['기준', '값'],
            rows: [['A', 'B']],
            sources: [{ label: '공식 출처', url: 'https://example.com' }]
          }
        }
      ]
    }, {
      label: '검색량 비교 테스트',
      keyword: '검색량 비교',
      cardCount: 3
    });

    const targets = __contentPlannerTestUtils.visualDataResearchTargets(plan, { label: '검색량 비교 테스트' });
    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({ page: 2, role: 'data_scene', layout: 'data_chart' });
  });

  it('builds compact external-search queries for visualData research targets', () => {
    const targets = [
      {
        page: 3,
        role: 'data_scene',
        layout: 'data_chart',
        title: '식단별 함량 비교',
        body: '식품별 수치가 필요해요.',
        visualPrompt: '함량 그래프',
        visualItems: ['연어', '정어리']
      },
      {
        page: 4,
        role: 'comparison',
        layout: 'comparison_board',
        title: '영양제 형태 비교',
        body: '표로 비교해요.',
        visualPrompt: '비교표'
      }
    ];
    const queries = __contentPlannerTestUtils.visualDataSearchQueries({
      label: '오메가3 영양제는 꼭 먹어야할까?'
    }, {}, targets);

    expect(queries).toHaveLength(2);
    expect(queries[0]).toContain('식단별 함량 비교');
    expect(queries[0]).toContain('공식 통계 수치 그래프 데이터 출처');
    expect(queries[1]).toContain('공식 통계 기준 비교표 데이터 출처');
    expect(queries.every((query) => query.length <= 180)).toBe(true);
  });

  it('normalizes and dedupes external search results for AI source material', () => {
    const items = __contentPlannerTestUtils.flattenExternalSearchResults([
      {
        source: 'Tavily',
        results: [
          { title: '공식 데이터 표', snippet: '검증된 수치 설명', url: 'https://example.com/data?utm=1' },
          { title: '다른 데이터', snippet: '비교 기준', url: 'https://example.com/other' }
        ]
      },
      {
        source: 'Brave Search',
        results: [
          { title: '공식 데이터 표 중복', snippet: '중복 URL', url: 'https://example.com/data?ref=2' }
        ]
      }
    ], '공식 데이터');
    const deduped = __contentPlannerTestUtils.dedupeVisualDataSources(items);

    expect(items[0]).toMatchObject({ source: 'Tavily', title: '공식 데이터 표', text: '검증된 수치 설명', query: '공식 데이터' });
    expect(deduped).toHaveLength(2);
    expect(deduped.map((item) => item.url)).toEqual(['https://example.com/data?utm=1', 'https://example.com/other']);
  });

  it('collects existing evidence and injected external search results into one visualData source pack', async () => {
    const targets = [{
      page: 2,
      role: 'data_scene',
      layout: 'data_chart',
      title: '검색량 비교',
      body: '수치 비교가 필요해요.',
      visualPrompt: '검색량 그래프'
    }];
    const sourcePack = await __contentPlannerTestUtils.collectVisualDataSourcePack({
      label: '검색량 비교 테스트',
      evidence: [{ source: '내부 근거', title: '커뮤니티 언급량', metric: '댓글 86개' }]
    }, { sourceNotes: ['공식 통계 우선'] }, targets, async (query) => [{
      source: 'Mock Search',
      results: [
        { title: '공식 검색량 데이터', snippet: 'A 10건, B 20건', url: 'https://example.com/search-volume' }
      ]
    }]);

    expect(sourcePack.searchStatus).toBe('searched');
    expect(sourcePack.searchQueries).toHaveLength(1);
    expect(sourcePack.searchResultCount).toBe(1);
    expect(sourcePack.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: '내부 근거', title: '커뮤니티 언급량', text: '댓글 86개' }),
      expect.objectContaining({ source: 'Mock Search', title: '공식 검색량 데이터', text: 'A 10건, B 20건', url: 'https://example.com/search-volume' })
    ]));
  });

  it('applies AI researched visualData only when sources are present', () => {
    const cards = [
      { page: 2, role: 'data_scene', layout: 'data_chart', title: '검색량 비교', body: '수치 비교가 필요해요.' },
      { page: 3, role: 'data_scene', layout: 'data_chart', title: '출처 없는 비교', body: '이 값은 쓰면 안 돼요.' }
    ];
    const { cards: nextCards, applied } = __contentPlannerTestUtils.applyAIVisualData(cards, {
      cards: [
        {
          page: 2,
          visualData: {
            type: 'bar_chart',
            title: '공식 검색량 비교',
            subtitle: '공식 자료 기준',
            items: [{ label: 'A', value: 10, display: '10건' }],
            sources: [{ label: 'Official Data', url: 'https://example.com/data' }]
          }
        },
        {
          page: 3,
          visualData: {
            type: 'bar_chart',
            title: '출처 없는 비교',
            items: [{ label: 'B', value: 20, display: '20건' }]
          }
        }
      ]
    });

    expect(applied).toEqual([expect.objectContaining({ page: 2, type: 'bar_chart', title: '공식 검색량 비교' })]);
    expect(nextCards[0].visualData?.title).toBe('공식 검색량 비교');
    expect(nextCards[1].visualData).toBeUndefined();
  });

  it('enforces omega-3 chart on card 3 and evidence table on card 4 even when AI roles are loose', () => {
    const plan = normalizeContentPlanForTest({
      cards: [
        { role: 'cover', layout: 'cover_text', title: '오메가3 영양제는 꼭 먹어야 할까?', body: '궁금증을 풀어봐요.' },
        { role: 'content_angle', layout: 'handwritten_research', title: '효과와 필요성', body: '종류를 먼저 나눠봐요.' },
        {
          role: 'why_now',
          layout: 'quote_card',
          title: '식단에서의 오메가3 섭취 비교',
          body: '식단으로 섭취하는 방법과 영양제를 비교해보세요.',
          visualPrompt: '오메가3가 많이 포함된 음식들의 일러스트',
          visualItems: ['타이밍', '반응 증가']
        },
        {
          role: 'content_angle',
          layout: 'quote_card',
          title: '내 얘기로 바뀌는 순간',
          body: '식습관, 섭취 형태, 가격대를 체크해야 해요.',
          visualPrompt: '체크리스트 형식으로 아이콘 정리'
        },
        { role: 'checklist', layout: 'checklist', title: '마무리 및 체크리스트', body: '위험 요소는 없는지\n개인 필요에 맞는지' }
      ]
    }, {
      label: '오메가3 영양제는 꼭 먹어야할까?',
      keyword: '오메가3 EPA DHA ALA 권장 섭취량'
    });

    expect(plan.cards[2].role).toBe('data_scene');
    expect(plan.cards[2].visualData?.type).toBe('bar_chart');
    expect(plan.cards[2].visualData?.title).toBe('식단으로 채우는 오메가3');
    expect(plan.cards[2].visualData?.items.map((item) => item.label)).toEqual(expect.arrayContaining(['아마씨유 1T', '연어 3oz', '피쉬오일']));
    expect(plan.cards[3].role).toBe('comparison');
    expect(plan.cards[3].visualData?.type).toBe('evidence_table');
    expect(plan.cards[3].visualData?.rows.flat().join('\n')).toContain('알갈오일');
  });
});
