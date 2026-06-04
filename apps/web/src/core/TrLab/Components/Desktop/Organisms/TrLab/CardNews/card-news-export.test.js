import { describe, expect, it } from 'vitest';
import { makeCarouselScript, makeDeckBrief, makePostCopy, makePrompt, makeSvg } from './card-news-export.js';

const style = {
  name: '재테크 노트',
  bg: '#fff8f5',
  ink: '#211816',
  accent: '#f27493',
  sub: '#8a5b50'
};

const studio = {
  label: '반도체가 코스피에 미치는 영향'
};

const plan = {
  referenceStyle: 'handdrawn_research',
  coreAngle: '코스피를 반도체 포함/제외 관점으로 비교한다',
  referencePattern: {
    deckLength: '9~11장 권장',
    coverRhythm: '짧은 주제명과 편집자의 한 줄 관찰',
    bodyRhythm: '사례, 비교, 숫자를 분리',
    proofRhythm: '검증 정보는 내부 판단에만 사용',
    endingRhythm: '저장 기준으로 종료'
  }
};

const baseCard = {
  page: 1,
  role: 'cover',
  title: '코스피 착시',
  body: '지수만 보면 오른 것 같지만\n반도체를 빼면 다른 그림이 보여요.',
  emphasis: '비교 프레임',
  sourceLine: 'FMKorea 포텐 최신순, 검색 검증',
  dataPoint: '삼성전자와 SK하이닉스 비중 확인',
  visualPrompt: '반도체 포함/제외 비교 그래프'
};

describe('card-news export', () => {
  it.each([
    ['cover_text', '코스피 착시'],
    ['handwritten_research', '@trlab.insight · 01'],
    ['comparison_board', '기준'],
    ['data_chart', '대표 신호'],
    ['quote_card', '사람들이 멈춘 지점'],
    ['checklist', '✓']
  ])('renders %s as a 4:5 SVG with expected layout marker', (layout, marker) => {
    const svg = makeSvg({ ...baseCard, layout }, studio, style);

    expect(svg).toContain('width="1080" height="1350"');
    expect(svg).toContain(marker);
    expect(svg).not.toMatch(/근거:|해석:|실행:|CHECK POINT|비교 \d|TrLab Research/);
  });

  it('renders checklist cards as save-worthy closing cards', () => {
    const svg = makeSvg({
      ...baseCard,
      layout: 'checklist',
      title: '이렇게 만들기',
      emphasis: '저장 기준',
      visualItems: ['반응이 있었나', '비교가 가능한가', '숫자로 설명되나']
    }, studio, style);

    expect(svg).toContain('마지막으로 확인할 것');
    expect(svg).toContain('반응이 있었나');
    expect(svg).toContain('비교가 가능한가');
    expect(svg).toContain('내 상황, 비교 기준, 확인 근거');
  });

  it('renders cover cards as hook-first posters with emphasis and visual chips', () => {
    const svg = makeSvg({
      ...baseCard,
      layout: 'cover_text',
      visualItems: ['코스피 전체', '반도체 제외', '댓글 반응']
    }, studio, style);

    expect(svg).toContain('비교 프레임');
    expect(svg).toContain('코스피 전체');
    expect(svg).toContain('반도체 제외');
    expect(svg).toContain('@trlab.insight');
  });

  it('copies a backplate-only prompt without asking the image model to render copy or fake data', () => {
    const prompt = makePrompt(studio, plan, { ...baseCard, layout: 'data_chart' }, style.name);

    expect(prompt).toContain('4:5');
    expect(prompt).toContain('Backplate only');
    expect(prompt).toContain('No visible text or pseudo-data');
    expect(prompt).toContain('memo-style information card');
    expect(prompt).toContain('Overlay reservation');
    expect(prompt).toContain('TrLab adds every Korean word');
    expect(prompt).not.toContain('레퍼런스 리듬');
    expect(prompt).not.toContain('제목: 코스피 착시');
    expect(prompt).not.toContain('본문:');
    expect(prompt).not.toContain('강조 라벨: 비교 프레임');
    expect(prompt).not.toContain('반도체 포함/제외 비교 그래프');
    expect(prompt).not.toMatch(/근거:|해석:|실행:/);
  });

  it('builds a publish-ready post copy from caption package fields', () => {
    const copy = makePostCopy({
      captionFirstLine: '코스피, 그냥 보면 놓쳐요',
      captionBody: '반응과 비교 기준을 같이 봐야 해요.',
      captionCTA: '저장하고 다음 비교 주제를 댓글로 남겨주세요.',
      hashtags: ['#카드뉴스', '#트렌드분석', '#코스피']
    });

    expect(copy).toContain('코스피, 그냥 보면 놓쳐요');
    expect(copy).toContain('저장하고 다음 비교 주제를 댓글로 남겨주세요.');
    expect(copy).toContain('#카드뉴스 #트렌드분석 #코스피');
    expect(copy.split('\n\n')).toHaveLength(4);
  });

  it('builds a deck brief with reference rhythm and visual guardrails', () => {
    const brief = makeDeckBrief(plan);

    expect(brief).toContain('제작 브리프');
    expect(brief).toContain('레퍼런스 스타일: handdrawn_research');
    expect(brief).toContain('카드 길이: 9~11장 권장');
    expect(brief).toContain('시각 유형: 메모형 정보 카드');
    expect(brief).toContain('본문 시각');
    expect(brief).toContain('금지');
  });

  it('builds a full carousel script with cards and publish copy', () => {
    const script = makeCarouselScript({
      ...plan,
      captionFirstLine: '코스피, 그냥 보면 놓쳐요',
      hashtags: ['#카드뉴스', '#코스피'],
      cards: [
        { ...baseCard, page: 1, role: 'cover', visualItems: ['코스피 전체', '반도체 제외'] },
        { ...baseCard, page: 2, role: 'comparison', title: '비교해야 보여요', visualItems: ['전체', '제외'] }
      ]
    });

    expect(script).toContain('제작 브리프');
    expect(script).toContain('메모형 정보 카드');
    expect(script).toContain('표지 리듬');
    expect(script).toContain('Card 1 · 표지');
    expect(script).toContain('Card 2 · 비교');
    expect(script).toContain('시각 라벨: 코스피 전체 / 반도체 제외');
    expect(script).toContain('게시 문구');
    expect(script).toContain('#카드뉴스 #코스피');
  });

  it('uses card visualItems for chart and comparison labels', () => {
    const card = {
      ...baseCard,
      layout: 'data_chart',
      dataPoint: '댓글 86개, 추천 140개, 검색 52회',
      visualItems: ['코스피 전체', '반도체 제외', '외국인 수급', '댓글 반응']
    };

    const svg = makeSvg(card, studio, style);

    expect(svg).toContain('코스피 전체');
    expect(svg).toContain('반도체 제외');
    expect(svg).toContain('86개');
    expect(svg).toContain('140개');
    expect(svg).not.toContain('>78</text>');
    expect(svg).not.toContain('지표1');
  });

  it.each(['handwritten_research', 'comparison_board', 'data_chart', 'quote_card'])('renders %s without visible source or reference box', (layout) => {
    const svg = makeSvg({ ...baseCard, layout }, studio, style);

    expect(svg).not.toContain('참고/확인');
    expect(svg).not.toContain('FMKorea 포텐 최신순');
    expect(svg).not.toContain('출처');
  });

  it.each([
    ['지도·반경 리포트', 'map'],
    ['사다리 결정트리', 'tree'],
    ['파워 포토 훅', 'photo'],
    ['재테크 노트', 'note'],
    ['사진+스토리 매거진', 'story']
  ])('keeps legacy %s output free of planning labels', (name) => {
    const svg = makeSvg({ ...baseCard, layout: undefined }, studio, { ...style, name });

    expect(svg).toContain('width="1080" height="1350"');
    expect(svg).not.toMatch(/근거:|해석:|실행:|출처|참고\/확인|>근거<|>해석<|>행동</);
    expect(svg).not.toMatch(/서울|판교|분당|\+467|\+1021|성장성이 중요|안정성이 중요/);
  });

  it('renders the power photo preset with a dark hook poster without a source box', () => {
    const svg = makeSvg({ ...baseCard, layout: undefined }, studio, { ...style, name: '파워 포토 훅', accent: '#facc15', sub: '#e5e7eb' });

    expect(svg).toContain('powerPhoto');
    expect(svg).toContain('비교 프레임');
    expect(svg).not.toContain('참고/확인');
    expect(svg).not.toContain('FMKorea 포텐 최신순');
    expect(svg).toContain('@trlab.insight');
  });

  it('wraps long titles while hiding source lines from the rendered card', () => {
    const longCard = {
      ...baseCard,
      layout: 'data_chart',
      title: '반도체가 코스피 전체 흐름을 착시처럼 보이게 만드는 이유',
      sourceLine: 'FMKorea 포텐 최신순, DCInside 커뮤니티 반응, 검색 검증 결과를 함께 확인'
    };
    const svg = makeSvg(longCard, studio, style);

    expect(svg).toContain('반도체가 코스피 전체');
    expect(svg).not.toContain('FMKorea 포텐 최신순');
    expect(svg).not.toContain('검색 검증 결과');
    expect(svg).not.toContain(`${longCard.title}</text>`);
    expect(svg).not.toContain(`${longCard.sourceLine}</text>`);
    expect((svg.match(/font-size="66"/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
