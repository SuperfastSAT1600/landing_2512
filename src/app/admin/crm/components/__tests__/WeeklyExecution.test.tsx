import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WeeklyExecution } from '../weekly/WeeklyExecution';
import type { WeeklyExecutionRow, WeeklyFocusStrategy } from '@/types/crm';

function row(over: Partial<WeeklyExecutionRow> = {}): WeeklyExecutionRow {
  return {
    strategy_id: 's-report',
    strategy_name: '진단리포트 당일등록 할인',
    type: 'initial_sales',
    planned: true,
    applied_count: 2,
    contacted_count: 2,
    paid_count: 1,
    revenue: 4_100_000,
    leads: [
      { student_id: 'st-1', name: '김OO', applied_at: '2026-08-18T10:00:00', memo: '당일 제안', contacted: true, paid: true, revenue: 4_100_000 },
      { student_id: 'st-2', name: '박OO', applied_at: '2026-08-19T10:00:00', memo: '', contacted: true, paid: false, revenue: 0 },
    ],
    ...over,
  };
}

const focus: WeeklyFocusStrategy[] = [
  {
    id: 'f-1',
    strategy_id: 's-report',
    strategy_name: '진단리포트 당일등록 할인',
    type: 'initial_sales',
    goal: '결제 3건',
    memo: '',
    carried_from_week: null,
  },
];

function setup(execution: WeeklyExecutionRow[], onSelectStudent = vi.fn()) {
  const onLogged = vi.fn();
  render(
    <WeeklyExecution
      segment="b2c"
      adminKey="admin-key"
      execution={execution}
      focus={focus}
      logAt="2026-08-20T10:00:00.000Z"
      onLogged={onLogged}
      onSelectStudent={onSelectStudent}
    />,
  );
  return { onLogged, onSelectStudent };
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) })));
});

describe('WeeklyExecution', () => {
  it('전략별 적용·컨택·결제·매출과 리드 이름을 보여준다', () => {
    setup([row()]);
    expect(screen.getByText('진단리포트 당일등록 할인')).toBeTruthy();
    expect(screen.getByText('목표 결제 3건')).toBeTruthy();
    expect(screen.getByText(/적용 2 · 컨택 2 · 결제 1 · 매출 410만원/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /김OO/ })).toBeTruthy();
    expect(screen.getByText('이번 주 실행·결과')).toBeTruthy();
  });

  it('계획이 있는 주에 계획에 없던 전략은 계획 외 배지를 붙인다', () => {
    setup([row({ strategy_id: 's-coach', strategy_name: '대표 코치 수강권', planned: false })]);
    expect(screen.getByText('계획 외')).toBeTruthy();
  });

  it('계획이 아예 없는 주에는 계획 외 배지를 붙이지 않는다', () => {
    const onLogged = vi.fn();
    render(
      <WeeklyExecution
        segment="b2c"
        adminKey="admin-key"
        execution={[row({ planned: false })]}
        focus={[]}
        logAt="2026-08-20T10:00:00.000Z"
        onLogged={onLogged}
      />,
    );
    expect(screen.queryByText('계획 외')).toBeNull();
  });

  it('계획됐지만 적용 0건이면 적용 없음을 알린다', () => {
    setup([row({ applied_count: 0, contacted_count: 0, paid_count: 0, revenue: 0, leads: [] })]);
    expect(screen.getByText('이번 주 적용 기록이 없습니다.')).toBeTruthy();
  });

  it('리드를 클릭하면 학생 패널 콜백을 호출한다', () => {
    const onSelectStudent = vi.fn();
    setup([row()], onSelectStudent);
    fireEvent.click(screen.getByRole('button', { name: /박OO/ }));
    expect(onSelectStudent).toHaveBeenCalledWith('st-2');
  });

  it('실행 기록이 없는 주는 기록 유도 문구를 보여준다', () => {
    setup([]);
    expect(screen.getByText(/이번 주 전략 적용 기록이 없습니다/)).toBeTruthy();
  });

  it('‘전략 적용 기록’을 누르면 quick-log 폼이 열린다', async () => {
    setup([]);
    fireEvent.click(screen.getByRole('button', { name: /전략 적용 기록/ }));
    expect(screen.getByPlaceholderText('리드 이름 검색 (2자 이상)')).toBeTruthy();
    // 전략 목록 비동기 로드가 끝난 뒤 단정을 마쳐 act 경고를 남기지 않는다.
    await waitFor(() => expect(screen.getByRole('combobox')).toBeTruthy());
  });
});
