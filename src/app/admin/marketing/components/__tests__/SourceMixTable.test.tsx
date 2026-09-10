import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SourceMixTable from '../SourceMixTable';
import type { WeeklyGoalRow } from '@/lib/marketing-goals';
import type { MarketingGroup } from '@/lib/marketing-groups';

const ALL = ['네이버 SEO', '구글 SEO', 'META', '소개', 'B2B', '미분류'];

function week(actuals: Record<string, number>, over: Partial<WeeklyGoalRow> = {}): WeeklyGoalRow {
  const a = Object.fromEntries(ALL.map((g) => [g, actuals[g] ?? 0])) as Record<MarketingGroup, number>;
  const total = Object.values(a).reduce((x, y) => x + y, 0);
  return {
    week_start: '2026-08-31',
    week_end: '2026-09-06',
    week_label: '26년 09월 01주차',
    target: null,
    actuals: a,
    actual_total: total,
    achievement_rate: null,
    ...over,
  };
}

function rowOf(source: string) {
  const row = screen.getByText(source).closest('tr');
  if (!row) throw new Error(`row not found: ${source}`);
  return row;
}

// REQ-009: 유입 소스 구성 — 건수와 비중만 (소스별 목표 없음)
describe('SourceMixTable', () => {
  it('건수와 비중 열만 둔다', () => {
    render(<SourceMixTable week={week({ META: 8 })} />);
    expect(screen.getByRole('columnheader', { name: '건수' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: '비중' })).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: '목표' })).toBeNull();
    expect(screen.queryByRole('columnheader', { name: '판정' })).toBeNull();
  });

  it('비중을 총계 기준으로 계산한다', () => {
    render(<SourceMixTable week={week({ META: 8, '구글 SEO': 6, '네이버 SEO': 1, 소개: 1 })} />);
    expect(screen.getByTestId('share-META').textContent).toBe('50.0%');
    expect(screen.getByTestId('share-구글 SEO').textContent).toBe('37.5%');
    expect(screen.getByTestId('share-네이버 SEO').textContent).toBe('6.3%');
  });

  it('총 건수를 헤더에 보여준다', () => {
    render(<SourceMixTable week={week({ META: 8, 소개: 1 })} />);
    expect(screen.getByText(/26년 09월 01주차 · 총 9개/)).toBeTruthy();
  });

  it('실적이 0 인 소스도 행을 남긴다', () => {
    render(<SourceMixTable week={week({ META: 8 })} />);
    expect(rowOf('B2B').textContent).toContain('0개');
    expect(screen.getByTestId('share-B2B').textContent).toBe('0.0%');
  });

  it('인입이 아예 없으면 비중을 — 로 둔다 (0 나눗셈 방지)', () => {
    render(<SourceMixTable week={week({})} />);
    expect(screen.getByTestId('share-META').textContent).toBe('—');
  });

  it('주차 데이터가 없으면 빈 상태로 렌더한다', () => {
    render(<SourceMixTable week={null} />);
    expect(screen.getByText('유입 소스 구성')).toBeTruthy();
    expect(rowOf('META').textContent).toContain('0개');
  });

  it('Business 한국비즈니스 기준임을 밝힌다', () => {
    render(<SourceMixTable week={week({ META: 1 })} />);
    expect(screen.getByText(/한국비즈니스와 동일한 리드 기준/)).toBeTruthy();
  });

  it('미분류도 표시한다', () => {
    render(<SourceMixTable week={week({ 미분류: 2, META: 2 })} />);
    expect(rowOf('미분류').textContent).toContain('2개');
  });
});
