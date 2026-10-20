import { describe, it, expect } from 'vitest';
import type { DayItem } from '@/types/srm-portal';
import { buildTcSessions } from '../coach-prep-test-center';

type Tc = Extract<DayItem, { type: 'test_center' }>;

function tc(over: Partial<Tc>): Tc {
  return { type: 'test_center', lessons: [], totalScore: 0, totalProblems: 0, ...over };
}

const day = (date: string, ...items: DayItem[]) => ({ date, items });

// RW 2모듈(27+27) + Math 2모듈(22+22) 만점 시험
const fullExam = tc({
  curriculumTitle: 'Mock 1',
  lessons: [
    { section: 'rw', score: 27, total: 27 },
    { section: 'rw', score: 27, total: 27 },
    { section: 'math', score: 22, total: 22 },
    { section: 'math', score: 22, total: 22 },
  ],
  totalScore: 98,
  totalProblems: 98,
  expectedModules: { rw: 2, math: 2 },
  skills: [
    { skill: 'Inferences', domain: 'information_and_ideas', correct: 4, total: 4 },
    { skill: 'Boundaries', domain: 'standard_english_conventions', correct: 1, total: 4 },
    { skill: 'Form, Structure, and Sense', domain: 'standard_english_conventions', correct: 3, total: 4 },
    { skill: 'Linear equations', domain: 'algebra', correct: 1, total: 2 },
  ],
});

describe('buildTcSessions', () => {
  it('REQ-001: 두 과목을 모두 푼 회차는 total = rw + math', () => {
    const [s] = buildTcSessions([day('2026-10-01', fullExam)]);
    expect(s.rwScore).toBe(800);
    expect(s.mathScore).toBe(800);
    expect(s.totalScore).toBe(1600);
    expect(s.accuracy).toBe(100);
  });

  it('REQ-001: 한 과목만 푼 회차는 나머지 과목 점수가 null', () => {
    const rwOnly = tc({
      lessons: [{ section: 'rw', score: 20, total: 27 }, { section: 'rw', score: 20, total: 27 }],
      totalScore: 40,
      totalProblems: 54,
      expectedModules: { rw: 2, math: 2 },
    });
    const [s] = buildTcSessions([day('2026-10-02', rwOnly)]);
    expect(s.rwScore).not.toBeNull();
    expect(s.mathScore).toBeNull();
    expect(s.totalScore).toBe(s.rwScore);
  });

  it('REQ-001: 날짜 오름차순으로 정렬하고 문제 수 0인 회차는 제외', () => {
    const empty = tc({ totalProblems: 0 });
    const out = buildTcSessions([day('2026-10-05', fullExam), day('2026-10-01', fullExam, empty)]);
    expect(out.map((s) => s.date)).toEqual(['2026-10-01', '2026-10-05']);
  });

  it('REQ-002: 도메인으로 묶고 정답률 낮은 순으로 정렬, 과목을 붙인다', () => {
    const [s] = buildTcSessions([day('2026-10-01', fullExam)]);
    const names = s.domains.map((d) => d.domain);
    expect(names[0]).toBe('standard_english_conventions'); // 4/8 = 50%
    const sec = s.domains.find((d) => d.domain === 'standard_english_conventions')!;
    expect(sec.section).toBe('rw');
    expect(sec.correct).toBe(4);
    expect(sec.total).toBe(8);
    expect(sec.accuracy).toBe(50);
    expect(s.domains.find((d) => d.domain === 'algebra')!.section).toBe('math');
  });

  it('REQ-002: 스킬은 정답률 낮은 순이고 60% 미만은 weak, 표본 3 미만은 lowSample', () => {
    const [s] = buildTcSessions([day('2026-10-01', fullExam)]);
    const sec = s.domains.find((d) => d.domain === 'standard_english_conventions')!;
    expect(sec.skills.map((k) => k.skill)).toEqual(['Boundaries', 'Form, Structure, and Sense']);
    expect(sec.skills[0]).toMatchObject({ accuracy: 25, weak: true, lowSample: false });
    expect(sec.skills[1]).toMatchObject({ accuracy: 75, weak: false });
    const algebra = s.domains.find((d) => d.domain === 'algebra')!;
    expect(algebra.skills[0]).toMatchObject({ lowSample: true, weak: false });
  });

  it('REQ-002: 표기가 다른 도메인("Problem-Solving and Data Analysis" vs snake_case)은 하나로 합친다', () => {
    const mixed = tc({
      totalScore: 4,
      totalProblems: 8,
      skills: [
        { skill: 'Percentages', domain: 'problem_solving_and_data_analysis', correct: 1, total: 3 },
        { skill: 'Percentages', domain: 'Problem-Solving and Data Analysis', correct: 2, total: 3 },
        { skill: 'Boundaries', domain: 'Standard English Conventions', correct: 1, total: 2 },
      ],
    });
    const [s] = buildTcSessions([day('2026-10-01', mixed)]);
    expect(s.domains.map((d) => d.domain).sort()).toEqual(['problem_solving_and_data_analysis', 'standard_english_conventions']);
    const psda = s.domains.find((d) => d.domain === 'problem_solving_and_data_analysis')!;
    expect(psda.section).toBe('math');
    expect(psda.skills).toHaveLength(1);
    expect(psda.skills[0]).toMatchObject({ correct: 3, total: 6 });
    expect(s.domains.find((d) => d.domain === 'standard_english_conventions')!.section).toBe('rw');
  });

  it('REQ-003: skills가 없는 레거시 회차는 domains가 빈 배열', () => {
    const legacy = tc({ totalScore: 30, totalProblems: 60 });
    const [s] = buildTcSessions([day('2026-09-01', legacy)]);
    expect(s.domains).toEqual([]);
    expect(s.accuracy).toBe(50);
  });

  it('REQ-001: 모듈을 다 풀지 않은 과목도 예상 점수를 보여주고 일부 응시로 표시한다', () => {
    const partial = tc({
      lessons: [{ section: 'rw', score: 19, total: 27 }],
      totalScore: 19,
      totalProblems: 27,
      expectedModules: { rw: 2, math: 2 },
    });
    const [s] = buildTcSessions([day('2026-10-03', partial)]);
    expect(s.rwScore).not.toBeNull();
    expect(s.rwPartial).toBe(true);
    expect(s.mathScore).toBeNull();
    expect(s.mathPartial).toBe(false);
    expect(s.totalScore).toBeNull();
    expect(s.headline).toEqual({ value: s.rwScore, label: 'RW 일부 모듈 응시 · 예상' });
  });

  it('REQ-001: 두 과목 모두 일부만 풀었으면 예상 합계를 일부 응시로 보여준다', () => {
    const both = tc({
      lessons: [{ section: 'rw', score: 20, total: 27 }, { section: 'math', score: 15, total: 22 }],
      totalScore: 35,
      totalProblems: 49,
      expectedModules: { rw: 2, math: 2 },
    });
    const [s] = buildTcSessions([day('2026-10-04', both)]);
    expect(s.headline?.value).toBe(s.rwScore! + s.mathScore!);
    expect(s.headline?.label).toBe('일부 모듈 응시 · 예상');
    expect(s.totalScore).toBeNull();
  });

  it('REQ-001: 완결 회차는 라벨 없는 정식 합계가 headline', () => {
    const [s] = buildTcSessions([day('2026-10-01', fullExam)]);
    expect(s.headline).toEqual({ value: 1600, label: null });
    expect(s.rwPartial || s.mathPartial).toBe(false);
  });

  it('REQ-001: 한 과목만 끝까지 푼 회차는 그 과목만 응시로 표시한다', () => {
    const rwOnly = tc({
      lessons: [{ section: 'rw', score: 20, total: 27 }, { section: 'rw', score: 20, total: 27 }],
      totalScore: 40, totalProblems: 54, expectedModules: { rw: 2, math: 2 },
    });
    const [s] = buildTcSessions([day('2026-10-02', rwOnly)]);
    expect(s.headline).toEqual({ value: s.rwScore, label: 'RW만 응시 · 예상' });
  });
});
