import { describe, expect, it } from 'vitest';
import { evaluateSignalQuality } from '../signal-quality.js';

describe('signal quality', () => {
  it('boosts useful marketing-friendly signals', () => {
    const result = evaluateSignalQuality({
      source: 'Search SERP',
      title: 'AI 검색 광고 전략 변화 분석',
      summary: '브랜드가 비교해야 할 가격과 혜택 변화'
    });

    expect(result.storable).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(72);
  });

  it('excludes obvious political signals', () => {
    const result = evaluateSignalQuality({
      source: 'Community',
      title: '대통령 선거 여론조사',
      summary: ''
    });

    expect(result.storable).toBe(false);
    expect(result.label).toBe('제외');
  });
});
