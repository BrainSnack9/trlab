import { describe, expect, it } from 'vitest';
import { autoStyle, cardStyles, referenceVisualGuide, styleRecommendation, styleTraits, templateSlots } from './card-news-styles.js';

describe('card-news reference style presets', () => {
  it.each([
    ['handdrawn_research', 'note', '메모형 정보 카드'],
    ['magazine_story', 'story', '일러스트 배경'],
    ['photo_hook', 'photo', '실사 이미지 배경'],
    ['meme_factcheck', 'ranking', '팩트체크 보드']
  ])('maps %s to %s preset', (referenceStyle, styleKey, styleName) => {
    expect(autoStyle({}, { referenceStyle })).toBe(styleKey);
    expect(cardStyles[styleKey].name).toBe(styleName);
  });

  it('keeps each preset tied to reference-style production slots', () => {
    expect(styleTraits('note')).toContain('메모 칩');
    expect(styleTraits('ranking')).toContain('팩트체크');
    expect(Object.keys(cardStyles)).toEqual(['note', 'ranking', 'photo', 'story']);
    expect(templateSlots(cardStyles.note)).toContain('비교/자료 영역');
    expect(templateSlots(cardStyles.ranking)).toContain('오해/반박');
    expect(templateSlots(cardStyles.photo)).toContain('풀블리드 실사 배경');
    expect(templateSlots(cardStyles.story)).toContain('일러스트 장면');
  });

  it('provides account-specific visual guides for prompt and UI alignment', () => {
    expect(referenceVisualGuide('handdrawn_research').account).toBe('메모형 정보 카드');
    expect(referenceVisualGuide('handdrawn_research').body).toContain('자료 칩');
    expect(referenceVisualGuide('photo_hook').account).toBe('실사 이미지형');
    expect(referenceVisualGuide('photo_hook').cover).toContain('풀블리드 배경');
    expect(referenceVisualGuide('meme_factcheck').account).toBe('팩트체크 보드');
    expect(referenceVisualGuide('meme_factcheck').proof).toContain('내부 판단');
  });

  it('auto-selects korean medical meme for health and safety fact-check topics', () => {
    expect(autoStyle({ label: '아기 욕조 유해성분 괜찮을까', category: '육아 안전' }, {})).toBe('photo');
    expect(autoStyle({ label: '비타민 C 복용 오해', category: '건강 팩트체크' }, {})).toBe('ranking');
    expect(autoStyle({ label: '일본 생활 쇼핑 추천템', category: '미국 소비 트렌드' }, {})).toBe('photo');
    expect(autoStyle({ label: '감기 걸리면 어린이집 보내면 안 될까', category: '육아 트렌드' }, {})).toBe('story');
  });

  it('returns a user-facing recommendation reason and respects AI-provided style keys', () => {
    const product = styleRecommendation({ label: '아기 욕조 유해성분 괜찮을까', category: '육아 안전' }, {});
    expect(product.key).toBe('photo');
    expect(product.reason).toContain('눈으로 보여줘야');

    const aiPicked = styleRecommendation({ label: '일본 생활 쇼핑 추천템' }, { recommendedStyle: 'story' });
    expect(aiPicked.key).toBe('story');
    expect(aiPicked.reason).toContain('콘텐츠 설계');
  });
});
