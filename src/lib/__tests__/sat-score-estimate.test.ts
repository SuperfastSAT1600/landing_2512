import { describe, it, expect } from 'vitest';
import { scaleSectionScore, tcSectionScore } from '../sat-score-estimate';
import type { TestCenterDay } from '@/types/srm-portal';

// REQ-001 (crm-srm-data-parity): SRM Growth Report와 같은 환산표
describe('scaleSectionScore — SRM 앵커 환산표', () => {
  it.each([
    [50, 54, 'rw', 750],
    [41, 44, 'math', 760],
    [45, 54, 'rw', 700],
    [42, 44, 'math', 780],
    [38, 54, 'rw', 630],
    [34, 44, 'math', 680],
    [0, 54, 'rw', 200],
    [54, 54, 'rw', 800],
  ] as const)('%i/%i %s → %i', (c, t, s, want) => {
    expect(scaleSectionScore(c, t, s)).toBe(want);
  });

  it('짧은 시험은 정답률로 만점 문항 수에 투영한다', () => {
    // 22문항 중 22 = 100% → 800
    expect(scaleSectionScore(22, 22, 'math')).toBe(800);
  });
});

function tc(lessons: TestCenterDay['lessons'], expectedModules?: TestCenterDay['expectedModules']): TestCenterDay {
  const totalScore = lessons.reduce((s, l) => s + l.score, 0);
  const totalProblems = lessons.reduce((s, l) => s + l.total, 0);
  return { type: 'test_center', lessons, totalScore, totalProblems, expectedModules };
}

describe('tcSectionScore — 레슨 섹션 기준', () => {
  it('Aiden 10/11: RW 26+24 / Math 21+20 → 750 + 760 = 1510', () => {
    const r = tcSectionScore(tc([
      { section: 'rw', score: 26, total: 27 }, { section: 'rw', score: 24, total: 27 },
      { section: 'math', score: 21, total: 22 }, { section: 'math', score: 20, total: 22 },
    ], { rw: 2, math: 2 }));
    expect([r.rwScaled, r.mathScaled, r.total]).toEqual([750, 760, 1510]);
  });

  it('섹션 모듈이 다 있지 않으면 그 섹션 점수는 비운다', () => {
    const r = tcSectionScore(tc([
      { section: 'rw', score: 26, total: 27 },
      { section: 'math', score: 21, total: 22 }, { section: 'math', score: 20, total: 22 },
    ], { rw: 2, math: 2 }));
    expect(r.rwScaled).toBeNull();
    expect(r.mathScaled).toBe(760);
    expect(r.total).toBe(760);
  });

  it('section 정보가 없는 예전 데이터는 모듈 크기로 나눈다', () => {
    const r = tcSectionScore(tc([{ score: 26, total: 27 }, { score: 24, total: 27 }]));
    expect(r.rwRaw).toBe(50);
    expect(r.rwScaled).toBe(750);
    expect(r.mathScaled).toBeNull();
  });
});
