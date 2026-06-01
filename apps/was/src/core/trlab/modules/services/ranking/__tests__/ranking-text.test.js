import { describe, expect, it } from 'vitest';
import { cleanKeyword, decodeEntities, isUsefulCandidate } from '../ranking-text.js';

describe('ranking text helpers', () => {
  it('cleans noisy markup and entities', () => {
    expect(decodeEntities('<![CDATA[AI &amp; 반도체]]>')).toBe('AI & 반도체');
    expect(cleanKeyword('[속보] AI 반도체.jpg')).toBe('AI 반도체');
  });

  it('filters generic or noisy candidates', () => {
    expect(isUsefulCandidate('ㅋㅋ')).toBe(false);
    expect(isUsefulCandidate('AI')).toBe(true);
    expect(isUsefulCandidate('네이버페')).toBe(true);
  });
});
