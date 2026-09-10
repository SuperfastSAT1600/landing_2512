import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MonthlyTargetEditor } from '../MonthlyTargetEditor';

function mockFetchOnce(ok: boolean, data?: unknown) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(ok ? { data } : { error: 'boom' }),
  });
}

beforeEach(() => {
  vi.stubGlobal('alert', vi.fn());
});

describe('MonthlyTargetEditor', () => {
  it('토글하면 월·금액 입력 폼이 열린다', () => {
    vi.stubGlobal('fetch', mockFetchOnce(true, {}));
    render(<MonthlyTargetEditor segment="tutoring" adminKey="admin-key" onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /목표 설정/ }));
    expect(screen.getByLabelText(/월/)).toBeTruthy();
    expect(screen.getByPlaceholderText(/금액/)).toBeTruthy();
  });

  it('저장하면 PUT 호출 후 onSaved를 부르고 폼을 닫는다', async () => {
    const fetchMock = mockFetchOnce(true, { id: 't-1' });
    vi.stubGlobal('fetch', fetchMock);
    const onSaved = vi.fn();
    render(<MonthlyTargetEditor segment="tutoring" adminKey="admin-key" onSaved={onSaved} />);

    fireEvent.click(screen.getByRole('button', { name: /목표 설정/ }));
    fireEvent.change(screen.getByLabelText(/월/), { target: { value: '2026-12' } });
    fireEvent.change(screen.getByPlaceholderText(/금액/), { target: { value: '350000000' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/business/monthly-targets');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ segment: 'tutoring', month: '2026-12', target_amount: 350000000 });
    expect(screen.queryByLabelText(/월/)).toBeNull();
  });

  it('글로벌 목표는 달러 입력을 1$=1,400원으로 원화 환산해 저장한다', async () => {
    const fetchMock = mockFetchOnce(true, { id: 't-1' });
    vi.stubGlobal('fetch', fetchMock);
    const onSaved = vi.fn();
    render(<MonthlyTargetEditor segment="global" adminKey="admin-key" onSaved={onSaved} />);

    fireEvent.click(screen.getByRole('button', { name: /목표 설정/ }));
    expect(screen.getByPlaceholderText('목표 금액 ($)')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/월/), { target: { value: '2026-08' } });
    fireEvent.change(screen.getByPlaceholderText('목표 금액 ($)'), { target: { value: '700' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ segment: 'global', month: '2026-08', target_amount: 980000 });
  });

  it('실패하면 alert를 띄우고 폼을 닫지 않는다', async () => {
    vi.stubGlobal('fetch', mockFetchOnce(false));
    const onSaved = vi.fn();
    render(<MonthlyTargetEditor segment="global" adminKey="admin-key" onSaved={onSaved} />);

    fireEvent.click(screen.getByRole('button', { name: /목표 설정/ }));
    fireEvent.change(screen.getByLabelText(/월/), { target: { value: '2026-12' } });
    fireEvent.change(screen.getByPlaceholderText(/금액/), { target: { value: '40000' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => expect(global.alert).toHaveBeenCalled());
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/월/)).toBeTruthy();
  });
});
