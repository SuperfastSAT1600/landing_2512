import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TotalOverviewPanel } from '../TotalOverviewPanel';

// 패널은 글로벌 매출을 "이번 달"로 필터하므로 픽스처 날짜도 실행 시점의 이번 달로 잡는다.
const THIS_MONTH_DAY = `${new Date().toISOString().slice(0, 8)}11`;

const GLOBAL_ENTRIES = [
  { id: 'g-1', student_name: '김글로벌', payment_type: '최초결제', amount_usd: 500, sale_date: THIS_MONTH_DAY, created_at: 'x', country_code: 'PK' },
];

function crmStatsResponse(overview: Record<string, number>, monthly: Record<string, number>[] = []) {
  return {
    ok: true,
    json: () => Promise.resolve({ data: { overview, monthly, by_source: [], weekly: [], stage_flow: [] } }),
  };
}
function ok(data: unknown) {
  return { ok: true, json: () => Promise.resolve({ data }) };
}

// 라우팅: URL을 보고 어떤 응답을 줄지 결정 — fetch 호출 순서에 의존하지 않는다.
function routedFetch(overview: Record<string, number>) {
  return vi.fn((url: string) => {
    if (url.includes('/api/crm/stats')) return Promise.resolve(crmStatsResponse(overview));
    if (url.includes('/api/business/global-sales')) return Promise.resolve(ok(GLOBAL_ENTRIES));
    return Promise.resolve(ok(null));
  });
}

beforeEach(() => vi.clearAllMocks());

describe('TotalOverviewPanel', () => {
  it('한국비즈니스(KRW) + 글로벌(USD×1400)을 합산한 KPI를 보여준다', async () => {
    vi.stubGlobal(
      'fetch',
      routedFetch({ gross_revenue: 62_770_000, total_revenue: 60_150_000, total_net_revenue: 53_870_000 }),
    );
    render(<TotalOverviewPanel adminKey="admin-key" />);

    // 총매출 = 62,770,000 + 500*1400(700,000) = 63,470,000 → "6,347만원"
    await waitFor(() => expect(screen.getByTestId('total-revenue-krw').textContent).toContain('6,347만원'));
  });

  it('한국비즈니스·글로벌 매출 비중을 함께 보여준다', async () => {
    vi.stubGlobal(
      'fetch',
      routedFetch({ gross_revenue: 62_770_000, total_revenue: 60_150_000, total_net_revenue: 53_870_000 }),
    );
    render(<TotalOverviewPanel adminKey="admin-key" />);
    await waitFor(() => expect(screen.getByTestId('total-revenue-krw')).toBeTruthy());
    const caption = screen.getByTestId('total-revenue-krw').nextSibling as HTMLElement;
    expect(caption.textContent).toContain('한국비즈니스');
    expect(caption.textContent).toContain('글로벌');
  });

  it('퍼널 지표(신규 리드 등)는 보여주지 않는다', async () => {
    vi.stubGlobal('fetch', routedFetch({ gross_revenue: 0, total_revenue: 0, total_net_revenue: 0 }));
    render(<TotalOverviewPanel adminKey="admin-key" />);
    await waitFor(() => expect(screen.getByTestId('total-revenue-krw')).toBeTruthy());
    expect(screen.queryByText('신규 리드')).toBeNull();
    expect(screen.queryByText('컨택 성공률')).toBeNull();
    expect(screen.queryByText('유입 소스별 성과')).toBeNull();
  });

  it('월별 추이(합산 라인 차트)만 보여주고 목표 지표는 아예 없다', async () => {
    vi.stubGlobal(
      'fetch',
      routedFetch({ gross_revenue: 62_770_000, total_revenue: 60_150_000, total_net_revenue: 53_870_000 }),
    );
    render(<TotalOverviewPanel adminKey="admin-key" />);
    await waitFor(() => expect(screen.getByText('월별 추이 (합산)')).toBeTruthy());
    expect(screen.queryByText('월별 목표 대비 실적 (합산)')).toBeNull();
    expect(screen.queryByRole('button', { name: '목표 비교' })).toBeNull();
    expect(screen.queryByRole('button', { name: '추이 보기' })).toBeNull();
    expect(screen.queryByText(/설정된 목표가 없습니다/)).toBeNull();
  });

  it('추이 기간 프리셋을 바꾸면 한국비즈니스 월별 조회 범위가 바뀐다', async () => {
    const fetchMock = routedFetch({ gross_revenue: 0, total_revenue: 0, total_net_revenue: 0 });
    vi.stubGlobal('fetch', fetchMock);
    render(<TotalOverviewPanel adminKey="admin-key" />);
    await waitFor(() => expect(screen.getByText('월별 추이 (합산)')).toBeTruthy());

    fetchMock.mockClear();
    screen.getByRole('button', { name: '최근 6개월' }).click();

    await waitFor(() => {
      const crmCalls = fetchMock.mock.calls.filter(([url]: [string]) => url.includes('/api/crm/stats') && url.includes('segment=all'));
      expect(crmCalls.some(([url]: [string]) => !url.includes('from=2020-01-01'))).toBe(true);
    });
  });

  it('기간 설정(custom) 선택 시 날짜 입력이 나타난다', async () => {
    vi.stubGlobal('fetch', routedFetch({ gross_revenue: 0, total_revenue: 0, total_net_revenue: 0 }));
    render(<TotalOverviewPanel adminKey="admin-key" />);
    await waitFor(() => expect(screen.getByText('월별 추이 (합산)')).toBeTruthy());

    screen.getByRole('button', { name: '기간 설정' }).click();
    await waitFor(() => expect(document.querySelectorAll('input[type="date"]').length).toBe(2));
  });

  it('데이터가 없으면 빈 상태를 보여준다', async () => {
    vi.stubGlobal('fetch', routedFetch({ gross_revenue: 0, total_revenue: 0, total_net_revenue: 0 }));
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/api/crm/stats')) return Promise.resolve(crmStatsResponse({ gross_revenue: 0, total_revenue: 0, total_net_revenue: 0 }, []));
      if (url.includes('/api/business/global-sales')) return Promise.resolve(ok([]));
      return Promise.resolve(ok(null));
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<TotalOverviewPanel adminKey="admin-key" />);
    await waitFor(() => expect(screen.getByText('데이터가 없습니다.')).toBeTruthy());
  });
});
