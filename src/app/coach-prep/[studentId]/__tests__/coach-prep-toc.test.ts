import { describe, it, expect } from 'vitest';
import { buildTocItems } from '../coach-prep-toc';

const ALL = { unlocked: true, hasProfile: true, hasSkills: true, hasDiagnostic: true, hasRequest: true };
const ids = (flags: Parameters<typeof buildTocItems>[0]) => buildTocItems(flags).map((i) => i.id);

describe('buildTocItems', () => {
  // REQ-001
  it('모든 자료가 있으면 페이지 순서대로 전부 나온다', () => {
    expect(ids(ALL)).toEqual([
      'confirm', 'test-center', 'ai-brief', 'skills', 'diagnostic', 'scores', 'schedule', 'history', 'coach-response',
    ]);
  });

  it('조건에 맞지 않는 섹션은 목차에서 빠진다', () => {
    expect(ids({ ...ALL, hasProfile: false, hasSkills: false, hasDiagnostic: false, hasRequest: false })).toEqual([
      'confirm', 'test-center', 'scores', 'schedule', 'history',
    ]);
  });

  it('필수 확인 전에는 확인 항목만 열려 있고 나머지는 잠겨 있다', () => {
    const items = buildTocItems({ ...ALL, unlocked: false });
    expect(items.find((i) => i.id === 'confirm')?.locked).toBe(false);
    expect(items.filter((i) => i.id !== 'confirm').every((i) => i.locked)).toBe(true);
  });

  it('확인을 마치면 아무것도 잠겨 있지 않다', () => {
    expect(buildTocItems(ALL).some((i) => i.locked)).toBe(false);
  });
});
