import { describe, expect, it } from 'vitest';
import { getBusinessDateAnalysisWindow, getBusinessDayAnalysisWindow, resolveTrendAnalysisWindow } from '../analysis-window.js';

describe('trend analysis window', () => {
  it('starts the business day at 05:00 KST after the cutoff', () => {
    const window = getBusinessDayAnalysisWindow({
      now: new Date('2026-06-03T01:30:00.000Z')
    });

    expect(window.from).toBe('2026-06-02T20:00:00.000Z');
    expect(window.label).toBe('2026-06-03 05:00 KST');
  });

  it('uses the previous business day before 05:00 KST', () => {
    const window = getBusinessDayAnalysisWindow({
      now: new Date('2026-06-02T19:30:00.000Z')
    });

    expect(window.from).toBe('2026-06-01T20:00:00.000Z');
    expect(window.label).toBe('2026-06-02 05:00 KST');
  });

  it('allows an all-data mode for manual backfill checks', () => {
    const window = resolveTrendAnalysisWindow('all', new Date('2026-06-03T01:30:00.000Z'));

    expect(window.from).toBeNull();
    expect(window.mode).toBe('all');
  });

  it('builds a fixed business-date window from 05:00 KST to next day 05:00 KST', () => {
    const window = getBusinessDateAnalysisWindow('2026-06-03');

    expect(window.from).toBe('2026-06-02T20:00:00.000Z');
    expect(window.to).toBe('2026-06-03T20:00:00.000Z');
    expect(window.date).toBe('2026-06-03');
  });
});
