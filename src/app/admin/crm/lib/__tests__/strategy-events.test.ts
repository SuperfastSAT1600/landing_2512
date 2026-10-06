import { renderHook } from '@testing-library/react';
import { notifyStrategyHistoryChanged, useOnStrategyHistoryChanged } from '../strategy-events';

describe('strategy-events', () => {
  // REQ-004 (strategy-history-date-edit): 패널에서 바꾼 전략 기록이 세일즈 전략 통계에 바로 반영
  it('전략 기록 변경을 알리면 구독자가 학생 id와 함께 호출된다', () => {
    const cb = vi.fn();
    renderHook(() => useOnStrategyHistoryChanged(cb));
    notifyStrategyHistoryChanged('stu-1');
    expect(cb).toHaveBeenCalledWith('stu-1');
  });

  it('언마운트하면 더 이상 호출되지 않는다', () => {
    const cb = vi.fn();
    const { unmount } = renderHook(() => useOnStrategyHistoryChanged(cb));
    unmount();
    notifyStrategyHistoryChanged('stu-1');
    expect(cb).not.toHaveBeenCalled();
  });

  it('콜백이 바뀌어도 최신 콜백을 부른다', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useOnStrategyHistoryChanged(cb), { initialProps: { cb: first } });
    rerender({ cb: second });
    notifyStrategyHistoryChanged('stu-2');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('stu-2');
  });
});
