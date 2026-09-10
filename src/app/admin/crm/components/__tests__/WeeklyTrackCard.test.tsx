import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WeeklyTrackCard } from '../weekly/WeeklyTrackCard';
import { computeTrackProgress } from '@/lib/weekly-track-progress';
import type { RetryStrategy, WeeklyExecutionRow, WeeklyTrack } from '@/types/crm';

const STRATEGIES: RetryStrategy[] = [
  { id: 's-report', name: '진단리포트 당일등록 할인', description: null, type: 'initial_sales', segment: 'b2c', created_at: 'x' },
];

const EXECUTION: WeeklyExecutionRow[] = [
  {
    strategy_id: 's-report',
    strategy_name: '진단리포트 당일등록 할인',
    type: 'initial_sales',
    planned: true,
    applied_count: 2,
    contacted_count: 2,
    paid_count: 1,
    revenue: 4_100_000,
    leads: [
      { student_id: 'u1', name: '김OO', applied_at: '2026-08-18T02:00:00Z', memo: '', contacted: true, paid: true, revenue: 4_100_000 },
      { student_id: 'u2', name: '박OO', applied_at: '2026-08-19T02:00:00Z', memo: '', contacted: true, paid: false, revenue: 0 },
    ],
  },
];

function makeTrack(over: Partial<WeeklyTrack> = {}): WeeklyTrack {
  return {
    id: 't-1',
    name: '신규리드',
    goal_text: '인스타리드 2건 결제',
    metric: null,
    target_value: 0,
    achieved: false,
    items: [
      {
        id: 'i-1',
        text: '첫 세일즈콜 완료 후 상담 포탈 전달',
        done: false,
        done_at: null,
        strategy_id: 's-report',
        strategy_name: '진단리포트 당일등록 할인',
        strategy_type: 'initial_sales',
      },
    ],
    carried_from_week: null,
    ...over,
  };
}

function setup(track: WeeklyTrack = makeTrack(), props: Record<string, unknown> = {}) {
  const onChange = vi.fn();
  const onRemove = vi.fn();
  const onSelectStudent = vi.fn();
  const onLogApply = vi.fn();
  render(
    <WeeklyTrackCard
      track={track}
      progress={computeTrackProgress(track, EXECUTION)}
      strategies={STRATEGIES}
      onChange={onChange}
      onRemove={onRemove}
      onSelectStudent={onSelectStudent}
      onLogApply={onLogApply}
      {...props}
    />,
  );
  return { onChange, onRemove, onSelectStudent, onLogApply };
}

describe('WeeklyTrackCard', () => {
  it('트랙 이름과 목표를 보여준다', () => {
    setup();
    expect(screen.getByDisplayValue('신규리드')).toBeTruthy();
    expect(screen.getByDisplayValue('인스타리드 2건 결제')).toBeTruthy();
  });

  it('이름은 타이핑 중 저장하지 않고 blur에서 저장한다', () => {
    const { onChange } = setup();
    const name = screen.getByDisplayValue('신규리드');

    fireEvent.change(name, { target: { value: '신규 인바운드' } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.blur(name);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].name).toBe('신규 인바운드');
  });

  it('목표도 blur에서 저장한다', () => {
    const { onChange } = setup();
    const goal = screen.getByDisplayValue('인스타리드 2건 결제');

    fireEvent.change(goal, { target: { value: '결제 3건' } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.blur(goal);
    expect(onChange.mock.calls[0][0].goal_text).toBe('결제 3건');
  });

  it('지표를 고르면 즉시 저장한다', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('지표'), { target: { value: 'paid' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].metric).toBe('paid');
  });

  it('지표가 있으면 연결된 전략 집계로 달성률을 보여준다', () => {
    setup(makeTrack({ metric: 'paid', target_value: 2 }));
    expect(screen.getByText(/1\s*\/\s*2/)).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
  });

  it('매출 지표는 만원으로 표시한다', () => {
    setup(makeTrack({ metric: 'revenue', target_value: 2_000_000 }));
    expect(screen.getByText(/410만\s*\/\s*200만/)).toBeTruthy();
  });

  it('지표가 없으면 수동 달성 체크가 있고 즉시 저장한다', () => {
    const { onChange } = setup();
    const check = screen.getByLabelText('달성');
    fireEvent.click(check);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].achieved).toBe(true);
  });

  it('지표가 있으면 수동 달성 체크는 없다', () => {
    setup(makeTrack({ metric: 'paid', target_value: 2 }));
    expect(screen.queryByLabelText('달성')).toBeNull();
  });

  it('연결된 전략이 없으면 자동 집계 힌트를 준다', () => {
    setup(
      makeTrack({
        metric: 'paid',
        target_value: 2,
        items: [{ id: 'i-1', text: '자료 수정', done: false, done_at: null, strategy_id: null, strategy_name: null, strategy_type: null }],
      }),
    );
    expect(screen.getByText('전략을 연결하면 자동 집계됩니다')).toBeTruthy();
  });

  it('적용 리드 수를 보여주고 펼치면 리드 칩이 나온다', () => {
    const { onSelectStudent } = setup();
    const toggle = screen.getByRole('button', { name: /적용 리드 2명/ });
    expect(screen.queryByRole('button', { name: /김OO/ })).toBeNull();

    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: /김OO/ }));
    expect(onSelectStudent).toHaveBeenCalledWith('u1');
  });

  it('적용 기록 버튼이 콜백을 호출한다', () => {
    const { onLogApply } = setup();
    fireEvent.click(screen.getByRole('button', { name: '적용 기록' }));
    expect(onLogApply).toHaveBeenCalled();
  });

  it('삭제 버튼이 콜백을 호출한다', () => {
    const { onRemove } = setup();
    fireEvent.click(screen.getByLabelText('트랙 삭제'));
    expect(onRemove).toHaveBeenCalled();
  });

  it('이어받은 트랙은 출처를 표시한다', () => {
    setup(makeTrack({ carried_from_week: '2026-08-10' }));
    expect(screen.getByText('지난주 회고에서')).toBeTruthy();
  });

  it('세그먼트 라벨을 넘기면 배지로 보여준다', () => {
    setup(makeTrack(), { segmentLabel: 'B2B' });
    expect(screen.getByText('B2B')).toBeTruthy();
  });
});
