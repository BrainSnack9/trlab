import { describe, expect, it } from 'vitest';
import { generateCardNewsImage, generateLocalCard, makeImagePrompt } from './card-image-generator.js';

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
  sub: '#2563eb',
  slots: ['짧은 후크', '메모 칩', '비교/자료 영역', '체크 기준'],
  imageGuide: 'clean white editorial note board, small paper chips, comparison/data blocks'
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
  it('requires a remote AI image provider for generated card images', async () => {
    const providerKeys = ['OPENAI_API_KEY', 'XAI_API_KEY', 'DEEPINFRA_API_KEY', 'GEMINI_API_KEY'];
    const original = Object.fromEntries(providerKeys.map((key) => [key, process.env[key]]));
    for (const key of providerKeys) delete process.env[key];

    try {
      await expect(generateCardNewsImage({ studio, plan, card, style, index: 0 })).rejects.toThrow(/AI 이미지 생성이 필요합니다|provider/);
    } finally {
      for (const [key, value] of Object.entries(original)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it('passes card visual labels into the image prompt', () => {
    const prompt = makeImagePrompt({ studio, plan, card, style });

    expect(prompt).toContain('premium 4:5');
    expect(prompt).toContain('Final export is 1080x1350');
    expect(prompt).toContain('1080x1350');
    expect(prompt).toContain('Canvas template: 리서치 노트');
    expect(prompt).toContain('Use this template direction');
    expect(prompt).toContain('Respect template slots');
    expect(prompt).toContain('메모 칩');
    expect(prompt).toContain('Overlay contract');
    expect(prompt).toContain('Reference rhythm');
    expect(prompt).toContain('9~11장 권장');
    expect(prompt).toContain('Reference visual guide');
    expect(prompt).toContain('memo-style information card');
    expect(prompt).toContain('hand-drawn research note');
    expect(prompt).toContain('코스피 전체');
    expect(prompt).toContain('반도체 제외');
    expect(prompt).toContain('외국인 수급');
    expect(prompt).toContain('data card');
    expect(prompt).toContain('premium editorial data story layout');
    expect(prompt).toContain('clear reserved space in the center');
    expect(prompt).toContain('Do not render the actual graph');
    expect(prompt).toContain('no text, numbers, logos');
    expect(prompt).toContain('signboard');
    expect(prompt).toContain('keep it blank or abstract');
    expect(prompt).toContain('exact Korean SVG text afterward');
    expect(prompt).not.toContain('Keep Korean typography crisp');
    expect(prompt).not.toContain('Title: 숫자가 갈린다');
    expect(prompt).not.toContain('Body: 코스피 전체');
    expect(prompt).not.toContain('Emphasis: 포함 vs 제외');
    expect(prompt).not.toMatch(/근거:|해석:|실행:/);
  });

  it('keeps image prompts compact while preserving the canvas template direction', () => {
    const prompt = makeImagePrompt({
      studio: { label: '일본 생활 쇼핑 추천템', category: '미국 소비 트렌드' },
      plan: { ...plan, referenceStyle: 'photo_hook' },
      style: {
        name: '실사 이미지 배경',
        desc: '카드 전체에 실제 사진 같은 배경을 깔고 제목을 얹는 방식',
        bg: '#09090b',
        ink: '#ffffff',
        accent: '#facc15',
        sub: '#e5e7eb',
        slots: ['풀블리드 실사 배경', '큰 제목', '짧은 본문', '강조 라벨'],
        imageGuide: 'topic-specific realistic full-bleed photo background, dark calm lower safe area, strong visual subject'
      },
      card: {
        page: 1,
        role: 'cover',
        layout: 'cover_photo',
        title: '일본 생활 쇼핑 추천템',
        body: '문맥과 검색 결과를 확인한 뒤 기획해요.',
        visualPrompt: '일본 생활용품 매대와 실제 제품 패키지가 보이는 실사 배경'
      }
    });

    expect(prompt.length).toBeLessThan(2600);
    expect(prompt).toContain('Canvas template: 실사 이미지 배경');
    expect(prompt).toContain('full-bleed photo background');
    expect(prompt).toContain('풀블리드 실사 배경');
    expect(prompt).toContain('Backplate only');
  });

  it('uses plan primary topic over stale studio label in final image prompts', () => {
    const prompt = makeImagePrompt({
      studio: { label: '어린이집 등원 이슈', keyword: '어린이집 등원 감기 워킹맘' },
      plan: {
        ...plan,
        primaryTopic: '아기 욕조 유해성분 괜찮을까',
        selectedHookTitle: '아기 욕조 유해성분 괜찮을까'
      },
      style,
      card: {
        page: 1,
        role: 'cover',
        layout: 'cover_photo',
        title: '아기 욕조 유해성분 괜찮을까',
        body: '불안보다 확인 기준이 먼저 필요해요.',
        visualPrompt: '욕실 선반 위 아기 욕조, 물방울, 제품 라벨을 연상시키는 클린한 사진/3D 배경.',
        visualItems: ['아기 욕조', '제품 라벨', '성분 확인']
      }
    });

    expect(prompt).toContain('Topic: 아기 욕조 유해성분 괜찮을까.');
    expect(prompt).toContain('욕실 선반 위 아기 욕조');
    expect(prompt).not.toMatch(/Topic: 어린이집|등원 이슈|감기 워킹맘/);
  });

  it('renders checklist body lines over short visual labels for daycare shortage cards', () => {
    const result = generateLocalCard({
      studio: { label: '왜 어린이집은 늘 부족할까?', channelName: '@trlab.insight' },
      style,
      card: {
        page: 5,
        role: 'checklist',
        layout: 'checklist',
        title: '입소 전 볼 기준 3개',
        body: '집과 얼마나 가까운가\n출근 시간과 맞는가\n대기 순번만 보고 있진 않은가',
        emphasis: '입소 판단 기준',
        visualItems: ['거리', '시간', '대기 순번']
      }
    }, []);
    const svg = result.buffer.toString('utf8');

    expect(svg).toContain('집과 얼마나 가까운가');
    expect(svg).toContain('출근 시간과 맞는가');
    expect(svg).toContain('대기 순번만 보고 있진 않은가');
    expect(svg).toContain('대기 순번보다 거리, 시간, 실제 등하원 동선을');
    expect(svg).toContain('보세요.');
    expect(svg).not.toContain('저장할 때는 내 상황, 비교 기준');
  });

  it('does not duplicate checklist body lines in AI-backed body cards', () => {
    const result = generateLocalCard({
      studio: { label: '왜 어린이집은 늘 부족할까?', channelName: '@trlab.insight' },
      style,
      remoteVisual: { ext: 'png', buffer: Buffer.from('sample') },
      card: {
        page: 5,
        role: 'checklist',
        layout: 'checklist',
        title: '입소 전 볼 기준 3개',
        body: '집과 얼마나 가까운가\n출근 시간과 맞는가\n대기 순번만 보고 있진 않은가',
        emphasis: '입소 판단 기준'
      }
    }, []);
    const svg = result.buffer.toString('utf8');

    expect((svg.match(/집과 얼마나 가까운가/g) ?? []).length).toBe(1);
    expect((svg.match(/출근 시간과 맞는가/g) ?? []).length).toBe(1);
    expect(svg).toContain('대기 순번보다 거리, 시간, 실제 등하원 동선을');
    expect(svg).toContain('같이 보세요.');
    expect(svg).toContain('font-weight="600"');
  });

  it('uses wider text lines for AI-backed body cards instead of early character-count breaks', () => {
    const result = generateLocalCard({
      studio: { label: '왜 어린이집은 늘 부족할까?', channelName: '@trlab.insight' },
      style,
      remoteVisual: { ext: 'png', buffer: Buffer.from('sample') },
      card: {
        page: 2,
        role: 'community_signal',
        layout: 'quote_card',
        title: '문제는 숫자보다 위치',
        body: '어린이집이 있어도 집과 멀면 선택지가 아니에요.\n부모가 원하는 자리는 생활권 안에 있어야 해요.',
        emphasis: '생활권 기준'
      }
    }, []);
    const svg = result.buffer.toString('utf8');

    expect(svg).toContain('어린이집이 있어도 집과 멀면 선택지가 아니에요.');
    expect(svg).not.toContain('어린이집이 있어도 집과 멀면 선택지가</text>');
  });

  it('keeps long visible card text instead of truncating by line count or ellipsis', () => {
    const result = generateLocalCard({
      studio: { label: '긴 글 테스트', channelName: '@trlab.insight' },
      style,
      remoteVisual: { ext: 'png', buffer: Buffer.from('sample') },
      card: {
        page: 3,
        role: 'community_signal',
        layout: 'quote_card',
        title: '긴 문장도 잘리지 않아야 해요',
        body: '첫 번째 문장입니다.\n두 번째 문장입니다.\n세 번째 문장입니다.\n네 번째 문장입니다.\n다섯 번째 문장도 반드시 보여야 합니다.',
        emphasis: '긴 글 유지'
      }
    }, []);
    const svg = result.buffer.toString('utf8');

    expect(svg).toContain('첫 번째 문장입니다.');
    expect(svg).toContain('다섯 번째 문장도 반드시 보여야 합니다.');
    expect(svg).not.toContain('…');
  });

  it('filters internal source labels out of image prompts', () => {
    const prompt = makeImagePrompt({
      studio,
      plan,
      style,
      card: {
        ...card,
        visualItems: [
          'Search SERP',
          '“감기 걸린 아이, 유치원 보내면 맘충?”',
          '댓글 반응',
          '반복 언급'
        ],
        sourceLine: '“감기 걸린 아이, 유치원 보내면 ‘맘충’?” 워킹맘 토로…등원 기준은[요즘 임출육] - twig24.com',
        dataPoint: 'twig24.com'
      }
    });

    expect(prompt).toContain('댓글 반응');
    expect(prompt).toContain('반복 언급');
    expect(prompt).not.toMatch(/Search SERP|twig24|요즘 임출육|감기 걸린 아이/);
  });

  it('adds revision context only when regenerating from an existing card image', () => {
    const prompt = makeImagePrompt({
      studio,
      plan,
      style,
      card,
      editInstruction: '배경을 더 밝게 하고 그래프 공간은 더 비워줘',
      previousImagePrompt: 'Previous dark editorial chart backplate with compact center panel.'
    });

    expect(prompt).toContain('Revision request');
    expect(prompt).toContain('배경을 더 밝게');
    expect(prompt).toContain('Previous prompt context');
    expect(prompt).toContain('Preserve the card topic');
    expect(prompt).toContain('Backplate only');
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

  it('adds more breathing room between multi-line cover title and body', () => {
    const image = generateLocalCard({
      studio,
      style,
      card: {
        ...card,
        role: 'cover',
        layout: 'cover_photo',
        page: 1,
        title: '감기 걸리면 어린이집 보내면 안 될까',
        body: '부모에게 바로 닿는 문제예요.\n기준을 먼저 확인해요.'
      }
    }, []);
    const svg = image.buffer.toString('utf8');

    expect(svg).toContain('y="1108"');
    expect(svg).toContain('y="1200"');
    expect(svg).toContain('y="1300"');
  });

  it('renders community signal cards as creative scene overlays instead of rigid text boxes', () => {
    const image = generateLocalCard({
      studio: { label: '감기 걸리면 어린이집 보내면 안 될까' },
      style,
      card: {
        page: 2,
        role: 'community_signal',
        layout: 'quote_card',
        title: '부모들이 막힌 순간',
        body: '아이는 콧물이 나고, 출근 시간은 다가와요.\n기관 기준과 회사 눈치 사이에서 부모가 먼저 멈춰요.',
        emphasis: '현실 압박'
      }
    }, []);
    const svg = image.buffer.toString('utf8');

    expect(svg).toContain('현실 압박');
    expect(svg).toContain('부모들이 막힌 순간');
    expect(svg).toContain('아이는 콧물이 나고');
    expect(svg).toContain('font-weight="600" fill="#334155"');
    expect(svg).toContain('quoteShade');
    expect(svg).toContain('quoteTitleVeil');
    expect(svg).toContain('textLift');
    expect(svg).not.toContain('x="80" y="178" width="920" height="910"');
    expect(svg).not.toContain('x="78" y="226" width="760" height="292"');
    expect(svg).not.toContain('x="160" y="594" width="860" height="268"');
    expect(svg).not.toContain('현실에서 막히는 순간');
    expect(svg).not.toContain('아이 컨디션');
    expect(svg).not.toContain('사람들이 반응한 지점');
    expect(svg).not.toContain('정보보다 공감');
    expect(svg).not.toContain('font-weight="900" fill="#111827"');
  });

  it('renders comparison cards with a generated-only split board', () => {
    const image = generateLocalCard({
      studio: { label: '감기 걸리면 어린이집 보내면 안 될까' },
      style,
      card: {
        page: 3,
        role: 'comparison',
        layout: 'comparison_board',
        title: '상황마다 답이 달라요',
        body: '맞벌이, 전업, 아이 컨디션, 기관 기준을 나눠봐야 해요.',
        emphasis: '같은 등원 문제도 집마다 기준이 달라져요.',
        visualItems: ['아이 컨디션', '출근 시간', '기관 기준', '가정 상황']
      }
    }, []);
    const svg = image.buffer.toString('utf8');

    expect(svg).toContain('comparisonShade');
    expect(svg).toContain('comparisonPanel');
    expect(svg).toContain('아이 컨디션');
    expect(svg).not.toContain('x="80" y="350" width="430" height="170"');
    expect(svg).not.toContain('비교 기준으로 나눠보기');
  });

  it('renders checklist cards as a save-oriented timeline instead of the preview rows', () => {
    const image = generateLocalCard({
      studio: { label: '감기 걸리면 어린이집 보내면 안 될까' },
      style,
      card: {
        page: 5,
        role: 'checklist',
        layout: 'checklist',
        title: '보내기 전 기준 3개',
        body: '우리 집 상황과 맞나\n기관 기준이 있나\n아이 컨디션을 봤나',
        emphasis: '등원 판단 기준'
      }
    }, []);
    const svg = image.buffer.toString('utf8');

    expect(svg).toContain('checklistShade');
    expect(svg).toContain('checklistPanel');
    expect(svg).toContain('보내기 전 확인할 것');
    expect(svg).not.toContain('x="80" y="1135" width="920" height="96"');
    expect(svg).not.toContain('저장할 때는 비교 기준과 숫자');
  });

  it('renders research cards as editorial memo pages instead of dashed preview cards', () => {
    const image = generateLocalCard({
      studio: { label: '감기 걸리면 어린이집 보내면 안 될까' },
      style,
      card: {
        page: 4,
        role: 'research_note',
        layout: 'research_note',
        title: '숫자보다 먼저 볼 것',
        body: '확인된 수치가 없다면 사례를 숫자처럼 쓰면 안 돼요.\n반복된 등원 고민은 대표 신호로만 봐야 해요.',
        emphasis: '확인한 근거만 다음 카드로 넘겨요.'
      }
    }, []);
    const svg = image.buffer.toString('utf8');

    expect(svg).toContain('researchShade');
    expect(svg).toContain('researchPaper');
    expect(svg).toContain('확인 메모');
    expect(svg).not.toContain('stroke-dasharray="14 12"');
    expect(svg).not.toContain('x="80" y="360" width="920" height="520"');
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
