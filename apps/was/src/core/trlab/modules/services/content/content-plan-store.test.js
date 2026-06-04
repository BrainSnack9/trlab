import { describe, expect, it } from 'vitest';
import { PLAN_VERSION, planIdFor } from './content-plan-store.js';

describe('content plan store cache version', () => {
  it('uses a cache version that invalidates pre-verified-visual-data plans', () => {
    expect(PLAN_VERSION).toBe('v8');
    expect(planIdFor({ id: 'candidate-fmkorea-kospi-chip' })).toMatch(/^plan-v8-/);
  });
});
