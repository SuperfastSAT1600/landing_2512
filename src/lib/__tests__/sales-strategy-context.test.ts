import { describe, it, expect } from 'vitest';
import {
  outcomeOf,
  buildCurrentStudentBlock,
  buildPastCasesBlock,
  SALES_STRATEGY_SYSTEM_PROMPT,
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

describe('buildCurrentStudentBlock', () => {
  it('includes name, grade, scores, and target', () => {
    const block = buildCurrentStudentBlock(makeStudent());
    expect(block).toContain('홍길동');
    expect(block).toContain('11학년');
    expect(block).toContain('RW 600');
    expect(block).toContain('Math 700');
    expect(block).toContain('1500');
  });

  it('renders churn info when present', () => {
    const block = buildCurrentStudentBlock(
      makeStudent({ churn_type: 'closed', churn_tag: '가격 부담' }),
    );
    expect(block).toContain('가격 부담');
  });

  it('renders consultation memos (prefers raw_memo for internal strategy)', () => {
    const block = buildCurrentStudentBlock(
      makeStudent({
        consultation_timeline: [
          { created_at: '2026-05-01T00:00:00.000Z', raw_memo: '어머니가 가격에 민감함' },
        ],
      }),
    );
    expect(block).toContain('어머니가 가격에 민감함');
    expect(block).toContain('2026-05-01');
  });

  it('handles a student with no scores and no memos without throwing', () => {
    const block = buildCurrentStudentBlock(
      makeStudent({ previous_rw_score: null, previous_math_score: null, target_score: null }),
    );
    expect(typeof block).toBe('string');
    expect(block).toContain('홍길동');
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

describe('SALES_STRATEGY_SYSTEM_PROMPT', () => {
  it('frames the agent as a SAT sales strategist focused on conversion', () => {
    expect(SALES_STRATEGY_SYSTEM_PROMPT).toMatch(/세일즈|전략/);
    expect(SALES_STRATEGY_SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });
});
