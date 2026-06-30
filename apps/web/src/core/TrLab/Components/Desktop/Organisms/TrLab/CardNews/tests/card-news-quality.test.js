import { describe, expect, it } from 'vitest';
import { evaluateCardNewsPlan } from '../lib/card-news-quality.js';

const goodPlan = {
  referenceStyle: 'handdrawn_research',
  referencePattern: {
    deckLength: '9~11장 권장',
    coverRhythm: '짧은 주제명과 편집자의 한 줄 관찰',
    bodyRhythm: '사례, 비교, 숫자, 메모 주석을 분리',
    proofRhythm: '검증 정보는 내부 판단에만 사용',
    endingRhythm: '비교 기준이나 체크리스트로 저장 유도'
  },
  captionFirstLine: '코스피, 그냥 보면 놓쳐요',
  captionBody: '반응과 비교 기준을 같이 봐야 해요. 코스피 전체 지표만 보면 체감이 흐려질 수 있어서, 이번 카드에서는 커뮤니티 반응과 확인할 숫자를 나눠봤어요. 저장해두고 다음 이슈를 볼 때 비교 대상과 숫자 하나를 함께 확인하면 좋아요.',
  captionCTA: '저장하고 다음 비교 주제를 댓글로 남겨주세요.',
  hashtags: ['#카드뉴스', '#트렌드분석', '#코스피', '#반도체', '#저장각'],
  cards: [
    { role: 'cover', layout: 'cover_text', title: '코스피 착시', body: '지수만 보면 착시가 생겨요.\n비교하면 달라져요.', visualItems: ['코스피 전체', '반도체 제외'] },
    { role: 'community_signal', layout: 'quote_card', body: '댓글 반응이 한쪽으로 몰렸어요.', sourceLine: 'FMKorea 댓글 반응', visualItems: ['댓글 반응', '반복 언급'] },
    { role: 'comparison', layout: 'comparison_board', body: '포함과 제외를 나눠봐요.', sourceLine: '반도체 포함/제외 비교', visualItems: ['코스피 전체', '반도체 제외'] },
    { role: 'data_scene', layout: 'data_chart', body: '댓글 86개와 추천 140개를 같이 봐요.', dataPoint: '댓글 86개, 추천 140개', sourceLine: '댓글 86개, 추천 140개', visualItems: ['댓글', '추천'] },
    { role: 'misconception', layout: 'quote_card', body: '반응은 사실이 아니라 신호예요.', sourceLine: '시점과 기준 확인 필요', visualItems: ['반응', '확인 필요'] },
    { role: 'content_angle', layout: 'handwritten_research', body: '내 기준으로 바꾸면 저장할 이유가 생겨요.', sourceLine: '커뮤니티 반응 기반', visualItems: ['내 이야기화', '저장 포인트'] },
    { role: 'checklist', layout: 'checklist', body: '반응이 있었나\n비교가 가능한가\n숫자로 설명되나', sourceLine: '저장 기준', visualItems: ['반응이 있었나', '비교가 가능한가', '숫자로 설명되나'] }
  ]
};

describe('card-news quality checklist', () => {
  it('scores a complete reference-style plan as ready', () => {
    const quality = evaluateCardNewsPlan(goodPlan);

    expect(quality.score).toBe(100);
    expect(quality.label).toBe('출력 준비');
    expect(quality.checks.every((check) => check.passed)).toBe(true);
  });

  it('flags missing publishing and data requirements', () => {
    const quality = evaluateCardNewsPlan({
      cards: goodPlan.cards.slice(0, 5).map((card) => ({ ...card, visualItems: [] }))
    });

    expect(quality.score).toBeLessThan(80);
    expect(quality.checks.find((check) => check.label === '7~12장 캐러셀')?.passed).toBe(false);
    expect(quality.checks.find((check) => check.label === '레퍼런스 리듬')?.passed).toBe(false);
    expect(quality.checks.find((check) => check.label === '게시 문구 패키지')?.passed).toBe(false);
    expect(quality.checks.find((check) => check.label === '카드별 시각 라벨')?.passed).toBe(false);
    expect(quality.checks.find((check) => check.label === '카드별 시각 라벨')?.action).toContain('visualItems');
  });

  it('flags covers that feel like report titles instead of reference-style hooks', () => {
    const quality = evaluateCardNewsPlan({
      ...goodPlan,
      cards: [
        { ...goodPlan.cards[0], title: '반도체가 코스피에 미치는 영향 분석' },
        ...goodPlan.cards.slice(1)
      ]
    });

    expect(quality.checks.find((check) => check.label === '표지 제목 16자 이하')?.passed).toBe(false);
    expect(quality.checks.find((check) => check.label === '표지 훅 신호')?.passed).toBe(false);
    expect(quality.checks.find((check) => check.label === '표지 훅 신호')?.action).toContain('멈춤 단어');
    expect(quality.score).toBeLessThan(100);
  });

  it('flags repeated cards that do not create distinct carousel scenes', () => {
    const repeated = '댓글 반응과 비교 기준을 같이 확인하고 저장 기준으로 남겨요.';
    const quality = evaluateCardNewsPlan({
      ...goodPlan,
      cards: goodPlan.cards.map((card, index) => index === 1 || index === 2
        ? { ...card, title: '반응 비교', body: repeated }
        : card)
    });

    expect(quality.checks.find((check) => check.label === '카드별 장면 분리')?.passed).toBe(false);
    expect(quality.checks.find((check) => check.label === '카드별 장면 분리')?.detail).toContain('반복');
  });

  it('flags captions that are too short to provide context or save reason', () => {
    const quality = evaluateCardNewsPlan({
      ...goodPlan,
      captionBody: '저장해두세요.'
    });

    expect(quality.checks.find((check) => check.label === '캡션 본문 맥락')?.passed).toBe(false);
    expect(quality.checks.find((check) => check.label === '캡션 본문 맥락')?.action).toContain('120~700자');
  });
});
