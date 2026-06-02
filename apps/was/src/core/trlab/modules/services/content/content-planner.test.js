import { describe, expect, it } from 'vitest';
import { createContentPlan, normalizeContentPlanForTest } from './content-planner.js';

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
    expect(plan.cards.find((card) => card.role === 'comparison')?.visualPrompt).toContain('2x2 비교표');
    expect(plan.cards.at(-1).visualPrompt).toContain('체크리스트');
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
    expect(plan.cards.at(-1).visualPrompt).toContain('체크리스트');
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
    expect(plan.cards[3].visualPrompt).toContain('그래프 대신 반복 언급 신호');
    expect(plan.cards.at(-1).title).toBe('사기 전 체크 3개');
    expect(visible).toMatch(/살 이유|구매|장바구니|왜 이걸 사갈까/);
    expect(visible).not.toMatch(/어린이집|유치원|등원|감기|성분 기준|사용 연령|대체품/);
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
});
