import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { RenewalWeeklyStats } from '../RenewalWeeklyStats';
import type { RenewalWeeklyStat } from '@/types/crm';

function stat(over: Partial<RenewalWeeklyStat> = {}): RenewalWeeklyStat {
  return {
    week_start: '2026-08-17',
    week_label: '26년 08월 03주차',
    selected: 12,
    open: 4,
    completed: 6,
    dropped: 2,
    conversion_rate: 50,
    good_completed: 0,
    bad_completed: 0,
    good_dropped: 0,
    bad_dropped: 0,
    carried_out: 0,
    carried_in: 0,
    ...over,
  };
}

function renderTable(rows: RenewalWeeklyStat[], onSelectWeek = vi.fn()) {
  return {
    onSelectWeek,
    ...render(
      <RenewalWeeklyStats
        rows={rows}
        loading={false}
        error={null}
        selectedWeek={null}
        onSelectWeek={onSelectWeek}
      />
    ),
  };
}

describe('RenewalWeeklyStats — 결과 품질 분포 (REQ-007)', () => {
  it('breaks 결제 완료 and 미전환 down into 좋음/나쁨', () => {
    renderTable([
      stat({ good_completed: 5, bad_completed: 1, good_dropped: 1, bad_dropped: 1 }),
    ]);
    expect(screen.getByText('좋음 5 · 나쁨 1')).toBeTruthy();
    expect(screen.getByText('좋음 1 · 나쁨 1')).toBeTruthy();
  });

  it('appends 미분류 only when some terminal rows are still untagged', () => {
    const tagged = renderTable([
      stat({ completed: 6, good_completed: 5, bad_completed: 1, dropped: 0 }),
    ]);
    expect(within(screen.getByRole('table')).queryByText(/미분류/)).toBeNull();
    tagged.unmount();

    renderTable([stat({ completed: 6, good_completed: 3, bad_completed: 1, dropped: 0 })]);
    expect(screen.getByText('좋음 3 · 나쁨 1 · 미분류 2')).toBeTruthy();
  });

  it('hides the breakdown line entirely when the column is 0 (셀은 - 로 남는다)', () => {
    renderTable([stat({ completed: 0, dropped: 0, open: 12 })]);
    expect(within(screen.getByRole('table')).queryByText(/좋음/)).toBeNull();
  });

  it('never reports a rate from unclassified rows — 분류 전이면 전환율만 남는다', () => {
    // 아무것도 태깅 안 된 주차가 '좋음 0 · 나쁨 0'을 0% 처럼 읽히게 만들지 않는지 확인.
    renderTable([stat({ completed: 6, good_completed: 0, bad_completed: 0, dropped: 0 })]);
    expect(screen.getByText('좋음 0 · 나쁨 0 · 미분류 6')).toBeTruthy();
    expect(within(screen.getByRole('table')).queryByText('0%')).toBeNull();
  });

  it('still scopes the board to the clicked week', () => {
    const { onSelectWeek } = renderTable([stat()]);
    fireEvent.click(screen.getByText('26년 08월 03주차'));
    expect(onSelectWeek).toHaveBeenCalledWith('2026-08-17');
  });

  it('이월 열을 보여주고, 이월로 진행 중이 0이 되면 "진행중" 꼬리표가 사라진다', () => {
    renderTable([
      stat({ selected: 13, open: 0, completed: 7, dropped: 2, carried_out: 4, good_completed: 7 }),
    ]);
    const table = within(screen.getByRole('table'));
    expect(table.getByText('4')).toBeTruthy();
    expect(table.queryByText('진행중')).toBeNull();
  });

  it('이월유입이 있으면 선정을 신규/이월로 분해한다', () => {
    renderTable([stat({ selected: 15, carried_in: 4 })]);
    expect(screen.getByText('신규 11 · 이월 4')).toBeTruthy();
  });

  it('이월유입이 없으면 분해줄을 숨긴다', () => {
    renderTable([stat({ selected: 13, carried_in: 0 })]);
    expect(within(screen.getByRole('table')).queryByText(/신규/)).toBeNull();
  });
});
