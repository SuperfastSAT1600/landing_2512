import { describe, it, expect } from 'vitest';
import { groupByWeek, groupByMonth } from '../groupByPeriod';
import type { MarketingDailyRow } from '@/types/marketing';

function row(date: string, group: MarketingDailyRow['group'], leads: number): MarketingDailyRow {
  return { date, group, leads };
}

describe('groupByWeek', () => {
  it('빈 배열 → 빈 배열', () => {
    expect(groupByWeek([])).toEqual([]);
  });

  it('단일 채널 단일 날짜 → 올바른 week key (월요일 기준)', () => {
    // 2026-08-18 is a Tuesday → weekStart = 2026-08-17 (Monday? No: Mon=2026-08-17)
    // Actually 2026-08-18 is Tuesday, so Monday = 2026-08-17? Let's use a known Monday.
    // 2026-08-17 is Monday (week starts 08-17, ends 08-23)
    const result = groupByWeek([row('2026-08-17', '네이버 SEO', 5)]);
    expect(result).toHaveLength(1);
    expect(result[0].weekStart).toBe('2026-08-17');
    expect(result[0].weekEnd).toBe('2026-08-23');
    expect(result[0].channels['네이버 SEO']).toBe(5);
    expect(result[0].total).toBe(5);
  });

  it('동일 주 여러 날짜 합산', () => {
    // 2026-08-17(Mon) ~ 2026-08-23(Sun) 같은 주
    const rows = [
      row('2026-08-17', '네이버 SEO', 3),
      row('2026-08-19', '네이버 SEO', 2),
      row('2026-08-21', 'META', 4),
    ];
    const result = groupByWeek(rows);
    expect(result).toHaveLength(1);
    expect(result[0].channels['네이버 SEO']).toBe(5);
    expect(result[0].channels['META']).toBe(4);
    expect(result[0].total).toBe(9);
  });

  it('다른 주는 별개 행으로 분리', () => {
    const rows = [
      row('2026-08-17', 'META', 2),
      row('2026-08-24', 'META', 3),
    ];
    const result = groupByWeek(rows);
    expect(result).toHaveLength(2);
  });

  it('mix 비율 계산 (소수점 반올림)', () => {
    const rows = [
      row('2026-08-17', '네이버 SEO', 1),
      row('2026-08-17', 'META', 2),
    ];
    const result = groupByWeek(rows);
    expect(result[0].total).toBe(3);
    expect(result[0].mix['네이버 SEO']).toBe(33); // round(1/3*100)=33
    expect(result[0].mix['META']).toBe(67);        // round(2/3*100)=67
  });

  it('결과 weekStart 오름차순 정렬', () => {
    const rows = [
      row('2026-08-24', 'META', 1),
      row('2026-08-10', 'META', 1),
      row('2026-08-17', 'META', 1),
    ];
    const result = groupByWeek(rows);
    expect(result[0].weekStart <= result[1].weekStart).toBe(true);
    expect(result[1].weekStart <= result[2].weekStart).toBe(true);
  });

  it('주 레이블 형식 확인 — "26년 08월 03주차 (8/17~8/23)"', () => {
    // 2026-08-17(Mon) = 8월의 3번째 월요일 주
    const result = groupByWeek([row('2026-08-17', 'META', 1)]);
    const label = result[0].label;
    // monthWeekLabel 형식: "26년 08월 03주차 (8/17~8/23)"
    expect(label).toMatch(/^\d{2}년 \d{2}월 \d{2}주차 \(8\/17~8\/23\)$/);
  });

  it('미분류 포함 모든 채널 키 존재 (값 0 포함)', () => {
    const result = groupByWeek([row('2026-08-17', '네이버 SEO', 1)]);
    const ch = result[0].channels;
    expect('미분류' in ch).toBe(true);
    expect(ch['미분류']).toBe(0);
    expect(ch['B2B']).toBe(0);
  });
});

describe('groupByMonth', () => {
  it('빈 배열 → 빈 배열', () => {
    expect(groupByMonth([])).toEqual([]);
  });

  it('단일 채널 단일 날짜 → 올바른 month key', () => {
    const result = groupByMonth([row('2026-08-15', '구글 SEO', 7)]);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('2026-08');
    expect(result[0].label).toBe('2026년 8월');
    expect(result[0].channels['구글 SEO']).toBe(7);
    expect(result[0].total).toBe(7);
  });

  it('동일 월 여러 날짜 합산', () => {
    const rows = [
      row('2026-08-01', '소개', 2),
      row('2026-08-15', '소개', 3),
      row('2026-08-31', 'B2B', 5),
    ];
    const result = groupByMonth(rows);
    expect(result).toHaveLength(1);
    expect(result[0].channels['소개']).toBe(5);
    expect(result[0].channels['B2B']).toBe(5);
    expect(result[0].total).toBe(10);
  });

  it('결과 key 오름차순 정렬', () => {
    const rows = [
      row('2026-10-01', 'META', 1),
      row('2026-08-01', 'META', 1),
      row('2026-09-01', 'META', 1),
    ];
    const result = groupByMonth(rows);
    expect(result.map((r) => r.key)).toEqual(['2026-08', '2026-09', '2026-10']);
  });

  it('mix 비율 계산 (소수점 반올림)', () => {
    const rows = [
      row('2026-08-01', 'META', 1),
      row('2026-08-01', 'B2B', 2),
    ];
    const result = groupByMonth(rows);
    expect(result[0].mix['META']).toBe(33);
    expect(result[0].mix['B2B']).toBe(67);
  });

  it('total이 0이면 mix 모두 0', () => {
    // total=0은 데이터 없을 때만 발생 — 직접 테스트 위해 빈 배열
    const result = groupByMonth([]);
    expect(result).toHaveLength(0);
    // zero-total guard via single row with 0 leads
    const r2 = groupByMonth([row('2026-08-01', 'META', 0)]);
    expect(r2[0].total).toBe(0);
    expect(r2[0].mix['META']).toBe(0);
  });
});
