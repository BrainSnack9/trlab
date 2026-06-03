import { describe, expect, it } from 'vitest';
import { scanSourceText } from '../scripts/check-source-encoding.js';

describe('source text encoding', () => {
  it('does not contain accidental mojibake in source files', () => {
    expect(scanSourceText()).toEqual([]);
  });
});

