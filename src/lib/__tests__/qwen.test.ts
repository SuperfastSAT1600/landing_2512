import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { qwenModel, isQwenConfigured } from '../qwen';

describe('qwenModel', () => {
  const orig = { ...process.env };
  afterEach(() => {
    process.env.QWEN_MODEL_STRONG = orig.QWEN_MODEL_STRONG;
    process.env.QWEN_MODEL_FAST = orig.QWEN_MODEL_FAST;
  });

  it('env 미설정 시 기본 모델', () => {
    delete process.env.QWEN_MODEL_STRONG;
    delete process.env.QWEN_MODEL_FAST;
    expect(qwenModel('strong')).toBe('qwen-max');
    expect(qwenModel('fast')).toBe('qwen-turbo');
  });

  it('env 설정 시 그 값 사용', () => {
    process.env.QWEN_MODEL_STRONG = 'qwen-plus';
    expect(qwenModel('strong')).toBe('qwen-plus');
  });
});

describe('isQwenConfigured', () => {
  const orig = { ...process.env };
  beforeEach(() => {
    delete process.env.QWEN_API_KEY;
    delete process.env.QWEN_ANTHROPIC_BASE_URL;
  });
  afterEach(() => {
    process.env.QWEN_API_KEY = orig.QWEN_API_KEY;
    process.env.QWEN_ANTHROPIC_BASE_URL = orig.QWEN_ANTHROPIC_BASE_URL;
  });

  it('키+Anthropic base URL 둘 다 있어야 true', () => {
    expect(isQwenConfigured()).toBe(false);
    process.env.QWEN_API_KEY = 'sk-x';
    expect(isQwenConfigured()).toBe(false);
    process.env.QWEN_ANTHROPIC_BASE_URL = 'https://x/apps/anthropic';
    expect(isQwenConfigured()).toBe(true);
  });
});
