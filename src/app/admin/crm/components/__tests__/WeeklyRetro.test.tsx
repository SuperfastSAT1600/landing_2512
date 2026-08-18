import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WeeklyRetro } from '../weekly/WeeklyRetro';
import type { WeeklyRetrospective } from '@/types/crm';

const emptyRetro: WeeklyRetrospective = {
  went_well: '',
  went_wrong: '',
  next_actions: [],
  updated_at: null,
};

function setup(retro: WeeklyRetrospective = emptyRetro, nextWeekLabel: string | null = '26년 08월 04주차') {
  const onChange = vi.fn();
  const onCarryOver = vi.fn().mockResolvedValue(true);
  render(
    <WeeklyRetro
      retro={retro}
      summary="이 주 실적: 적용 6 · 결제 2 · 매출 410만원"
      nextWeekLabel={nextWeekLabel}
      onChange={onChange}
      onCarryOver={onCarryOver}
    />,
  );
  return { onChange, onCarryOver };
}

describe('WeeklyRetro', () => {
  it('이 주 실적 요약을 보여준다', () => {
    setup();
    expect(screen.getByText('이 주 실적: 적용 6 · 결제 2 · 매출 410만원')).toBeTruthy();
  });

  it('텍스트 입력은 타이핑 중 저장하지 않고 blur에서 저장한다', () => {
    const { onChange } = setup();

    const wentWell = screen.getByPlaceholderText('어떤 전략·행동이 통했나');
    fireEvent.change(wentWell, { target: { value: '당일등록 할인 반응 좋음' } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.blur(wentWell);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].went_well).toBe('당일등록 할인 반응 좋음');
  });

  it('다음 주에 할 것 항목을 추가하면 즉시 저장한다', () => {
    const { onChange } = setup();

    const input = screen.getByPlaceholderText('항목 추가…');
    fireEvent.change(input, { target: { value: '리포트 상담 당일 제안 강화' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].next_actions).toEqual([
      expect.objectContaining({ text: '리포트 상담 당일 제안 강화', carried_to: null }),
    ]);
  });

  it('‘다음 주로’를 누르면 이관 후 carried_to를 기록한다', async () => {
    const retro: WeeklyRetrospective = {
      ...emptyRetro,
      next_actions: [{ id: 'n1', text: '인스타 재신청 문구 교체', carried_to: null }],
    };
    const { onChange, onCarryOver } = setup(retro);

    fireEvent.click(screen.getByRole('button', { name: /다음 주로/ }));

    expect(onCarryOver).toHaveBeenCalledWith(retro.next_actions[0]);
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange.mock.calls[0][0].next_actions[0].carried_to).toBe('26년 08월 04주차');
  });

  it('이관 실패 시 carried_to를 기록하지 않는다', async () => {
    const onChange = vi.fn();
    const onCarryOver = vi.fn().mockResolvedValue(false);
    render(
      <WeeklyRetro
        retro={{ ...emptyRetro, next_actions: [{ id: 'n1', text: '항목', carried_to: null }] }}
        summary=""
        nextWeekLabel="26년 08월 04주차"
        onChange={onChange}
        onCarryOver={onCarryOver}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /다음 주로/ }));
    await waitFor(() => expect(onCarryOver).toHaveBeenCalled());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('다음 주차가 없으면(주차 정의 끝) 이관 버튼을 숨긴다', () => {
    setup({ ...emptyRetro, next_actions: [{ id: 'n1', text: '항목', carried_to: null }] }, null);
    expect(screen.queryByRole('button', { name: /다음 주로/ })).toBeNull();
  });
});
