// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import type { CrmStatsData } from '@/lib/crm-stats-service';

const SLACK_CHANNEL = 'C07L25RNWCX'; // 00_방향맞추기

const GLOBAL_ENTRIES = [
  { amount_usd: 500, payment_type: '최초결제' as const, sale_date: '2026-08-05' },
  { amount_usd: 300, payment_type: '재결제' as const, sale_date: '2026-08-08' },
  { amount_usd: 999, payment_type: '최초결제' as const, sale_date: '2026-08-20' }, // 주차 밖
];

const computeCrmStats = vi.fn();
const listGlobalSales = vi.fn();

vi.mock('@/lib/crm-stats-service', () => ({
  computeCrmStats: (...args: unknown[]) => computeCrmStats(...args),
}));
vi.mock('@/lib/global-sales-service', () => ({
  listGlobalSales: (...args: unknown[]) => listGlobalSales(...args),
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function overview(over: Record<string, number> = {}) {
  return {
    total_leads: 17, contacted: 8, contacted_base: 17, contact_rate: 47.06,
    paid: 4, conversion_rate: 50,
    gross_revenue: 33704000, total_refund: 0, total_revenue: 33704000, total_net_revenue: 30333600,
    first_payment_revenue: 15434000, repayment_revenue: 18270000,
    gross_count: 10, refund_count: 0, first_payment_count: 5, repayment_count: 5,
    ...over,
  };
}

/** computeCrmStats 성공 응답 — segment별로 리드 수를 달리 준다. */
function statsResult(segment: string) {
  const leadsBySeg: Record<string, number> = { all: 17, b2c: 15, b2b: 2 };
  return {
    ok: true as const,
    data: {
      period: { from: '2026-08-03', to: '2026-08-09' },
      overview: overview({ total_leads: leadsBySeg[segment] ?? 0 }),
      by_source: [
        { source: '인스타그램 광고', leads: 9 },
        { source: '소개', leads: 8 },
      ],
      monthly: [],
      weekly: [],
      stage_flow: [],
    } as unknown as CrmStatsData,
  };
}

function makeReq(secret = 'cron-secret') {
  return new NextRequest('https://tutoring.superfastsat.com/api/cron/weekly-business-report', {
    headers: { authorization: `Bearer ${secret}` },
  });
}

function slackCalls() {
  return fetchMock.mock.calls
    .filter(([url]) => String(url).includes('chat.postMessage'))
    .map(([, init]) => JSON.parse((init as RequestInit).body as string) as { channel: string; text: string });
}

function slackCall() {
  return slackCalls()[0] ?? null;
}

// 2026-08-10(월) 04:00 KST 로 시간 고정 → 직전 완결 주차 = 26년 08월 01주차
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-10T04:00:00+09:00'));
  process.env.CRON_SECRET = 'cron-secret';
  process.env.SLACK_BOT_TOKEN = 'xoxb-test';
  computeCrmStats.mockImplementation(({ segment }: { segment: string }) =>
    Promise.resolve(statsResult(segment)),
  );
  listGlobalSales.mockResolvedValue({ ok: true, data: GLOBAL_ENTRIES });
  fetchMock.mockImplementation(() =>
    Promise.resolve({ ok: true, json: async () => ({ ok: true }) }),
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GET /api/cron/weekly-business-report', () => {
  it('CRON_SECRET이 틀리면 401이고 아무것도 하지 않는다', async () => {
    const { GET } = await import('../route');

    const res = await GET(makeReq('wrong'));

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(computeCrmStats).not.toHaveBeenCalled();
  });

  it('직전 완결 주차 수치를 방향맞추기 채널로 발송한다', async () => {
    const { GET } = await import('../route');

    const res = await GET(makeReq());

    expect(res.status).toBe(200);
    const body = slackCall();
    expect(body).not.toBeNull();
    expect(body!.channel).toBe(SLACK_CHANNEL);
    expect(body!.text).toContain('26년 08월 01주차');
    expect(body!.text).toContain('2026-08-03 ~ 2026-08-09');
    expect(body!.text).toContain('*전체*');
    expect(body!.text).toContain('*한국비즈니스*');
    expect(body!.text).toContain('*B2C*');
    expect(body!.text).toContain('*B2B*');
    expect(body!.text).toContain('*글로벌*');
  });

  // REQ-001 — 이 크론이 자기 자신을 HTTP 호출하면 Vercel 크론 실행 시
  // origin이 SSO 보호된 배포 URL이 되어 조용히 STATS_FAILED로 죽는다.
  it('통계를 in-process로 집계한다 — 슬랙 외 HTTP 호출이 없다', async () => {
    const { GET } = await import('../route');

    await GET(makeReq());

    const nonSlack = fetchMock.mock.calls
      .map(([url]) => String(url))
      .filter((u) => !u.startsWith('https://slack.com/'));
    expect(nonSlack).toEqual([]);
  });

  it('all/b2c/b2b 세 세그먼트를 주차 범위로 집계한다', async () => {
    const { GET } = await import('../route');

    await GET(makeReq());

    expect(computeCrmStats).toHaveBeenCalledTimes(3);
    expect(computeCrmStats.mock.calls.map(([a]) => a.segment)).toEqual(['all', 'b2c', 'b2b']);
    for (const [arg] of computeCrmStats.mock.calls) {
      expect(arg.from).toBe('2026-08-03');
      expect(arg.to).toBe('2026-08-09');
    }
  });

  // REQ-002
  it('글로벌 매출을 주차 범위로 걸러 집계해 포함한다(주차 밖 항목 제외)', async () => {
    const { GET } = await import('../route');

    await GET(makeReq());

    expect(listGlobalSales).toHaveBeenCalledTimes(1);
    const body = slackCall();
    expect(body!.text).toContain('총매출 $800 (2건)');
    expect(body!.text).toContain('최초결제 $500 (1건) · 재결제 $300 (1건)');
  });

  it('글로벌 조회가 실패해도 리포트 발송은 막지 않고 0으로 대체한다', async () => {
    listGlobalSales.mockResolvedValue({ ok: false, message: 'db down' });
    const { GET } = await import('../route');

    const res = await GET(makeReq());

    expect(res.status).toBe(200);
    expect(slackCall()!.text).toContain('총매출 $0 (0건)');
  });

  // REQ-004 — 조용한 실패가 2주간 무증상 방치를 만들었다.
  it('통계 집계가 실패하면 실패 사유를 채널에 알리고 500을 반환한다', async () => {
    computeCrmStats.mockImplementation(({ segment }: { segment: string }) =>
      segment === 'b2b'
        ? Promise.resolve({ ok: false, code: 'FETCH_FAILED', message: 'payments timeout' })
        : Promise.resolve(statsResult(segment)),
    );
    const { GET } = await import('../route');

    const res = await GET(makeReq());

    expect(res.status).toBe(500);
    const alert = slackCall();
    expect(alert).not.toBeNull();
    expect(alert!.channel).toBe(SLACK_CHANNEL);
    expect(alert!.text).toContain('주간 비즈니스 현황');
    expect(alert!.text).toContain('payments timeout');
    // 실패 알림만 가고 리포트 본문은 가지 않는다
    expect(slackCalls().some((c) => c.text.includes('*한국비즈니스*'))).toBe(false);
  });

  it('집계가 예외를 던져도 채널에 알리고 500을 반환한다', async () => {
    computeCrmStats.mockRejectedValue(new Error('boom'));
    const { GET } = await import('../route');

    const res = await GET(makeReq());

    expect(res.status).toBe(500);
    expect(slackCall()!.text).toContain('boom');
  });

  it('SLACK_BOT_TOKEN이 없으면 발송하지 않고 500을 반환한다', async () => {
    delete process.env.SLACK_BOT_TOKEN;
    const { GET } = await import('../route');

    const res = await GET(makeReq());

    expect(res.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('슬랙 발송이 실패하면 500을 반환한다', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve({ ok: true, json: async () => ({ ok: false, error: 'not_in_channel' }) }),
    );
    const { GET } = await import('../route');

    const res = await GET(makeReq());

    expect(res.status).toBe(500);
    expect((await res.json()).reason).toBe('SLACK_FAILED');
  });
});
