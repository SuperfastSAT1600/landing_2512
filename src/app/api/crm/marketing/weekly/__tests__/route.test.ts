// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: mockFrom } }));

process.env.ADMIN_SECRET_KEY = 'admin-key';

type Row = Record<string, unknown>;

/**
 * 날짜 필터를 JS 에서 실제로 적용하는 스텁. students 테이블은 라우트가 세 번(이번 주 / 12주 / 작년)
 * 조회하므로 호출 순서에 의존하지 않도록 필터 인자로 응답을 결정한다.
 */
function filterBuilder(rows: Row[], field: string) {
  const bounds: { gte?: string; lte?: string; lt?: string } = {};
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.order = vi.fn(() => builder);
  builder.gte = vi.fn((f: string, v: string) => {
    if (f === field) bounds.gte = v;
    return builder;
  });
  builder.lte = vi.fn((f: string, v: string) => {
    if (f === field) bounds.lte = v;
    return builder;
  });
  builder.lt = vi.fn((f: string, v: string) => {
    if (f === field) bounds.lt = v;
    return builder;
  });
  builder.then = (resolve: (v: { data: Row[]; error: null }) => unknown) => {
    const data = rows.filter((r) => {
      const value = String(r[field] ?? '').slice(0, 10);
      if (bounds.gte && value < bounds.gte.slice(0, 10)) return false;
      if (bounds.lte && value > bounds.lte.slice(0, 10)) return false;
      if (bounds.lt && value >= bounds.lt.slice(0, 10)) return false;
      return true;
    });
    return Promise.resolve({ data, error: null }).then(resolve);
  };
  return builder;
}

function stub({
  students = [] as Row[],
  payments = [] as Row[],
  adSpend = [] as Row[],
  goals = [] as Row[],
}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'students') return filterBuilder(students, 'inquiry_date');
    if (table === 'payments') return filterBuilder(payments, 'paid_at');
    if (table === 'marketing_ad_spend') return filterBuilder(adSpend, 'date');
    if (table === 'marketing_weekly_goals') return filterBuilder(goals, 'week_start');
    throw new Error(`unexpected table: ${table}`);
  });
}

function req(key = 'admin-key') {
  return new NextRequest('http://localhost/api/crm/marketing/weekly', {
    headers: { 'x-admin-key': key },
  });
}

function lead(inquiryDate: string, source: string, over: Row = {}): Row {
  return {
    id: `s-${inquiryDate}-${source}`,
    name: `학생-${inquiryDate}`,
    funnel_stage: '1',
    stage_history: null,
    traffic_source: source,
    inquiry_date: inquiryDate,
    created_at: `${inquiryDate}T00:00:00Z`,
    retry_strategy_id: null,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // 2026-09-03(목) 18:00 KST → 36주차(2026-08-31 ~ 09-06), 4일 경과
  vi.setSystemTime(new Date('2026-09-03T09:00:00Z'));
});
afterEach(() => vi.useRealTimers());

// REQ-005: WEEKLY_TARGET 상수 제거 및 목표 연동
describe('GET /api/crm/marketing/weekly', () => {
  it('관리자 키가 없으면 401', async () => {
    const { GET } = await import('../route');
    expect((await GET(req('wrong'))).status).toBe(401);
  });

  it('WEEKLY_TARGET 상수를 export 하지 않는다', async () => {
    const mod = await import('../route');
    expect('WEEKLY_TARGET' in mod).toBe(false);
  });

  it('목표가 없으면 weekly_target 이 null 이다 (35 폴백 금지)', async () => {
    stub({ students: [lead('2026-09-01', '레딧')] });
    const { GET } = await import('../route');
    const { data } = await (await GET(req())).json();

    expect(data.weekly_target).toBeNull();
    expect(data.this_week_total).toBe(1);
  });

  it('소스별 목표는 응답에 두지 않는다 (목표는 주차 총합 1건)', async () => {
    stub({ goals: [{ week_start: '2026-08-31', target_count: 31 }] });
    const { GET } = await import('../route');
    const { data } = await (await GET(req())).json();

    expect(data.weekly_target).toBe(31);
    expect(data).not.toHaveProperty('weekly_goals');
  });

  it('다른 주차의 목표는 이번 주에 섞이지 않는다', async () => {
    stub({
      goals: [
        { week_start: '2026-08-24', target_count: 99 },
        { week_start: '2026-08-31', target_count: 31 },
      ],
    });
    const { GET } = await import('../route');
    const { data } = await (await GET(req())).json();

    expect(data.weekly_target).toBe(31);
  });

  it('목표가 0 이면 null 이 아니라 0 이다', async () => {
    stub({ goals: [{ week_start: '2026-08-31', target_count: 0 }] });
    const { GET } = await import('../route');
    const { data } = await (await GET(req())).json();

    expect(data.weekly_target).toBe(0);
  });

  it('주차 메타를 KST 기준으로 낸다', async () => {
    stub({});
    const { GET } = await import('../route');
    const { data } = await (await GET(req())).json();

    expect(data.week_label).toBe('26년 09월 01주차');
    expect(data.week_start).toBe('2026-08-31');
    expect(data.week_end).toBe('2026-09-06');
    expect(data.days_elapsed).toBe(4);
  });

  it('월요일 00:30 KST 에도 그 주를 이번 주로 잡는다', async () => {
    vi.setSystemTime(new Date('2026-09-06T15:30:00Z')); // 2026-09-07(월) 00:30 KST
    stub({});
    const { GET } = await import('../route');
    const { data } = await (await GET(req())).json();

    expect(data.week_start).toBe('2026-09-07');
    expect(data.week_label).toBe('26년 09월 02주차');
    expect(data.days_elapsed).toBe(1);
  });

  it('이번 주 리드를 채널별로 집계한다', async () => {
    stub({
      students: [
        lead('2026-08-31', '인스타그램 광고'),
        lead('2026-09-02', '인스타그램 오가닉'),
        lead('2026-09-03', '레딧'),
        lead('2026-08-24', '레딧'), // 지난주 — 제외
      ],
    });
    const { GET } = await import('../route');
    const { data } = await (await GET(req())).json();

    expect(data.this_week_total).toBe(3);
    expect(data.this_week['META']).toBe(2);
    expect(data.this_week['구글 SEO']).toBe(1);
  });

  it('12주 평균은 이번 주를 포함하지 않는다', async () => {
    stub({
      students: [
        lead('2026-09-01', '레딧'),
        lead('2026-08-24', '레딧'),
        lead('2026-08-17', '레딧'),
      ],
    });
    const { GET } = await import('../route');
    const { data } = await (await GET(req())).json();

    // 지난 12주에 구글 SEO 리드 2건 → 평균 0.2 (이번 주 1건은 제외)
    expect(data.hist_weekly_avg['구글 SEO']).toBeCloseTo(0.2, 5);
    expect(data.hist_weekly_avg_total).toBeCloseTo(0.2, 5);
  });
});
