import { describe, expect, it } from 'vitest';
import { classifyTitle, cleanKeyword, decodeEntities, extractContentTopicPhrases, isUsefulCandidate } from '../ranking-text.js';
import { isStrongFinalCandidate } from '../trend-ranker-utils.js';

describe('ranking text helpers', () => {
  it('cleans noisy markup and entities', () => {
    expect(decodeEntities('<![CDATA[AI &amp; 반도체]]>')).toBe('AI & 반도체');
    expect(cleanKeyword('[속보] AI 반도체.jpg')).toBe('AI 반도체');
  });

  it('does not match short English area keywords inside longer words', () => {
    expect(classifyTitle('FPN Daily 브래드 피트 이례적 언급').id).toBe('entertainment');
    expect(classifyTitle('FPN Daily 업무 자동화 사례').id).not.toBe('tech');
  });

  it('keeps backend interest areas aligned with dashboard filters', () => {
    expect(classifyTitle('반려동물 진료비 표준수가제').id).toBe('pet');
    expect(classifyTitle('어린이집 부모급여 지원 혜택').id).toBe('parenting');
  });

  it('filters generic or noisy candidates', () => {
    expect(isUsefulCandidate('ㅋㅋ')).toBe(false);
    expect(isUsefulCandidate('난리난')).toBe(false);
    expect(isUsefulCandidate('분위기')).toBe(false);
    expect(isUsefulCandidate('차별받았어요')).toBe(false);
    expect(isUsefulCandidate('받았어요')).toBe(false);
    expect(isUsefulCandidate('parenting products')).toBe(false);
    expect(isUsefulCandidate('viral product sold out')).toBe(false);
    expect(isUsefulCandidate('재팬코리아데일리')).toBe(false);
    expect(isUsefulCandidate('asked chatgpt to generate an')).toBe(false);
    expect(isUsefulCandidate('아이와 갈만한 곳')).toBe(false);
    expect(isUsefulCandidate('표현해봅니다')).toBe(false);
    expect(isUsefulCandidate('확인해봤습니다')).toBe(false);
    expect(isUsefulCandidate('체크해봅시다')).toBe(false);
    expect(isUsefulCandidate('한경매거진')).toBe(false);
    expect(isUsefulCandidate('도란도란·3위')).toBe(false);
    expect(isUsefulCandidate('AI')).toBe(true);
    expect(isUsefulCandidate('네이버페')).toBe(true);
  });

  it('rejects vague modifier candidates at the final ranking gate', () => {
    expect(isStrongFinalCandidate({
      keyword: '난리난',
      sources: ['Search SERP', 'Nate Pann', 'TheQoo'],
      sampleTitles: [
        "美서 난리난 스타벅스 '곰돌이컵'...3배 웃돈에도 품귀 - 뉴스1",
        '반응 난리난 방탄 콘서트 굿즈ㅋㅋㅋㅋㅋㅋ랩몬 진석 ...',
        '댓글 ㄹㅇ 난리난 정승환..................jpg'
      ]
    })).toBe(false);

    expect(isStrongFinalCandidate({
      keyword: '분위기',
      sources: ['Search SERP', 'Nate Pann'],
      sampleTitles: [
        "연말, 이국적인 분위기 내고 싶다면? 용산공원 '크리스마스 빌리지' - 서울특별시",
        '고급진 분위기'
      ]
    })).toBe(false);

    expect(isStrongFinalCandidate({
      keyword: '차별받았어요',
      sources: ['Nate Pann'],
      sampleTitles: ['고유가 지원금 때문에 차별받았어요']
    })).toBe(false);

    expect(isStrongFinalCandidate({
      keyword: 'asked chatgpt to generate an',
      sources: ['Reddit', 'Clien'],
      sampleTitles: ['i asked chatgpt to generate an image of average 4chan users meetup and umm.....']
    })).toBe(false);

    expect(isStrongFinalCandidate({
      keyword: '선관위',
      sources: ['Search SERP', 'Clien'],
      sampleTitles: ['선관위 업데이트가 멈춘 듯 싶네요']
    })).toBe(false);

    expect(isStrongFinalCandidate({
      keyword: '재팬코리아데일리',
      sources: ['Search SERP'],
      sampleTitles: ['재팬코리아데일리 기사 모음']
    })).toBe(false);

    expect(isStrongFinalCandidate({
      keyword: '표현해봅니다',
      sources: ['TheQoo'],
      sampleTitles: ['서울시장 이렇게 된 마당에 씁쓸한 마음 표현해봅니다']
    })).toBe(false);

    expect(isStrongFinalCandidate({
      keyword: '체크해봅시다',
      sources: ['Ruliweb'],
      sampleTitles: ['아침부터 건강 체크해봅시다']
    })).toBe(false);

    expect(isStrongFinalCandidate({
      keyword: '브래드',
      area: { id: 'entertainment' },
      sources: ['Search SERP', 'Google Trends'],
      sampleTitles: ['제니퍼 애니스톤, 전남편 브래드 피트 이례적 언급']
    })).toBe(false);

    expect(isStrongFinalCandidate({
      keyword: '한경매거진',
      sources: ['Search SERP'],
      sampleTitles: ['기업 교육도 AI 전환 가속 - 한경매거진']
    })).toBe(false);
  });

  it('keeps concrete product or policy candidates', () => {
    expect(isStrongFinalCandidate({
      keyword: '스타벅스 곰돌이컵',
      sources: ['Search SERP'],
      sampleTitles: ["美서 난리난 스타벅스 '곰돌이컵'...3배 웃돈에도 품귀 - 뉴스1"],
      evidence: [{ metric: '미국에서 품절난 상품', title: "美서 난리난 스타벅스 '곰돌이컵'...3배 웃돈에도 품귀 - 뉴스1" }]
    })).toBe(true);

    expect(isStrongFinalCandidate({
      keyword: '한국 라면 판매량 Top10',
      sources: ['Ruliweb', 'TheQoo'],
      sampleTitles: ['한국에서 라면 판매량 top10 안에 드는게 힘든 이유']
    })).toBe(true);

    expect(isStrongFinalCandidate({
      keyword: '육아 지원금',
      sources: ['Search SERP', 'Nate Pann'],
      sampleTitles: ['제주, 첫 아이 육아지원금 50만원→500만원 확대 - 한겨레']
    })).toBe(true);
  });

  it('extracts content-ready topic phrases from noisy signal text', () => {
    expect(extractContentTopicPhrases({
      title: '[K-뷰티 라운드테이블] AI 검색시대 시작…GEO, 브랜드 생존 여부 결정',
      metric: 'AI 검색 최적화 브랜드 노출'
    })).toContain('AI 검색 노출 전략');

    expect(extractContentTopicPhrases({
      title: 'AI와 로봇의 시대, SPA 브랜드의 생산 거점 바뀐다',
      metric: '브랜드 소비자 반응 변화'
    })).not.toContain('AI 검색 노출 전략');

    expect(extractContentTopicPhrases({
      title: '위고비·마운자로 관심 커지자 비만치료제 표방 식품 속출',
      metric: '건강 식품 주의 효과 비교'
    })).toContain('GLP-1 이후 유지어터 시장');

    expect(extractContentTopicPhrases({
      title: "반려동물 진료비 '표준수가제' 도입 된다",
      metric: '반려동물 병원'
    })).toContain('반려동물 진료비 표준수가제');
  });
});
