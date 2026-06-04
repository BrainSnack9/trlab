import { describe, expect, it } from 'vitest';
import { defaultChannelProfiles } from '../../channel-profiles/channel-profiles.js';
import { getChannelProfileFit } from '../ranking-profile-fit.js';

function fit(candidate) {
  return getChannelProfileFit({
    signals: [],
    sampleTitles: [],
    ...candidate
  }, defaultChannelProfiles);
}

describe('ranking profile fit', () => {
  it('does not assign broad strategy terms as a channel profile', () => {
    const result = fit({
      keyword: '기업 생성형 AI 업무 활용',
      sampleTitles: [
        '코스콤, AI 실무 적용 사례 공유…업무 혁신 확산 본격화',
        '호반그룹, 생성형 AI 업무 자동화 사례 발굴',
        '[K-뷰티 라운드테이블] AI 검색시대 시작…브랜드 생존 여부 결정'
      ]
    });

    expect(result.bestProfile).toBeNull();
  });

  it('does not tag generic health comparison topics as us consumer trends', () => {
    expect(fit({
      keyword: '수면 영양제 성분 비교',
      sampleTitles: ['식물성 멜라토닌 시장 확대…소비자 선택 기준은?']
    }).bestProfile).toBeNull();

    expect(fit({
      keyword: '건강기능식품 광고 주의',
      sampleTitles: ['건강기능식품 광고 효과 비교와 선택 기준']
    }).bestProfile).toBeNull();
  });

  it('keeps specific commerce profile matches', () => {
    expect(fit({
      keyword: '틱톡 K뷰티 입소문',
      sampleTitles: ['미국 TikTok Shop K-Beauty Collective 참가']
    }).bestProfile).toMatchObject({ id: 'us-consumer' });

    expect(fit({
      keyword: 'AI 펫가젯',
      sampleTitles: ['해외에서 유행하는 pet gadgets']
    }).bestProfile).toMatchObject({ id: 'pet' });
  });
});
