/// <reference types="vitest/globals" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StrategyStatsListItem } from '../strategy-stats/StrategyStatsListItem';
import type { PerStrategyRow } from '@/lib/strategy-stats';

const row = (over: Partial<PerStrategyRow> = {}): PerStrategyRow => ({
  strategy_id: 's1',
  strategy_name: '대표 코치 수업권 세일즈',
  assigned: 6,
  touched: 6,
  contacted: 6,
  contact_rate: 100,
  paid: 3,
  conversion_rate: 50,
  conversion_rate_of_assigned: 50,
  revenue: 4_200_000,
  net_revenue: 4_200_000,
  avg_days_to_convert: 2,
  stage_flow: [],
  exists: true,
  ...over,
});

const setup = (over: Partial<PerStrategyRow> = {}, onDeleted = vi.fn()) => {
  render(
    <StrategyStatsListItem
      row={row(over)}
      active={false}
      adminKey="k"
      onClick={() => {}}
      onDeleted={onDeleted}
    />
  );
  return { onDeleted };
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ data: { id: 's1' } }) })));
  vi.stubGlobal('confirm', vi.fn(() => true));
  vi.stubGlobal('alert', vi.fn());
});

describe('StrategyStatsListItem — 삭제 버튼 노출', () => {
  it('모든 행에 삭제 버튼이 있다 — 삭제된 전략은 목록에 오기 전에 걸러진다', () => {
    setup();
    expect(screen.getByRole('button', { name: '전략 삭제' })).toBeTruthy();
    expect(screen.queryByText('삭제됨')).toBeNull();
  });
});

describe('StrategyStatsListItem — 삭제 확인 (REQ-003)', () => {
  it('배정이 있으면 확인 문구에 인원과 "기록은 남는다"를 알린다', () => {
    setup({ assigned: 6 });
    fireEvent.click(screen.getByRole('button', { name: '전략 삭제' }));
    const msg = (confirm as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(msg).toContain('대표 코치 수업권 세일즈');
    expect(msg).toContain('6명');
    expect(msg).toContain('통계에 남습니다');
  });

  it('배정이 0이면 인원 경고 없이 묻는다', () => {
    setup({ assigned: 0 });
    fireEvent.click(screen.getByRole('button', { name: '전략 삭제' }));
    const msg = (confirm as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(msg).not.toContain('명 ·');
  });

  it('확인을 취소하면 API를 호출하지 않는다', () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    const { onDeleted } = setup();
    fireEvent.click(screen.getByRole('button', { name: '전략 삭제' }));
    expect(fetch).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});

describe('StrategyStatsListItem — 삭제 실행 (REQ-004/005)', () => {
  it('기존 retry-strategies DELETE 엔드포인트를 호출하고 onDeleted를 알린다', async () => {
    const { onDeleted } = setup({ strategy_id: 'abc' });
    fireEvent.click(screen.getByRole('button', { name: '전략 삭제' }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith('/api/crm/retry-strategies/abc', {
      method: 'DELETE',
      headers: { 'x-admin-key': 'k' },
    });
  });

  it('삭제가 실패하면 alert를 띄우고 onDeleted를 부르지 않는다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })));
    const { onDeleted } = setup();
    fireEvent.click(screen.getByRole('button', { name: '전략 삭제' }));
    await waitFor(() => expect(alert).toHaveBeenCalled());
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('삭제 버튼 클릭이 카드 선택으로 새지 않는다', () => {
    const onClick = vi.fn();
    render(
      <StrategyStatsListItem
        row={row()}
        active={false}
        adminKey="k"
        onClick={onClick}
        onDeleted={() => {}}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: '전략 삭제' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
