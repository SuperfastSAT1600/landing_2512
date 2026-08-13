// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';

const SLACK_CHANNEL = 'C07L25RNWCX'; // 00_방향맞추기
const STATS_URL = 'https://tutoring.superfastsat.com/api/crm/stats';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function overview(over: Record<string, number> = {}) {
  return {
    total_leads: 17, contacted: 8, contact_rate: 47.06, paid: 4, conversion_rate: 50,
    gross_revenue: 33704000, total_refund: 0, total_revenue: 33704000, total_net_revenue: 30333600,
    first_payment_revenue: 15434000, repayment_revenue: 18270000,
    gross_count: 10, refund_count: 0, first_payment_count: 5, repayment_count: 5,
    ...over,
  };
}

/** stats 응답 mock — segment 파라미터별로 리드 수를 달리 준다. */
function statsResponse(url: string) {
  const seg = new URL(url).searchParams.get('segment');
  const leadsBySeg: Record<string, number> = { all: 17, b2c: 15, b2b: 2 };
  return {
    ok: true,
    json: async () => ({
      data: {
        overview: overview({ total_leads: leadsBySeg[seg ?? 'all'] ?? 0 }),
        by_source: [
          { source: '인스타그램 광고', leads: 9 },
          { source: '소개', leads: 8 },
        ],
      },
    }),
  };
}

function makeReq(secret = 'cron-secret') {
  return new NextRequest('https://tutoring.superfastsat.com/api/cron/weekly-business-report', {
    headers: { authorization: `Bearer ${secret}` },
  });
}

function slackCall() {
  const call = fetchMock.mock.calls.find(([url]) => String(url).includes('chat.postMessage'));
  if (!call) return null;
  return JSON.parse((call[1] as RequestInit).body as string) as { channel: string; text: string };
}

// 2026-08-10(월) 04:00 KST 로 시간 고정 → 직전 완결 주차 = 26년 08월 01주차
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-10T04:00:00+09:00'));
  process.env.CRON_SECRET = 'cron-secret';
  process.env.ADMIN_SECRET_KEY = 'admin-key';
  process.env.SLACK_BOT_TOKEN = 'xoxb-test';
  fetchMock.mockImplementation((url: string) =>
    String(url).includes('chat.postMessage')
      ? Promise.resolve({ ok: true, json: async () => ({ ok: true }) })
      : Promise.resolve(statsResponse(String(url))),
  );
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GET /api/cron/weekly-business-report (REQ-005)', () => {
  it('CRON_SECRET이 틀리면 401이고 아무것도 발송하지 않는다', async () => {
    const { GET } = await import('../route');

    const res = await GET(makeReq('wrong'));

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
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
    expect(body!.text).toContain('*B2C*');
    expect(body!.text).toContain('*B2B*');
  });

  it('stats를 all/b2c/b2b 3개 세그먼트로 조회한다', async () => {
    const { GET } = await import('../route');

    await GET(makeReq());

    const statsCalls = fetchMock.mock.calls
      .map(([url]) => String(url))
      .filter((u) => u.startsWith(STATS_URL));
    expect(statsCalls).toHaveLength(3);
    const segments = statsCalls.map((u) => new URL(u).searchParams.get('segment'));
    expect(segments).toEqual(['all', 'b2c', 'b2b']);
    for (const u of statsCalls) {
      const sp = new URL(u).searchParams;
      expect(sp.get('from')).toBe('2026-08-03');
      expect(sp.get('to')).toBe('2026-08-09');
    }
  });

  it('stats 호출에 admin key 헤더를 붙인다', async () => {
    const { GET } = await import('../route');

    await GET(makeReq());

    const [, init] = fetchMock.mock.calls.find(([u]) => String(u).startsWith(STATS_URL))!;
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['x-admin-key']).toBe('admin-key');
  });

  it('stats 조회가 실패하면 발송하지 않고 이유를 반환한다', async () => {
    fetchMock.mockImplementation((url: string) =>
      String(url).includes('chat.postMessage')
        ? Promise.resolve({ ok: true, json: async () => ({ ok: true }) })
        : Promise.resolve({ ok: false, status: 500, json: async () => ({}) }),
    );
    const { GET } = await import('../route');

    const res = await GET(makeReq());

    expect(res.status).toBe(200);
    expect(slackCall()).toBeNull();
    expect((await res.json()).sent).toBe(false);
  });

  it('SLACK_BOT_TOKEN이 없으면 발송하지 않는다', async () => {
    delete process.env.SLACK_BOT_TOKEN;
    const { GET } = await import('../route');

    const res = await GET(makeReq());

    expect(res.status).toBe(200);
    expect(slackCall()).toBeNull();
    expect((await res.json()).sent).toBe(false);
  });
});

describe('vercel.json cron 등록 (REQ-006)', () => {
  it('월요일 04:00 KST(= 일요일 19:00 UTC) 스케줄로 등록되어 있다', () => {
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
      crons: { path: string; schedule: string }[];
    };
    const cron = vercel.crons.find((c) => c.path === '/api/cron/weekly-business-report');
    expect(cron).toBeDefined();
    expect(cron!.schedule).toBe('0 19 * * 0');
  });

  it('기존 diagnosis-expiry 크론을 그대로 유지한다', () => {
    const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
      crons: { path: string; schedule: string }[];
    };
    const cron = vercel.crons.find((c) => c.path === '/api/cron/diagnosis-expiry');
    expect(cron).toBeDefined();
    expect(cron!.schedule).toBe('0 0 * * *');
  });
});
