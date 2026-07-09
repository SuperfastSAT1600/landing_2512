import { describe, it, expect } from 'vitest';
import {
  getSatPastMonths,
  getSatTestDates,
  formatSatDate,
  formatSatMonth,
} from '../constants';

// 고정 기준일: 2026-07-09 (2026년 6월 시험은 과거, 8월 시험은 미래)
const NOW = new Date(2026, 6, 9); // month는 0-indexed → 6 = 7월

describe('getSatPastMonths', () => {
  it('현재 날짜 기준 과거 시행 월만, 최신순으로 반환', () => {
    const months = getSatPastMonths(NOW);
    // 최신이 2026-06 (2026년 6월) 이어야 함
    expect(months[0]).toEqual({ value: '2026-06', label: '2026년 6월' });
    expect(months[1]).toEqual({ value: '2026-05', label: '2026년 5월' });
  });

  it('미래 시행 월은 포함하지 않음', () => {
    const values = getSatPastMonths(NOW).map(m => m.value);
    expect(values).not.toContain('2026-08');
    expect(values).not.toContain('2026-10');
  });

  it('시행 월 패턴(3·5·6·8·10·11·12)만 사용', () => {
    const months = getSatPastMonths(NOW).map(m => Number(m.value.split('-')[1]));
    const allowed = new Set([3, 5, 6, 8, 10, 11, 12]);
    expect(months.every(m => allowed.has(m))).toBe(true);
  });

  it('2023년까지 거슬러 올라감', () => {
    const values = getSatPastMonths(NOW).map(m => m.value);
    expect(values).toContain('2023-03');
    expect(values).not.toContain('2022-12');
  });

  it('값 형식은 YYYY-MM 유지', () => {
    for (const m of getSatPastMonths(NOW)) {
      expect(m.value).toMatch(/^\d{4}-\d{2}$/);
    }
  });
});

describe('getSatTestDates', () => {
  it('오늘 이후(오늘 포함) 시험일만 반환', () => {
    const groups = getSatTestDates(NOW);
    const values = groups.flatMap(g => g.dates.map(d => d.value));
    expect(values).not.toContain('2026-06-06'); // 지난 시험
    expect(values).toContain('2026-08-22');
  });

  it('빈 그룹은 제거', () => {
    const groups = getSatTestDates(NOW);
    // 2025–26 시즌은 2026-06-06 하나뿐 → 필터 후 사라져야 함
    expect(groups.find(g => g.group === '2025–26 시즌')).toBeUndefined();
    expect(groups.every(g => g.dates.length > 0)).toBe(true);
  });

  it('오늘 날짜와 같은 시험일은 포함', () => {
    const sameDay = new Date(2026, 7, 22); // 2026-08-22
    const values = getSatTestDates(sameDay).flatMap(g => g.dates.map(d => d.value));
    expect(values).toContain('2026-08-22');
  });
});

describe('formatSatDate', () => {
  it('과거 목표일도 정확히 포맷 (저장된 값 표시 보존)', () => {
    expect(formatSatDate('2026-06-06')).toBe('2026년 6월 6일 (토)');
  });

  it('null이면 미정', () => {
    expect(formatSatDate(null)).toBe('미정');
  });
});

describe('formatSatMonth', () => {
  it('YYYY-MM을 한국어 라벨로', () => {
    expect(formatSatMonth('2026-06')).toBe('2026년 6월');
    expect(formatSatMonth('2024-03')).toBe('2024년 3월');
  });

  it('빈 값이면 미상', () => {
    expect(formatSatMonth('')).toBe('(미상)');
    expect(formatSatMonth(null)).toBe('(미상)');
  });
});
