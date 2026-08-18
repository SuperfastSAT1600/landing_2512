import { describe, it, expect } from 'vitest';
import { fillMonthlyGaps } from '@/lib/crm-stats-core';

type Row = { month: string; value: number };
const make = (month: string): Row => ({ month, value: 0 });

describe('fillMonthlyGaps', () => {
  it('내부 누락 월을 0값으로 채운다 (25-12, 26-01, 26-03 → 26-02 추가)', () => {
    const rows: Row[] = [
      { month: '2025-12', value: 5 },
      { month: '2026-01', value: 3 },
      { month: '2026-03', value: 7 },
    ];
    const out = fillMonthlyGaps(rows, make);
    expect(out.map((r) => r.month)).toEqual(['2025-12', '2026-01', '2026-02', '2026-03']);
    expect(out.find((r) => r.month === '2026-02')).toEqual({ month: '2026-02', value: 0 });
    // 기존 값은 보존
    expect(out.find((r) => r.month === '2026-03')?.value).toBe(7);
  });

  it('연말 경계를 넘어 채운다 (2025-11 → 2026-02)', () => {
    const out = fillMonthlyGaps([{ month: '2025-11', value: 1 }, { month: '2026-02', value: 2 }], make);
    expect(out.map((r) => r.month)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });

  it('리딩/트레일링 빈 달은 만들지 않고 정렬만 보장', () => {
    const out = fillMonthlyGaps([{ month: '2026-03', value: 1 }, { month: '2026-01', value: 2 }], make);
    expect(out.map((r) => r.month)).toEqual(['2026-01', '2026-02', '2026-03']);
  });

  it('빈 배열/단일 원소는 그대로', () => {
    expect(fillMonthlyGaps([], make)).toEqual([]);
    expect(fillMonthlyGaps([{ month: '2026-05', value: 9 }], make)).toEqual([{ month: '2026-05', value: 9 }]);
  });
});
