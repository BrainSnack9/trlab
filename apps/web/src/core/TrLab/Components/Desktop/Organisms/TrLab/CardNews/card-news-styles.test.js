import { describe, expect, it } from 'vitest';
import { autoStyle, cardStyles, referenceVisualGuide, styleTraits, templateSlots } from './card-news-styles.js';

describe('card-news reference style presets', () => {
  it.each([
    ['handdrawn_research', 'note', '핸드드로잉 리서치'],
    ['magazine_story', 'story', '매거진 포토 후크'],
    ['photo_hook', 'photo', '파워 포토 훅'],
    ['meme_factcheck', 'ranking', '밈 팩트체크 보드']
  ])('maps %s to %s preset', (referenceStyle, styleKey, styleName) => {
    expect(autoStyle({}, { referenceStyle })).toBe(styleKey);
    expect(cardStyles[styleKey].name).toBe(styleName);
  });

  it('keeps each preset tied to reference-style production slots', () => {
    expect(styleTraits('note')).toContain('메모 칩');
    expect(styleTraits('ranking')).toContain('팩트체크');
    expect(styleTraits('photo')).toContain('반전 문장');
    expect(templateSlots(cardStyles.photo)).toContain('풀블리드 사진');
    expect(styleTraits('story')).toContain('사진 표지');
    expect(templateSlots(cardStyles.note)).toContain('저장 기준');
    expect(templateSlots(cardStyles.ranking)).toContain('체크 라벨');
  });

  it('provides account-specific visual guides for prompt and UI alignment', () => {
    expect(referenceVisualGuide('handdrawn_research').account).toBe('@twojob_angel');
    expect(referenceVisualGuide('handdrawn_research').body).toContain('자료 칩');
    expect(referenceVisualGuide('photo_hook').account).toBe('@power_biolife');
    expect(referenceVisualGuide('photo_hook').cover).toContain('반전');
    expect(referenceVisualGuide('meme_factcheck').proof).toContain('내부 판단');
  });
});
