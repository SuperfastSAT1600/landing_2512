import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { GlobalSalesPanel } from '../GlobalSalesPanel';
import type { GlobalSaleEntry } from '@/app/api/business/global-sales/route';

const ENTRIES: GlobalSaleEntry[] = [
  { id: 'g-1', student_name: '김글로벌', payment_type: '최초결제', amount_usd: 500, sale_date: '2026-08-11', created_at: 'x', country_code: 'PK', billing_type: '일회성' },
  { id: 'g-2', student_name: '박글로벌', payment_type: '재결제', amount_usd: 300, sale_date: '2026-08-12', created_at: 'x', country_code: 'AE', billing_type: '구독' },
];

// 마운트 시 순서대로: 월별 목표 조회 → 매출 목록 조회. 그 뒤 이어지는 응답은 사용자 액션(추가/삭제) 순서.
function mockFetchSequence(...responses: Array<{ ok: boolean; data?: unknown; error?: string; status?: number }>) {
  const fn = vi.fn();
  for (const r of responses) {
    fn.mockImplementationOnce(() =>
      Promise.resolve({
        ok: r.ok,
        status: r.status ?? (r.ok ? 200 : 400),
        json: () => Promise.resolve(r.ok ? { data: r.data } : { error: r.error ?? 'error' }),
      }),
    );
  }
  return fn;
}

const noTargets = { ok: true, data: [] };

beforeEach(() => {
  vi.stubGlobal('confirm', vi.fn(() => true));
});

describe('GlobalSalesPanel', () => {
  it('합계와 목록을 보여준다', async () => {
    vi.stubGlobal('fetch', mockFetchSequence(noTargets, { ok: true, data: ENTRIES }));
    render(<GlobalSalesPanel adminKey="admin-key" />);

    expect(await screen.findByText('김글로벌')).toBeTruthy();
    expect(screen.getByText('박글로벌')).toBeTruthy();
    expect(screen.getByTestId('total-usd').textContent).toBe('$800');
    expect(screen.getByTestId('first-usd').textContent).toBe('$500');
    expect(screen.getByTestId('repeat-usd').textContent).toBe('$300');
  });

  it('데이터가 없으면 빈 상태를 보여준다', async () => {
    vi.stubGlobal('fetch', mockFetchSequence(noTargets, { ok: true, data: [] }));
    render(<GlobalSalesPanel adminKey="admin-key" />);
    await waitFor(() => expect(screen.getByText(/등록된 매출이 없습니다/)).toBeTruthy());
  });

  it('매출 추가 폼 제출 시 POST 후 목록에 반영한다', async () => {
    const fetchMock = mockFetchSequence(
      noTargets,
      { ok: true, data: [] },
      { ok: true, data: { id: 'g-3', student_name: '이신규', payment_type: '최초결제', amount_usd: 200, sale_date: '2026-08-13', created_at: 'x', country_code: 'US' }, status: 201 },
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<GlobalSalesPanel adminKey="admin-key" />);

    await waitFor(() => expect(screen.getByText(/등록된 매출이 없습니다/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /매출 추가/ }));
    fireEvent.change(screen.getByPlaceholderText('학생 이름'), { target: { value: '이신규' } });
    fireEvent.change(screen.getByPlaceholderText('금액 ($)'), { target: { value: '200' } });
    fireEvent.click(screen.getByRole('button', { name: '추가' }));

    await waitFor(() => expect(screen.getByText('이신규')).toBeTruthy());
    const postCall = fetchMock.mock.calls[2];
    expect(postCall[0]).toBe('/api/business/global-sales');
    expect(JSON.parse(postCall[1].body)).toEqual(
      expect.objectContaining({ student_name: '이신규', amount_usd: 200 }),
    );
  });

  it('국가를 선택해 추가하면 POST body에 country_code가 담긴다', async () => {
    const fetchMock = mockFetchSequence(
      noTargets,
      { ok: true, data: [] },
      { ok: true, data: { id: 'g-3', student_name: '이신규', payment_type: '최초결제', amount_usd: 200, sale_date: '2026-08-13', created_at: 'x', country_code: 'PK' }, status: 201 },
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<GlobalSalesPanel adminKey="admin-key" />);

    await waitFor(() => expect(screen.getByText(/등록된 매출이 없습니다/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /매출 추가/ }));
    fireEvent.change(screen.getByPlaceholderText('학생 이름'), { target: { value: '이신규' } });
    fireEvent.change(screen.getByPlaceholderText('금액 ($)'), { target: { value: '200' } });

    // 국가는 검색해서 고른다 — 240개국이라 타이핑으로 좁힌다.
    fireEvent.click(screen.getByRole('button', { name: '국가 선택' }));
    fireEvent.change(screen.getByRole('combobox', { name: '국가 검색' }), { target: { value: 'pakistan' } });
    fireEvent.click(within(screen.getByRole('listbox')).getAllByRole('option')[0]);

    fireEvent.click(screen.getByRole('button', { name: '추가' }));

    await waitFor(() => expect(screen.getByText('이신규')).toBeTruthy());
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual(
      expect.objectContaining({ country_code: 'PK' }),
    );
  });

  it('목록 행에 국기와 한글·영문 국가명을 보여준다', async () => {
    vi.stubGlobal('fetch', mockFetchSequence(noTargets, { ok: true, data: ENTRIES }));
    render(<GlobalSalesPanel adminKey="admin-key" />);

    await screen.findByText('김글로벌');
    expect(screen.getAllByText('🇵🇰 파키스탄 · Pakistan').length).toBeGreaterThan(0);
    expect(screen.getAllByText('🇦🇪 아랍에미리트 · United Arab Emirates').length).toBeGreaterThan(0);
  });

  it('국가 셀에서 검색해 국가를 바꾸면 PATCH하고 목록에 반영한다', async () => {
    const fetchMock = mockFetchSequence(
      noTargets,
      { ok: true, data: [{ ...ENTRIES[0], country_code: null }] },
      { ok: true, data: { ...ENTRIES[0], country_code: 'US' } },
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<GlobalSalesPanel adminKey="admin-key" />);

    await screen.findByText('김글로벌');
    fireEvent.click(screen.getByRole('button', { name: '미지정' }));
    fireEvent.change(screen.getByRole('combobox', { name: '국가 검색' }), { target: { value: '미국' } });
    fireEvent.click(within(screen.getByRole('listbox')).getAllByRole('option')[0]);

    await waitFor(() => expect(screen.getAllByText('🇺🇸 미국 · United States').length).toBeGreaterThan(0));
    expect(fetchMock.mock.calls[2][0]).toBe('/api/business/global-sales/g-1');
    expect(fetchMock.mock.calls[2][1].method).toBe('PATCH');
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ country_code: 'US' });
  });

  it('국가별 매출 섹션을 매출 내림차순으로 보여준다', async () => {
    vi.stubGlobal('fetch', mockFetchSequence(noTargets, { ok: true, data: ENTRIES }));
    render(<GlobalSalesPanel adminKey="admin-key" />);

    await screen.findByText('김글로벌');
    expect(screen.getByText('국가별 매출')).toBeTruthy();
    expect(screen.getByTestId('country-count').textContent).toContain('2');

    const rows = screen.getAllByTestId('country-stat-row');
    expect(rows[0].textContent).toContain('파키스탄');
    expect(rows[0].textContent).toContain('$500');
    expect(rows[1].textContent).toContain('아랍에미리트');
  });

  it('매출이 없으면 국가별 매출 안내 문구를 보여준다', async () => {
    vi.stubGlobal('fetch', mockFetchSequence(noTargets, { ok: true, data: [] }));
    render(<GlobalSalesPanel adminKey="admin-key" />);

    await waitFor(() => expect(screen.getByText(/국가별 매출이 아직 없습니다/)).toBeTruthy());
  });

  it('삭제 버튼 클릭 시 confirm 후 DELETE하고 목록에서 제거한다', async () => {
    const fetchMock = mockFetchSequence(
      noTargets,
      { ok: true, data: ENTRIES },
      { ok: true, data: { id: 'g-1' } },
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<GlobalSalesPanel adminKey="admin-key" />);

    await screen.findByText('김글로벌');
    const deleteButtons = screen.getAllByRole('button', { name: /삭제/ });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => expect(screen.queryByText('김글로벌')).toBeNull());
    expect(fetchMock.mock.calls[2][0]).toBe('/api/business/global-sales/g-1');
    expect(fetchMock.mock.calls[2][1].method).toBe('DELETE');
  });

  it('삭제 확인을 취소하면 아무 일도 없다', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    const fetchMock = mockFetchSequence(noTargets, { ok: true, data: ENTRIES });
    vi.stubGlobal('fetch', fetchMock);
    render(<GlobalSalesPanel adminKey="admin-key" />);

    await screen.findByText('김글로벌');
    fireEvent.click(screen.getAllByRole('button', { name: /삭제/ })[0]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('월별 목표가 있으면 목표 대비 실적 그래프를 보여준다', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetchSequence(
        { ok: true, data: [{ id: 't-1', month: '2026-08-01', segment: 'global', target_amount: 1000000, currency: 'KRW', created_at: 'x', updated_at: 'x' }] },
        { ok: true, data: ENTRIES },
      ),
    );
    render(<GlobalSalesPanel adminKey="admin-key" />);
    await screen.findByText('김글로벌');
    expect(screen.getByText('월별 목표 대비 실적')).toBeTruthy();
    expect(screen.queryByText(/설정된 목표가 없습니다/)).toBeNull();
  });

  it('매출 목록·합계 카드는 계속 달러(USD)로 보여준다', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetchSequence(
        { ok: true, data: [{ id: 't-1', month: '2026-08-01', segment: 'global', target_amount: 1000000, currency: 'KRW', created_at: 'x', updated_at: 'x' }] },
        { ok: true, data: ENTRIES },
      ),
    );
    render(<GlobalSalesPanel adminKey="admin-key" />);
    await screen.findByText('김글로벌');
    expect(screen.getByTestId('total-usd').textContent).toBe('$800');
  });

  it('일회성·구독 KPI를 보여준다', async () => {
    vi.stubGlobal('fetch', mockFetchSequence(noTargets, { ok: true, data: ENTRIES }));
    render(<GlobalSalesPanel adminKey="admin-key" />);

    await screen.findByText('김글로벌');
    expect(screen.getByTestId('onetime-usd').textContent).toBe('$500');
    expect(screen.getByTestId('subscription-usd').textContent).toBe('$300');
  });

  it('결제 방식별 매출 섹션을 매출 내림차순으로 보여준다', async () => {
    vi.stubGlobal('fetch', mockFetchSequence(noTargets, { ok: true, data: ENTRIES }));
    render(<GlobalSalesPanel adminKey="admin-key" />);

    await screen.findByText('김글로벌');
    expect(screen.getByText('결제 방식별 매출')).toBeTruthy();

    const rows = screen.getAllByTestId('billing-stat-row');
    expect(rows[0].textContent).toContain('일회성');
    expect(rows[0].textContent).toContain('$500');
    expect(rows[1].textContent).toContain('구독');
  });

  it('구독을 선택해 추가하면 POST body에 billing_type이 담긴다', async () => {
    const fetchMock = mockFetchSequence(
      noTargets,
      { ok: true, data: [] },
      { ok: true, data: { ...ENTRIES[0], id: 'g-3', student_name: '이신규', billing_type: '구독' }, status: 201 },
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<GlobalSalesPanel adminKey="admin-key" />);

    await waitFor(() => expect(screen.getByText(/등록된 매출이 없습니다/)).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: /매출 추가/ }));
    fireEvent.change(screen.getByPlaceholderText('학생 이름'), { target: { value: '이신규' } });
    fireEvent.change(screen.getByPlaceholderText('금액 ($)'), { target: { value: '200' } });
    fireEvent.change(screen.getByLabelText('결제 방식'), { target: { value: '구독' } });
    fireEvent.click(screen.getByRole('button', { name: '추가' }));

    await waitFor(() => expect(screen.getByText('이신규')).toBeTruthy());
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual(
      expect.objectContaining({ billing_type: '구독' }),
    );
  });

  it('목록에서 결제 방식을 바꾸면 PATCH하고 반영한다', async () => {
    const fetchMock = mockFetchSequence(
      noTargets,
      { ok: true, data: [ENTRIES[0]] },
      { ok: true, data: { ...ENTRIES[0], billing_type: '구독' } },
    );
    vi.stubGlobal('fetch', fetchMock);
    render(<GlobalSalesPanel adminKey="admin-key" />);

    await screen.findByText('김글로벌');
    fireEvent.change(screen.getByLabelText('결제 방식 변경'), { target: { value: '구독' } });

    await waitFor(() => expect(screen.getByTestId('subscription-usd').textContent).toBe('$500'));
    expect(fetchMock.mock.calls[2][0]).toBe('/api/business/global-sales/g-1');
    expect(fetchMock.mock.calls[2][1].method).toBe('PATCH');
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ billing_type: '구독' });
  });
});
