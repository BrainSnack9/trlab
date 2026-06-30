import { describe, expect, it, vi } from 'vitest';
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
    expect(prompt).toContain('Backplate style: research note backplate');
    expect(prompt).toContain('Use only the visual mood of this template');
    expect(prompt).toContain('Overlay reservation');
    expect(prompt).toContain('blank memo-chip area');
    expect(prompt).toContain('Background scene');
    expect(prompt).toContain('data backplate');
    expect(prompt).toContain('one empty central SVG-safe area');
    expect(prompt).toContain('No visible text or pseudo-data');
    expect(prompt).toContain('TrLab adds every Korean word');
    expect(prompt).not.toContain('Keep Korean typography crisp');
    expect(prompt).not.toContain('Title: 숫자가 갈린다');
    expect(prompt).not.toContain('Body: 코스피 전체');
    expect(prompt).not.toContain('Emphasis: 포함 vs 제외');
    expect(prompt).not.toContain('막대그래프와 비교표를 결합한 카드", composed');
    expect(prompt).not.toContain('Reference rhythm');
    expect(prompt).not.toContain('9~11장 권장');
    expect(prompt).not.toContain('Respect template slots');
    expect(prompt).not.toMatch(/근거:|해석:|실행:/);
  });

  it('uses the manually edited image prompt before generated planner details', () => {
    const prompt = makeImagePrompt({
      studio,
      plan,
      card,
      style,
      customImagePrompt: 'Custom blank editorial background with a soft green shelf and large empty center.',
      editInstruction: 'make the shelf brighter',
      previousImagePrompt: 'previous backplate'
    });

    expect(prompt).toContain('Custom blank editorial background');
    expect(prompt).toContain('Revision request: make the shelf brighter');
    expect(prompt).toContain('Previous prompt context to keep continuity: previous backplate');
    expect(prompt).not.toContain('반도체가 코스피에 미치는 영향');
    expect(prompt).not.toContain('Overlay reservation');
  });

  it('uses Pexels as a card backplate source when a visual brief query is available', async () => {
    const providerKeys = ['OPENAI_API_KEY', 'XAI_API_KEY', 'DEEPINFRA_API_KEY', 'GEMINI_API_KEY', 'PEXELS_API_KEY'];
    const original = Object.fromEntries(providerKeys.map((key) => [key, process.env[key]]));
    const originalFetch = globalThis.fetch;
    for (const key of providerKeys) delete process.env[key];
    process.env.PEXELS_API_KEY = 'pexels-test-key';
    const jpgBytes = new Uint8Array([255, 216, 255, 217]);
    globalThis.fetch = vi.fn(async (url) => {
      const textUrl = `${url}`;
      if (textUrl.includes('/v1/search')) {
        return {
          ok: true,
          json: async () => ({
            photos: [{
              id: 123,
              width: 1200,
              height: 1800,
              url: 'https://www.pexels.com/photo/test-123/',
              photographer: 'Test Photographer',
              photographer_url: 'https://www.pexels.com/@test',
              avg_color: '#eeeeee',
              alt: 'beauty flat lay',
              src: { large2x: 'https://images.pexels.com/photos/test.jpg' }
            }]
          })
        };
      }
      return {
        ok: true,
        arrayBuffer: async () => jpgBytes.buffer
      };
    });

    try {
      const image = await generateCardNewsImage({
        studio: { label: '미국 Gen Z 립오일', keyword: 'lip oil' },
        plan: {
          ...plan,
          productionBrief: {
            designConcept: '클린 뷰티 카드뉴스',
            pexelsStrategy: { enabled: true, globalQueries: ['lip gloss makeup pouch flat lay'], orientation: 'portrait' }
          }
        },
        style,
        index: 0,
        card: {
          ...card,
          visualType: 'photo',
          visualBrief: {
            pexelsQuery: 'lip gloss makeup pouch flat lay',
            pexels: { enabled: true, query: 'lip gloss makeup pouch flat lay', orientation: 'portrait' }
          }
        }
      });

      expect(image.provider).toBe('pexels');
      expect(image.sourceImage.photographer).toBe('Test Photographer');
      expect(image.warnings.join('\n')).toContain('Pexels photo used');
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.objectContaining({ href: expect.stringContaining('query=lip+gloss+makeup+pouch+flat+lay') }), expect.any(Object));
    } finally {
      globalThis.fetch = originalFetch;
      for (const [key, value] of Object.entries(original)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it('sanitizes reaction-card prompts so review/comment concepts do not become UI or text', () => {
    const prompt = makeImagePrompt({
      studio: { label: 'K뷰티 성분 중심 소비', keyword: 'K뷰티 성분 효능' },
      plan: {
        ...plan,
        referenceStyle: 'photo_hook',
        referencePattern: {
          deckLength: '8~12장 권장',
          coverRhythm: '@power_biolife처럼 사진 위에 믿기 어려운 반전 한 문장',
          bodyRhythm: '한 장에 사실 하나씩 공개',
          endingRhythm: '저장 기준 3개로 종료'
        },
        coreAngle: '제품 구매에 있어 성분에 기반한 정보 제공'
      },
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
        page: 3,
        role: 'community_signal',
        layout: 'quote_card',
        title: '소비자들의 리뷰가 말하고 있어요',
        body: '후기는 칭찬보다 필터에 가까워요.',
        visualPrompt: '소비자 리뷰 인용구',
        visualItems: ['커뮤니티 반응', '댓글 반응', '반복 언급']
      }
    });

    expect(prompt).toContain('Show consumer reaction through real-life context');
    expect(prompt).toContain('no social UI');
    expect(prompt).toContain('reaction backplate');
    expect(prompt).toContain('small emphasis overlay zone');
    expect(prompt).not.toContain('Reference rhythm');
    expect(prompt).not.toContain('@power_biolife');
    expect(prompt).not.toContain('소비자 리뷰 인용구');
    expect(prompt).not.toContain('댓글 반응');
    expect(prompt).not.toContain('short body copy');
    expect(prompt).not.toContain('small sticker points');
    expect(prompt).not.toContain('Respect template slots: 풀블리드 실사 배경, 큰 제목, 짧은 본문, 강조 라벨');
  });

  it('does not ask the image model to draw fake cosmetic ingredient or efficacy tables', () => {
    const prompt = makeImagePrompt({
      studio: { label: 'K뷰티 성분 중심 소비', keyword: 'K뷰티 성분 효능' },
      plan: { ...plan, primaryTopic: 'K뷰티 성분 중심 소비' },
      style,
      card: {
        page: 4,
        role: 'comparison',
        layout: 'comparison_board',
        title: '성분과 효능을 나눠봐요',
        body: '성분, 효능, 가격, 리뷰를 나눠봐야 선택 기준이 보여요.',
        emphasis: '비교 기준',
        visualPrompt: '성분표와 효능 비교표를 중앙에 크게 보여주는 카드',
        visualItems: ['성분', '효능', '가격', '리뷰']
      }
    });

    expect(prompt).toContain('blank calm central panel');
    expect(prompt).toContain('Do not draw rows with content');
    expect(prompt).toContain('ingredient lists');
    expect(prompt).toContain('efficacy graphics');
    expect(prompt).not.toContain('성분표와 효능 비교표를 중앙에 크게 보여주는 카드');
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

    expect(prompt.length).toBeLessThan(3300);
    expect(prompt).toContain('Backplate style: photographic full-bleed backplate');
    expect(prompt).toContain('full-bleed photo background');
    expect(prompt).toContain('full-bleed photo subject');
    expect(prompt).toContain('Backplate only');
    expect(prompt).not.toContain('일본 생활용품 매대');
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

    expect(prompt).toContain('Subject context: baby product safety check in a Korean parenting context.');
    expect(prompt).toContain('Clean baby product safety-check scene');
    expect(prompt).not.toMatch(/Subject context: 어린이집|등원 이슈|감기 워킹맘|아기 욕조/);
  });

  it('passes verified visual data as overlay context without asking the image model to draw it', () => {
    const prompt = makeImagePrompt({
      studio: { label: '오메가3 영양제는 꼭 먹어야할까?' },
      plan: { ...plan, primaryTopic: '오메가3 영양제는 꼭 먹어야할까?', coreAngle: '식단과 권장 섭취량 기준으로 판단' },
      style,
      card: {
        page: 3,
        role: 'data_scene',
        layout: 'data_chart',
        title: '권장량은 여기서 갈려요',
        body: '성인 기준으로 확정된 건 ALA 충분섭취량이에요.',
        visualPrompt: '오메가3 권장 섭취량 차트가 들어갈 빈 중앙 패널',
        visualData: {
          type: 'bar_chart',
          title: '오메가3 기준 섭취량',
          subtitle: 'ALA 충분섭취량',
          items: [
            { label: '성인 남성', value: 1.6, display: 'ALA 1.6g/일' },
            { label: '성인 여성', value: 1.1, display: 'ALA 1.1g/일' }
          ],
          sources: [{ label: 'NIH ODS Omega-3 Fact Sheet', url: 'https://ods.od.nih.gov/factsheets/Omega3FattyAcids-Consumer/' }]
        }
      }
    });

    expect(prompt).toContain('Realistic nutrition research scene');
    expect(prompt).toContain('Verified SVG overlay reserved: chart');
    expect(prompt).toContain('Do not draw data, source names, rows, bars, labels, or values');
    expect(prompt).toContain('Leave a calm blank panel for that SVG');
    expect(prompt).not.toContain('성인 남성: ALA 1.6g/일');
    expect(prompt).not.toContain('NIH ODS Omega-3 Fact Sheet');
  });

  it('returns the AI backplate without baking Korean text into a local SVG', () => {
    const result = generateLocalCard({
      studio: { label: '왜 어린이집은 늘 부족할까?', channelName: '@trlab.insight' },
      style,
      remoteVisual: { provider: 'mock-image', model: 'mock-backplate', ext: 'png', buffer: Buffer.from('sample-image') },
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

    expect(result.provider).toBe('mock-image');
    expect(result.model).toBe('mock-backplate');
    expect(result.ext).toBe('png');
    expect(result.buffer.toString('utf8')).toBe('sample-image');
    expect(result.buffer.toString('utf8')).not.toContain('입소 전 볼 기준 3개');
    expect(result.buffer.toString('utf8')).not.toContain('집과 얼마나 가까운가');
  });

  it('requires a remote visual before producing a backplate result', () => {
    expect(() => generateLocalCard({
      studio: { label: '긴 글 테스트', channelName: '@trlab.insight' },
      style,
      card: {
        page: 3,
        role: 'community_signal',
        layout: 'quote_card',
        title: '긴 문장도 잘리지 않아야 해요',
        body: '첫 번째 문장입니다.'
      }
    }, [])).toThrow(/이미지 provider 결과/);
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

    expect(prompt).toContain('No visible text or pseudo-data');
    expect(prompt).toContain('Overlay reservation');
    expect(prompt).not.toContain('댓글 반응');
    expect(prompt).not.toContain('반복 언급');
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
    expect(coverPrompt).not.toContain('Gangnam real estate');
    expect(checklistPrompt).toContain('save-worthy closing backplate');
    expect(checklistPrompt).toContain('blank horizontal rows');
  });

  it('keeps generated image output as a clean backplate for the SVG text editor', () => {
    const image = generateLocalCard({
      studio: { ...studio, channelName: '@gangnam.life' },
      style,
      remoteVisual: { provider: 'mock-provider', model: 'mock-model', ext: 'webp', buffer: Buffer.from('clean-backplate') },
      card: {
        ...card,
        role: 'cover',
        layout: 'cover_text',
        page: 1,
        title: '강남 집값',
        body: '밤의 아파트 불빛으로 봅니다.'
      }
    }, []);

    expect(image.ext).toBe('webp');
    expect(image.provider).toBe('mock-provider');
    expect(image.model).toBe('mock-model');
    expect(image.buffer.toString('utf8')).toBe('clean-backplate');
    expect(image.buffer.toString('utf8')).not.toContain('@gangnam.life');
    expect(image.buffer.toString('utf8')).not.toContain('강남 집값');
  });
});
