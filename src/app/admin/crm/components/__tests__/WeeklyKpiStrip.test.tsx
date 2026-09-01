import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WeeklyKpiStrip } from '../weekly/WeeklyKpiStrip';

const ITEMS = [
  { id: 'u1', name: '이가은02', traffic_source: '인스타그램', funnel_stage: '2', lead_status: 'active', churn_tag: null, date: '2026-08-17', is_paid: false, first_memo_at: null },
  { id: 'u2', name: '잠재고객_260818_02', traffic_source: null, funnel_stage: '1', lead_status: 'active', churn_tag: null, date: '2026-08-18', is_paid: true, first_memo_at: null },
];

function stubFetch(items = ITEMS) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: { metric: 'leads', kind: 'leads', count: items.length, items } }),
      }),
    ),
  );
}

const ROWS = [{ segment: 'b2c' as const, actuals: { leads: 12, contacted: 8, paid: 3 } }];

beforeEach(() => stubFetch());

describe('WeeklyKpiStrip', () => {
  it('인입 리드 코호트 지표만 보여준다', () => {
    render(<WeeklyKpiStrip rows={ROWS} adminKey="k" week={{ start: '2026-08-17', end: '2026-08-23' }} />);
    expect(screen.getByText('이번 주 인입 리드')).toBeTruthy();
    expect(screen.getByRole('button', { name: /신규 리드 12/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /컨택 8/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /결제 3/ })).toBeTruthy();
  });

  it('매출·실수익은 표시하지 않는다 — paid_at 현금 기준이라 코호트 결제와 축이 달라 오해를 만든다', () => {
    render(
      <WeeklyKpiStrip
        rows={[{ segment: 'b2c', actuals: { paid: 0, revenue: 14_840_000, net_revenue: 13_356_000 } }]}
        adminKey="k"
        week={{ start: '2026-08-17', end: '2026-08-23' }}
      />,
    );
    expect(screen.queryByText('매출')).toBeNull();
    expect(screen.queryByText('실수익')).toBeNull();
    expect(screen.queryByText('1,484만')).toBeNull();
  });

  it('지표를 누르면 아코디언으로 리드 명단을 보여준다', async () => {
    render(<WeeklyKpiStrip rows={ROWS} adminKey="k" week={{ start: '2026-08-17', end: '2026-08-23' }} />);
    expect(screen.queryByText('이가은02')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /신규 리드 12/ }));

    await waitFor(() => expect(screen.getByText('이가은02')).toBeTruthy());
    expect(screen.getByText('잠재고객_260818_02')).toBeTruthy();
  });

  it('올바른 metric·segment·주 범위로 조회한다', async () => {
    render(<WeeklyKpiStrip rows={ROWS} adminKey="k" week={{ start: '2026-08-17', end: '2026-08-23' }} />);
    fireEvent.click(screen.getByRole('button', { name: /컨택 8/ }));

    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    const url = vi.mocked(fetch).mock.calls[0][0] as string;
    expect(url).toContain('metric=contacted');
    expect(url).toContain('segment=b2c');
    expect(url).toContain('from=2026-08-17');
    expect(url).toContain('to=2026-08-23');
  });

  it('다시 누르면 접힌다', async () => {
    render(<WeeklyKpiStrip rows={ROWS} adminKey="k" week={{ start: '2026-08-17', end: '2026-08-23' }} />);
    const btn = screen.getByRole('button', { name: /신규 리드 12/ });
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByText('이가은02')).toBeTruthy());
    fireEvent.click(btn);
    expect(screen.queryByText('이가은02')).toBeNull();
  });

  it('리드를 누르면 학생 패널 콜백을 호출한다', async () => {
    const onSelectStudent = vi.fn();
    render(
      <WeeklyKpiStrip rows={ROWS} adminKey="k" week={{ start: '2026-08-17', end: '2026-08-23' }} onSelectStudent={onSelectStudent} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /신규 리드 12/ }));
    fireEvent.click(await screen.findByText('이가은02'));
    expect(onSelectStudent).toHaveBeenCalledWith('u1');
  });

  it('0이면 누를 수 없다', () => {
    render(
      <WeeklyKpiStrip
        rows={[{ segment: 'b2c', actuals: { leads: 0, contacted: 0, paid: 0 } }]}
        adminKey="k"
        week={{ start: '2026-08-17', end: '2026-08-23' }}
      />,
    );
    expect(screen.getByRole('button', { name: /신규 리드 0/ })).toHaveProperty('disabled', true);
  });

  it('명단이 비면 안내를 보여준다', async () => {
    stubFetch([]);
    render(<WeeklyKpiStrip rows={ROWS} adminKey="k" week={{ start: '2026-08-17', end: '2026-08-23' }} />);
    fireEvent.click(screen.getByRole('button', { name: /신규 리드 12/ }));
    await waitFor(() => expect(screen.getByText('해당하는 리드가 없습니다.')).toBeTruthy());
  });

  it('세그먼트 라벨을 켜면 B2C/B2B를 표기한다', () => {
    render(
      <WeeklyKpiStrip
        showSegmentLabel
        rows={[
          { segment: 'b2c', actuals: { paid: 1 } },
          { segment: 'b2b', actuals: { paid: 2 } },
        ]}
        adminKey="k"
        week={{ start: '2026-08-17', end: '2026-08-23' }}
      />,
    );
    expect(screen.getByText('B2C')).toBeTruthy();
    expect(screen.getByText('B2B')).toBeTruthy();
  });
});
