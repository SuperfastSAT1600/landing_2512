import { describe, it, expect } from 'vitest';
import { sumRenewalWeeks, renewalCoverageLabel } from '@/lib/renewal-summary';

const w = (week_start: string, selected: number, completed: number) => ({
  week_start,
  selected,
  completed,
});

describe('sumRenewalWeeks', () => {
  it('선정·완료를 합산하고 커버한 주차 수를 센다', () => {
    const r = sumRenewalWeeks([w('2026-08-17', 20, 5), w('2026-08-24', 30, 7), w('2026-09-14', 26, 5)]);
    expect(r).toEqual({
      selected: 76,
      completed: 17,
      weeks: 3,
      firstWeek: '2026-08-17',
      lastWeek: '2026-09-14',
    });
  });

  it('입력 순서와 무관하게 첫 주차·마지막 주차를 잡는다', () => {
    const r = sumRenewalWeeks([w('2026-09-14', 1, 0), w('2026-08-17', 1, 1), w('2026-08-24', 1, 0)]);
    expect(r?.firstWeek).toBe('2026-08-17');
    expect(r?.lastWeek).toBe('2026-09-14');
  });

  it('주차가 하나면 첫 주차와 마지막 주차가 같다', () => {
    const r = sumRenewalWeeks([w('2026-08-17', 10, 3)]);
    expect(r).toEqual({ selected: 10, completed: 3, weeks: 1, firstWeek: '2026-08-17', lastWeek: '2026-08-17' });
  });

  it('빈 배열이면 null — 카드가 "-" 를 표시할 수 있게 한다', () => {
    expect(sumRenewalWeeks([])).toBeNull();
  });

  it('선정 인원 합이 0이면 null — 0으로 나누지 않는다', () => {
    expect(sumRenewalWeeks([w('2026-08-17', 0, 0), w('2026-08-24', 0, 0)])).toBeNull();
  });
});

describe('renewalCoverageLabel', () => {
  it('여러 주차면 "N주 · 시작~끝" 으로 실제 커버 범위를 밝힌다', () => {
    const t = sumRenewalWeeks([
      { week_start: '2026-08-17', selected: 20, completed: 5 },
      { week_start: '2026-09-14', selected: 26, completed: 5 },
    ])!;
    // 1년으로 조회해도 데이터가 2주치뿐이면 그 사실이 보여야 한다.
    expect(renewalCoverageLabel(t)).toBe('2주 · 08.17~09.14');
  });

  it('한 주차면 그 주차만 표기한다', () => {
    const t = sumRenewalWeeks([{ week_start: '2026-08-17', selected: 20, completed: 5 }])!;
    expect(renewalCoverageLabel(t)).toBe('08.17 주');
  });
});
