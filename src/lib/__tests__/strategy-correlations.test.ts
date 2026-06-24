import { describe, it, expect } from 'vitest';
import {
  projectRow,
  computeCorrelations,
  rankCorrelations,
  serializeCorrelations,
  type CorrelationStudent,
  type CorrelationRow,
} from '../strategy-correlations';

const T0 = '2026-06-01T00:00:00.000Z';
const addH = (iso: string, h: number) => new Date(new Date(iso).getTime() + h * 3_600_000).toISOString();

function student(p: Partial<CorrelationStudent>): CorrelationStudent {
  return {
    id: Math.random().toString(36).slice(2),
    isPaid: false,
    lead_status: 'active',
    funnel_stage: '4',
    ...p,
  };
}

/** 동일 파생 행 n개를 만드는 헬퍼. */
function rows(spec: { n: number; row: Partial<CorrelationRow> }[]): CorrelationRow[] {
  const base: CorrelationRow = {
    isPaid: false,
    isChurned: false,
    reachedStage4: true,
    memoCount: 0,
    firstResponseHours: null,
    tier: null,
    vocabWeak: null,
    backtracked: false,
  };
  return spec.flatMap(({ n, row }) => Array.from({ length: n }, () => ({ ...base, ...row })));
}

describe('projectRow', () => {
  it('이탈 판정: funnel_stage=churned 또는 lead_status=inactive', () => {
    expect(projectRow(student({ funnel_stage: 'churned' })).isChurned).toBe(true);
    expect(projectRow(student({ lead_status: 'inactive', funnel_stage: '3a' })).isChurned).toBe(true);
    expect(projectRow(student({ lead_status: 'active', funnel_stage: '3a' })).isChurned).toBe(false);
  });

  it('첫 응답 시간(h)을 inquiry_date→first_message_sent_at 차이로 계산', () => {
    const r = projectRow(student({ inquiry_date: T0, first_message_sent_at: addH(T0, 50) }));
    expect(r.firstResponseHours).toBeCloseTo(50, 5);
  });

  it('first_message 누락이나 음수 차이는 null', () => {
    expect(projectRow(student({ inquiry_date: T0 })).firstResponseHours).toBeNull();
    expect(projectRow(student({ inquiry_date: addH(T0, 5), first_message_sent_at: T0 })).firstResponseHours).toBeNull();
  });

  it('단계 역행 감지: 더 낮은 단계로 되돌아간 이력', () => {
    const back = student({
      stage_history: [
        { stage: '2', entered_at: T0 },
        { stage: '4', entered_at: addH(T0, 24) },
        { stage: '2', entered_at: addH(T0, 48) },
      ],
    });
    expect(projectRow(back).backtracked).toBe(true);
    const mono = student({
      stage_history: [
        { stage: '2', entered_at: T0 },
        { stage: '4', entered_at: addH(T0, 24) },
      ],
    });
    expect(projectRow(mono).backtracked).toBe(false);
  });

  it('vocabWeak: medium/high=true, none/low=false, 미상=null', () => {
    expect(projectRow(student({ vocab_weakness_level: 'high' })).vocabWeak).toBe(true);
    expect(projectRow(student({ vocab_weakness_level: 'low' })).vocabWeak).toBe(false);
    expect(projectRow(student({})).vocabWeak).toBeNull();
  });
});

describe('computeCorrelations — 게이트', () => {
  it('뚜렷한 상관(메모 4회+ 전환 높음)은 검출된다', () => {
    const data = rows([
      { n: 20, row: { reachedStage4: true, memoCount: 5, isPaid: true } }, // 4회+ 전환 100%
      { n: 20, row: { reachedStage4: true, memoCount: 1, isPaid: false } }, // 3회- 전환 0%
    ]);
    const c = computeCorrelations(data).find((x) => x.key === 'memo_touch_x_conversion');
    expect(c).toBeDefined();
    expect(c!.rateA).toBeCloseTo(1, 5);
    expect(c!.rateB).toBeCloseTo(0, 5);
  });

  it('격차가 약하면(둘 다 비슷) 드롭된다', () => {
    const data = rows([
      { n: 20, row: { reachedStage4: true, memoCount: 5, isPaid: true } }, // 100%
      { n: 20, row: { reachedStage4: true, memoCount: 1, isPaid: true } }, // 100% → 격차 0
    ]);
    expect(computeCorrelations(data).find((x) => x.key === 'memo_touch_x_conversion')).toBeUndefined();
  });

  it('표본이 MIN_N 미만이면 게이트로 드롭', () => {
    const data = rows([
      { n: 3, row: { reachedStage4: true, memoCount: 5, isPaid: true } }, // nA=3 <5
      { n: 20, row: { reachedStage4: true, memoCount: 1, isPaid: false } },
    ]);
    expect(computeCorrelations(data).find((x) => x.key === 'memo_touch_x_conversion')).toBeUndefined();
  });
});

describe('rankCorrelations — surprise 수축', () => {
  it('고표본·중격차가 저표본·고격차를 이긴다(adequacy 수축으로 역전)', () => {
    // 티어: A n=6(전환 66.7%) vs C n=6(0%) → 격차 0.667, adequacy 6/14≈0.429 → surprise≈0.286
    // 첫응답: 48h+ n=80(10%) vs 이내 n=80(45%) → 격차 0.35, adequacy 80/88≈0.909 → surprise≈0.318
    // 격차는 티어가 더 크지만, 수축 후 첫응답(고표본)이 더 높아야 한다.
    const data = rows([
      { n: 4, row: { tier: 'A', isPaid: true } },
      { n: 2, row: { tier: 'A', isPaid: false } },
      { n: 6, row: { tier: 'C', isPaid: false } },
      { n: 8, row: { firstResponseHours: 72, isPaid: true } },
      { n: 72, row: { firstResponseHours: 72, isPaid: false } },
      { n: 36, row: { firstResponseHours: 10, isPaid: true } },
      { n: 44, row: { firstResponseHours: 10, isPaid: false } },
    ]);
    const ranked = rankCorrelations(computeCorrelations(data), 3);
    const tier = ranked.find((c) => c.key === 'tier_x_conversion')!;
    const resp = ranked.find((c) => c.key === 'first_response_x_conversion')!;
    expect(tier).toBeDefined();
    expect(resp).toBeDefined();
    expect(resp.surprise).toBeGreaterThan(tier.surprise); // 수축으로 고표본이 역전
    expect(ranked[0].key).toBe('first_response_x_conversion');
  });
});

describe('serializeCorrelations', () => {
  it('빈 입력이면 빈 문자열', () => {
    expect(serializeCorrelations([])).toBe('');
  });
  it('헤더 + 세그먼트 비교 라인을 만든다', () => {
    const data = rows([
      { n: 20, row: { reachedStage4: true, memoCount: 5, isPaid: true } },
      { n: 20, row: { reachedStage4: true, memoCount: 1, isPaid: false } },
    ]);
    const block = serializeCorrelations(rankCorrelations(computeCorrelations(data)));
    expect(block).toContain('교차 신호 후보');
    expect(block).toContain('인과 아님');
    expect(block).toMatch(/n=\d+/);
  });
});
