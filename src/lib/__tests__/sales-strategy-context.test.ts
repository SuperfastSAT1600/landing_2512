import { describe, it, expect } from 'vitest';
import {
  outcomeOf,
  buildPastCasesBlock,
  type StrategyStudent,
  type PastCase,
} from '../sales-strategy-context';

function makeStudent(overrides: Partial<StrategyStudent> = {}): StrategyStudent {
  return {
    id: 'stu-1',
    name: '홍길동',
    grade: '11학년',
    school_type: '국제학교',
    desired_subjects: 'RW+Math',
    previous_rw_score: 600,
    previous_math_score: 700,
    target_score: 1500,
    churn_type: null,
    churn_tag: null,
    inquiry_channel: '카톡',
    traffic_source: '인스타그램',
    lead_status: 'active',
    funnel_stage: '4',
    consultation_timeline: [],
    reactivation_log: [],
    ...overrides,
  };
}

describe('outcomeOf', () => {
  it('enrolled lead_status → converted', () => {
    expect(outcomeOf(makeStudent({ lead_status: 'enrolled', funnel_stage: '8' }))).toBe('converted');
  });

  it('funnel_stage 8 → converted even if lead_status differs', () => {
    expect(outcomeOf(makeStudent({ lead_status: 'active', funnel_stage: '8' }))).toBe('converted');
  });

  it('churned funnel_stage → churned', () => {
    expect(outcomeOf(makeStudent({ lead_status: 'inactive', funnel_stage: 'churned' }))).toBe('churned');
  });

  it('inactive lead_status → churned', () => {
    expect(outcomeOf(makeStudent({ lead_status: 'inactive', funnel_stage: '4' }))).toBe('churned');
  });

  it('active mid-funnel → in_progress', () => {
    expect(outcomeOf(makeStudent({ lead_status: 'active', funnel_stage: '4' }))).toBe('in_progress');
  });
});

describe('buildPastCasesBlock', () => {
  const converted: PastCase = {
    student: makeStudent({
      id: 'p1',
      name: '김전환',
      lead_status: 'enrolled',
      funnel_stage: '8',
      consultation_timeline: [
        { created_at: '2026-01-02T00:00:00.000Z', raw_memo: '무료 체험 제안 후 결제' },
      ],
    }),
    similarity: 0.91,
  };
  const churned: PastCase = {
    student: makeStudent({
      id: 'p2',
      name: '이이탈',
      lead_status: 'inactive',
      funnel_stage: 'churned',
      churn_type: 'closed',
      churn_tag: '경쟁사 선택',
    }),
    similarity: 0.78,
  };

  it('labels converted and churned cases distinctly', () => {
    const block = buildPastCasesBlock([converted, churned]);
    expect(block).toContain('전환');
    expect(block).toContain('이탈');
    expect(block).toContain('김전환');
    expect(block).toContain('이이탈');
  });

  it('includes similarity and case memo content', () => {
    const block = buildPastCasesBlock([converted]);
    expect(block).toContain('무료 체험 제안 후 결제');
    expect(block).toMatch(/9[01]%|0\.9/); // similarity surfaced in some form
  });

  it('returns a clear empty marker when no cases', () => {
    const block = buildPastCasesBlock([]);
    expect(block).toMatch(/없|N\/A|찾지/);
  });
});
