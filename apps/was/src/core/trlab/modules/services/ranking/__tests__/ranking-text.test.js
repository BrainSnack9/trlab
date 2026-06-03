import { describe, expect, it } from 'vitest';
import { cleanKeyword, decodeEntities, isUsefulCandidate } from '../ranking-text.js';
import { isStrongFinalCandidate } from '../trend-ranker-utils.js';

describe('ranking text helpers', () => {
  it('cleans noisy markup and entities', () => {
    expect(decodeEntities('<![CDATA[AI &amp; 반도체]]>')).toBe('AI & 반도체');
    expect(cleanKeyword('[속보] AI 반도체.jpg')).toBe('AI 반도체');
  });

  it('filters generic or noisy candidates', () => {
    expect(isUsefulCandidate('ㅋㅋ')).toBe(false);
    expect(isUsefulCandidate('난리난')).toBe(false);
    expect(isUsefulCandidate('분위기')).toBe(false);
    expect(isUsefulCandidate('차별받았어요')).toBe(false);
    expect(isUsefulCandidate('받았어요')).toBe(false);
    expect(isUsefulCandidate('parenting products')).toBe(false);
    expect(isUsefulCandidate('viral product sold out')).toBe(false);
    expect(isUsefulCandidate('asked chatgpt to generate an')).toBe(false);
    expect(isUsefulCandidate('아이와 갈만한 곳')).toBe(false);
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
});
