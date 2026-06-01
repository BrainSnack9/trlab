import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CARD_IMAGE_SIZE, imageSizeFromEnv, openAIModels } from './image-provider-clients.js';

const originalEnv = {
  IMAGE_SIZE: process.env.IMAGE_SIZE,
  OPENAI_IMAGE_SIZE: process.env.OPENAI_IMAGE_SIZE,
  OPENAI_IMAGE_MODEL: process.env.OPENAI_IMAGE_MODEL
};

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe('image provider client configuration', () => {
  it('defaults remote image generation to a portrait card-friendly size', () => {
    delete process.env.IMAGE_SIZE;
    delete process.env.OPENAI_IMAGE_SIZE;

    expect(DEFAULT_CARD_IMAGE_SIZE).toBe('1024x1536');
    expect(imageSizeFromEnv('IMAGE_SIZE')).toBe('1024x1536');
    expect(imageSizeFromEnv('OPENAI_IMAGE_SIZE')).toBe('1024x1536');
  });

  it('allows provider size overrides through env vars', () => {
    process.env.OPENAI_IMAGE_SIZE = 'auto';

    expect(imageSizeFromEnv('OPENAI_IMAGE_SIZE')).toBe('auto');
  });

  it('uses the configured OpenAI image model first, then official GPT Image fallbacks', () => {
    process.env.OPENAI_IMAGE_MODEL = 'custom-image-model';

    expect(openAIModels()).toEqual(['custom-image-model', 'gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini']);
  });
});
