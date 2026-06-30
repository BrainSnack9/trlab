import { describe, expect, it } from 'vitest';
import { buildContentBrief, contentBriefToStudio, mergeStudioContentBrief } from './contentBrief';

describe('content brief', () => {
  it('uses story flow line count over stale template card counts', () => {
    const storyFlow = Array.from({ length: 10 }, (_, index) => `${index + 1}컷: 상체 운동 루틴`).join('\n');
    const brief = buildContentBrief({
      id: 'work-story-flow-count',
      title: '집에서 하는 운동루틴',
      planningDraft: {
        title: '상체 루틴 기획',
        topic: '집에서 하는 운동루틴',
        cardCount: 6,
        storyFlow
      },
      equippedItems: {
        template: {
          id: 'six-page-template',
          label: '6장 템플릿',
          pages: ['1', '2', '3', '4', '5', '6']
        }
      }
    });
    const studio = contentBriefToStudio(brief);

    expect(brief.planning.cardCount).toBe(10);
    expect(brief.generation.cardCount).toBe(10);
    expect(studio.cardCount).toBe(10);
    expect(studio.manualBrief.cardCount).toBe(10);
    expect(studio.contentSetup.cardCount).toBe(10);
  });

  it('treats work planning data as canonical when merging a stale queued studio', () => {
    const storyFlow = Array.from({ length: 10 }, (_, index) => `${index + 1}컷: 상체 운동 루틴`).join('\n');
    const workStudio = contentBriefToStudio(buildContentBrief({
      id: 'work-canonical',
      title: '집에서 하는 운동루틴',
      planningDraft: {
        id: 'planning-canonical',
        topic: '집에서 하는 운동루틴',
        cardCount: 10,
        storyFlow
      }
    }));
    const staleStudio = {
      id: workStudio.id,
      label: '오래된 큐 데이터',
      cardCount: 6,
      manualBrief: { topic: '오래된 큐 데이터', cardCount: 6 },
      contentSetup: { cardCount: 6, planningDraft: { cardCount: 6, storyFlow: '1컷\n2컷\n3컷\n4컷\n5컷\n6컷' } },
      planningDraft: { cardCount: 6, storyFlow: '1컷\n2컷\n3컷\n4컷\n5컷\n6컷' }
    };

    const merged = mergeStudioContentBrief(staleStudio, workStudio);

    expect(merged.label).toBe('집에서 하는 운동루틴');
    expect(merged.cardCount).toBe(10);
    expect(merged.manualBrief.cardCount).toBe(10);
    expect(merged.contentSetup.cardCount).toBe(10);
    expect(merged.planningDraft.cardCount).toBe(10);
  });
});
