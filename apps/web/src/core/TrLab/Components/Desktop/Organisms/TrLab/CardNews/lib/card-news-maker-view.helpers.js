export const cardNewsMakerViewHelpers = {
  roleLabel(value) {
    return {
      cover: '표지',
      why_now: '왜 지금',
      community_signal: '반응',
      comparison: '비교',
      data_scene: '데이터',
      misconception: '오해',
      content_angle: '각도',
      checklist: '체크',
      closing: '마무리'
    }[value] ?? '카드';
  },

  flowTitleClass(value) {
    const length = `${value ?? ''}`.replace(/\s/g, '').length;
    if (length > 34) return 'text-[14px]';
    if (length > 24) return 'text-[15px]';
    return 'text-[17px]';
  },

  referenceLabel(value) {
    return {
      handdrawn_research: '리서치 노트형',
      photo_hook: '사진 후크형',
      magazine_story: '매거진형',
      meme_factcheck: '밈 팩트체크형'
    }[value] ?? value;
  }
};
