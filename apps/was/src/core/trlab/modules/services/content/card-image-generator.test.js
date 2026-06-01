import { describe, expect, it } from 'vitest';
import { generateLocalCard, makeImagePrompt } from './card-image-generator.js';

const studio = {
  label: '반도체가 코스피에 미치는 영향',
  keyword: '반도체 코스피'
};

const plan = {
  referenceStyle: 'handdrawn_research',
  coreAngle: '코스피 전체와 반도체 제외 관점을 나눠보는 카드뉴스',
  referencePattern: {
    deckLength: '9~11장 권장',
    coverRhythm: '짧은 주제명과 편집자의 한 줄 관찰',
    bodyRhythm: '의문, 비교, 숫자를 한 장씩 분리',
    proofRhythm: '검증 정보는 카드 안에만 사용',
    endingRhythm: '저장 기준으로 종료'
  }
};

const style = {
  name: '리서치 노트',
  desc: '메모와 비교표가 얹힌 정보형 카드',
  bg: '#f8fafc',
  ink: '#0f172a',
  accent: '#dc2626',
  sub: '#2563eb'
};

const card = {
  page: 4,
  role: 'data_scene',
  layout: 'data_chart',
  title: '숫자가 갈린다',
  body: '코스피 전체 상승률만 보면 체감이 흐려져요.\n반도체 포함과 제외를 나눠보면 논점이 선명해져요.',
  emphasis: '포함 vs 제외',
  sourceLine: '커뮤니티 댓글 86개, 추천 140개 반응',
  visualPrompt: '막대그래프와 비교표를 결합한 카드',
  visualItems: ['코스피 전체', '반도체 제외', '외국인 수급', '댓글 반응']
};

describe('card image generator prompts and local fallback', () => {
  it('passes card visual labels into the image prompt', () => {
    const prompt = makeImagePrompt({ studio, plan, card, style });

    expect(prompt).toContain('premium 4:5');
    expect(prompt).toContain('4:5 final crop');
    expect(prompt).toContain('1080x1350');
    expect(prompt).toContain('Reference rhythm');
    expect(prompt).toContain('9~11장 권장');
    expect(prompt).toContain('Reference visual guide');
    expect(prompt).toContain('@twojob_angel');
    expect(prompt).toContain('hand-drawn research note');
    expect(prompt).toContain('코스피 전체');
    expect(prompt).toContain('반도체 제외');
    expect(prompt).toContain('외국인 수급');
    expect(prompt).toContain('data card');
    expect(prompt).toContain('premium editorial data story layout');
    expect(prompt).toContain('clear reserved space in the center');
    expect(prompt).toContain('Do not render the actual graph');
    expect(prompt).toContain('Do not render any Korean text');
    expect(prompt).toContain('exact SVG text afterward');
    expect(prompt).not.toMatch(/근거:|해석:|실행:/);
  });

  it('describes cover and checklist cards with their reference-style compositions', () => {
    const coverPrompt = makeImagePrompt({
      studio,
      plan,
      style,
      card: { ...card, role: 'cover', layout: 'cover_text', title: '코스피 착시' }
    });
    const checklistPrompt = makeImagePrompt({
      studio,
      plan,
      style,
      card: { ...card, role: 'checklist', layout: 'checklist', title: '이렇게 만들기' }
    });

    expect(coverPrompt).toContain('full-bleed editorial cover image');
    expect(coverPrompt).toContain('topic-specific full-bleed');
    expect(coverPrompt).toContain('Gangnam real estate');
    expect(checklistPrompt).toContain('save-worthy closing card');
    expect(checklistPrompt).toContain('blank checklist rows');
  });

  it('renders a 4:5 local svg with visual labels instead of internal layout names', () => {
    const image = generateLocalCard({ studio, card, style }, ['remote failed']);
    const svg = image.buffer.toString('utf8');

    expect(image.ext).toBe('svg');
    expect(svg).toContain('width="1080" height="1350"');
    expect(svg).toContain('코스피 전체');
    expect(svg).toContain('반도체 제외');
    expect(svg).toContain('외국인 수급');
    expect(svg).toContain('댓글 반응');
    expect(svg).not.toContain('Remote image unavailable');
    expect(svg).not.toContain('Exact-text render');
    expect(svg).not.toContain('참고/확인');
    expect(svg).not.toMatch(/data_chart|근거:|해석:|실행:/);
  });

  it('keeps local cover fallback aligned with the preview cover', () => {
    const image = generateLocalCard({
      studio,
      style,
      card: {
        ...card,
        role: 'cover',
        layout: 'cover_text',
        page: 1,
        title: '코스피 착시',
        body: '지수만 보면 놓쳐요.',
        sourceLine: 'FMKorea 포텐 최신순 검증 결과'
      }
    }, []);
    const svg = image.buffer.toString('utf8');

    expect(svg).toContain('@trlab.insight');
    expect(svg).toContain('coverShade');
    expect(svg).toContain('fallbackSky');
    expect(svg).toContain('코스피 착시');
    expect(svg).toContain('지수만 보면 놓쳐요.');
    expect(svg).not.toContain('저장 포인트');
    expect(svg).not.toContain('FMKorea 포텐 최신순');
    expect(svg).not.toContain('참고/확인');
    expect(svg).not.toContain('Exact-text render');
  });

  it('uses a custom channel name in generated cards', () => {
    const image = generateLocalCard({
      studio: { ...studio, channelName: '@gangnam.life' },
      style,
      card: {
        ...card,
        role: 'cover',
        layout: 'cover_text',
        page: 1,
        title: '강남 집값',
        body: '밤의 아파트 불빛으로 봅니다.'
      }
    }, []);
    const svg = image.buffer.toString('utf8');

    expect(svg).toContain('@gangnam.life');
    expect(svg).not.toContain('@trlab.insight');
    expect(svg).not.toContain('Exact-text render');
  });
});
