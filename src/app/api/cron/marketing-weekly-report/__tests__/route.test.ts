// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const fetchWeeklyGoalRows = vi.hoisted(() => vi.fn());
vi.mock('@/lib/marketing-goals', () => ({ fetchWeeklyGoalRows }));

const SLACK_CHANNEL = 'C07L25RNWCX'; // 00_방향맞추기

let fetchMock: ReturnType<typeof vi.fn>;

function slackOk(ok = true, error?: string) {
  return vi.fn(async () => ({ json: async () => ({ ok, error }) }));
}

/** chat.postMessage 호출만 골라 { channel, text } 로 펼친다. */
function slackCalls() {
  return fetchMock.mock.calls
    .filter(([url]) => String(url).includes('chat.postMessage'))
    .map(([, init]) => JSON.parse(init.body as string) as { channel: string; text: string });
}

function makeReq(secret = 'cron-secret') {
  return new NextRequest('http://localhost/api/cron/marketing-weekly-report', {
    headers: { authorization: `Bearer ${secret}` },
  });
}

function goalRow() {
  return {
    week_start: '2026-08-24',
    week_end: '2026-08-30',
    week_label: '26년 08월 04주차',
    target: 20,
    actuals: {
      '네이버 SEO': 1, '구글 SEO': 6, META: 8, 소개: 3, B2B: 1, 미분류: 0,
    },
    actual_total: 19,
    achievement_rate: 95,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = 'cron-secret';
  process.env.SLACK_BOT_TOKEN = 'xoxb-test';
  fetchWeeklyGoalRows.mockResolvedValue([goalRow()]);
  fetchMock = slackOk();
  vi.stubGlobal('fetch', fetchMock);
  // 2026-08-31(월) 04:00 KST = 2026-08-30(일) 19:00 UTC — 크론 발사 시점
  vi.setSystemTime(new Date('2026-08-30T19:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// REQ-010: 월요일 04:00 KST 마케팅 슬랙 리포트
describe('GET /api/cron/marketing-weekly-report', () => {
  it('시크릿이 틀리면 401 이고 부작용이 없다', async () => {
    const { GET } = await import('../route');
    const res = await GET(makeReq('wrong'));

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fetchWeeklyGoalRows).not.toHaveBeenCalled();
  });

  it('직전 완료 주차를 집계해 방향맞추기 채널에 발송한다', async () => {
    const { GET } = await import('../route');
    const res = await GET(makeReq());

    expect(res.status).toBe(200);
    expect(fetchWeeklyGoalRows).toHaveBeenCalledWith(['2026-08-24']);

    const [call] = slackCalls();
    expect(call.channel).toBe(SLACK_CHANNEL);
    expect(call.text).toContain('*마케팅 주간 리드 · 26년 08월 04주차*');
    expect(call.text).toContain('목표 20개 / 실적 19개 (95%)');
    expect(call.text).toContain('META 8개 (42.1%)');
  });

  it('응답에 주차 정보를 담는다', async () => {
    const { GET } = await import('../route');
    const json = await (await GET(makeReq())).json();

    expect(json).toMatchObject({ sent: true, week: '26년 08월 04주차', from: '2026-08-24', to: '2026-08-30' });
  });

  it('슬랙 외 HTTP 호출을 하지 않는다 (자기호출 금지)', async () => {
    const { GET } = await import('../route');
    await GET(makeReq());

    const nonSlack = fetchMock.mock.calls.filter(([url]) => !String(url).includes('slack.com'));
    expect(nonSlack).toEqual([]);
  });

  it('SLACK_BOT_TOKEN 이 없으면 500 이고 발송하지 않는다', async () => {
    delete process.env.SLACK_BOT_TOKEN;
    const { GET } = await import('../route');
    const res = await GET(makeReq());

    expect(res.status).toBe(500);
    expect((await res.json()).reason).toBe('SLACK_TOKEN_MISSING');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('슬랙이 ok:false 면 500 SLACK_FAILED', async () => {
    fetchMock = slackOk(false, 'channel_not_found');
    vi.stubGlobal('fetch', fetchMock);
    const { GET } = await import('../route');
    const res = await GET(makeReq());

    expect(res.status).toBe(500);
    expect((await res.json()).reason).toBe('SLACK_FAILED');
  });

  it('집계 실패는 채널에 경고를 올리고 500 을 반환한다', async () => {
    fetchWeeklyGoalRows.mockRejectedValue(new Error('boom'));
    const { GET } = await import('../route');
    const res = await GET(makeReq());

    expect(res.status).toBe(500);
    expect((await res.json()).reason).toBe('GOALS_FAILED');

    const [alert] = slackCalls();
    expect(alert.channel).toBe(SLACK_CHANNEL);
    expect(alert.text).toContain(':warning:');
    expect(alert.text).toContain('boom');
  });

  it('집계 결과가 비면 경고를 올리고 500 을 반환한다', async () => {
    fetchWeeklyGoalRows.mockResolvedValue([]);
    const { GET } = await import('../route');
    const res = await GET(makeReq());

    expect(res.status).toBe(500);
    expect((await res.json()).reason).toBe('GOALS_FAILED');
  });

  it('CRON_SECRET 이 미설정이면 인증을 요구하지 않는다 (기존 크론과 동일)', async () => {
    delete process.env.CRON_SECRET;
    const { GET } = await import('../route');
    const res = await GET(
      new NextRequest('http://localhost/api/cron/marketing-weekly-report')
    );
    expect(res.status).toBe(200);
  });

  it('목표 미설정 주차도 실적만으로 발송한다', async () => {
    fetchWeeklyGoalRows.mockResolvedValue([
      {
        ...goalRow(),
        target: null,
        achievement_rate: null,
      },
    ]);
    const { GET } = await import('../route');
    const res = await GET(makeReq());

    expect(res.status).toBe(200);
    expect(slackCalls()[0].text).toContain('목표 미설정 / 실적 19개');
  });
});
