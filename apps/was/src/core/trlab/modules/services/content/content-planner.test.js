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
    expect(plan.carouselBlueprint.length).toBeGreaterThanOrEqual(7);
    expect(plan.cards.length).toBeGreaterThanOrEqual(7);
    expect(plan.cards.map((card) => card.role)).toEqual([
      'cover',
      'community_signal',
      'comparison',
      'data_scene',
      'misconception',
      'content_angle',
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

  it('forces the reference carousel order even when AI returns mixed roles and layouts', () => {
    const mixedAiPlan = {
      referenceStyle: 'handdrawn_research',
      cards: [
        { role: 'data_scene', layout: 'data_chart', title: '잘못 온 데이터', body: '댓글 반응 86개를 먼저 확인해야 해요.' },
        { role: 'checklist', layout: 'checklist', title: '잘못 온 체크', body: '비교 기준을 저장해요.' },
        { role: 'cover', layout: 'cover_photo', title: '잘못 온 표지', body: '반도체 포함과 제외를 비교해요.' },
        { role: 'comparison', layout: 'comparison_board', title: '비교 카드', body: '코스피 전체와 반도체 제외 지표를 나눠봐요.' },
        { role: 'content_angle', layout: 'handwritten_research', title: '각도 카드', body: '커뮤니티 반응은 사실이 아니라 신호예요.' },
        { role: 'misconception', layout: 'quote_card', title: '오해 카드', body: '시점과 비교 기준을 같이 봐야 해요.' },
        { role: 'community_signal', layout: 'quote_card', title: '반응 카드', body: '저장 기준은 숫자 하나와 비교 축이에요.' }
      ]
    };

    const plan = normalizeContentPlanForTest(mixedAiPlan, candidate);

    expect(plan.cards.map((card) => card.role)).toEqual([
      'cover',
      'community_signal',
      'comparison',
      'data_scene',
      'misconception',
      'content_angle',
      'checklist'
    ]);
    expect(plan.cards.map((card) => card.layout)).toEqual([
      'cover_text',
      'quote_card',
      'comparison_board',
      'data_chart',
      'quote_card',
      'handwritten_research',
      'checklist'
    ]);
  });

  it('fills short AI responses into a complete 7-card reference carousel', () => {
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

    expect(plan.cards).toHaveLength(7);
    expect(plan.cards.map((card) => card.role)).toEqual([
      'cover',
      'community_signal',
      'comparison',
      'data_scene',
      'misconception',
      'content_angle',
      'checklist'
    ]);
    expect(plan.cards[3].layout).toBe('data_chart');
    expect(plan.cards[4].layout).toBe('quote_card');
    expect(plan.cards[5].layout).toBe('handwritten_research');
    expect(plan.cards[6].layout).toBe('checklist');
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
});
