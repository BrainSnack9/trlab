import { describe, expect, it } from 'vitest';
import { applyFeedbackBias, getFeedbackBias, keywordKey } from '../candidate-feedback.js';

describe('candidate feedback scoring', () => {
  it('normalizes Korean keywords into stable feedback keys', () => {
    expect(keywordKey('반려동물 진료비 표준수가제')).toBe('반려동물진료비표준수가제');
    expect(keywordKey('AI 검색 노출 전략')).toBe('ai검색노출전략');
  });

  it('uses exact keyword feedback without over-counting profile and area', () => {
    const candidate = {
      keyword: '반려동물 진료비 표준수가제',
      area: { id: 'life' },
      channelFit: { bestProfile: { id: 'pet' } },
      scoring: { total: 70 },
      validation: { score: 70 },
      score: 70
    };
    const summary = {
      keywords: { [keywordKey(candidate.keyword)]: 12 },
      profiles: { pet: 12 },
      areas: { life: 12 }
    };

    expect(getFeedbackBias(candidate, summary)).toBe(14);
    expect(applyFeedbackBias(candidate, summary).score).toBe(84);
  });

  it('applies softer profile and area bias when keyword feedback is absent', () => {
    const candidate = {
      keyword: 'AI 펫가젯',
      area: { id: 'life' },
      channelFit: { bestProfile: { id: 'pet' } },
      scoring: { total: 70 },
      validation: { score: 70 },
      score: 70
    };
    expect(getFeedbackBias(candidate, { profiles: { pet: 12 }, areas: { life: 12 } })).toBe(8);
  });
});
