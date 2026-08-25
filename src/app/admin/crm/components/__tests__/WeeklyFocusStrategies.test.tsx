import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WeeklyFocusStrategies } from '../weekly/WeeklyFocusStrategies';
import type { RetryStrategy, WeeklyFocusStrategy } from '@/types/crm';

const LIBRARY: RetryStrategy[] = [
  { id: 's-report', name: '진단리포트 당일등록 할인', description: null, type: 'initial_sales', segment: 'b2c', created_at: 'x' },
  { id: 's-retry', name: '인스타 상담 재신청', description: null, type: 'retry', segment: 'b2c', created_at: 'x' },
];

const focusItem: WeeklyFocusStrategy = {
  id: 'f-1',
  strategy_id: 's-report',
  strategy_name: '진단리포트 당일등록 할인',
  type: 'initial_sales',
  goal: '',
  memo: '',
  carried_from_week: null,
};

function setup(focus: WeeklyFocusStrategy[] = []) {
  const onChange = vi.fn();
  const onOpenLibrary = vi.fn();
  render(
    <WeeklyFocusStrategies
      segment="b2c"
      adminKey="admin-key"
      focus={focus}
      onChange={onChange}
      onOpenLibrary={onOpenLibrary}
    />,
  );
  return { onChange, onOpenLibrary };
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ data: LIBRARY }) })),
  );
});

describe('WeeklyFocusStrategies', () => {
  it('비어 있으면 전략 선택을 안내한다', () => {
    setup();
    expect(screen.getByText('‘전략 선택’으로 이번 주에 밀어볼 전략을 정하세요.')).toBeTruthy();
  });

  it('전략을 고르면 집중 전략으로 추가한다', async () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole('button', { name: /전략 선택/ }));

    const option = await screen.findByRole('button', { name: /진단리포트 당일등록 할인/ });
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual([
      expect.objectContaining({ strategy_id: 's-report', type: 'initial_sales', goal: '', memo: '' }),
    ]);
  });

  it('이미 고른 전략은 선택 목록에서 빠진다', async () => {
    setup([focusItem]);
    fireEvent.click(screen.getByRole('button', { name: /전략 선택/ }));

    await waitFor(() => expect(screen.getByRole('button', { name: /인스타 상담 재신청/ })).toBeTruthy());
    // 이미 선택된 전략은 목록 버튼으로 다시 나오지 않는다(카드 제목으로만 존재).
    expect(screen.queryAllByRole('button', { name: /진단리포트 당일등록 할인/ })).toHaveLength(0);
  });

  it('목표·메모는 blur에서 저장한다', () => {
    const { onChange } = setup([focusItem]);
    const goal = screen.getByPlaceholderText('목표 (예: 결제 3건)');

    fireEvent.change(goal, { target: { value: '결제 3건' } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.blur(goal);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0][0].goal).toBe('결제 3건');
  });

  it('삭제하면 목록에서 제거한다', () => {
    const { onChange } = setup([focusItem]);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]); // 카드의 삭제 버튼
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('전략 라이브러리 링크를 누르면 콜백을 호출한다', () => {
    const { onOpenLibrary } = setup();
    fireEvent.click(screen.getByRole('button', { name: /전략 라이브러리/ }));
    expect(onOpenLibrary).toHaveBeenCalled();
  });
});
