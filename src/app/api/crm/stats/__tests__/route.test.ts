import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * students / companies / payments 조회를 테이블별로 mock 한다.
 * 라우트는 체이닝(select→is/gte/lte/eq/not/order/limit) 후 await 하므로
 * 각 빌더는 자기 자신을 반환하면서 thenable 로 동작해야 한다.
 */
type Row = Record<string, unknown>;
const tableRows: Record<string, Row[]> = { students: [], companies: [], payments: [] };
const appliedFilters: Record<string, [string, ...unknown[]][]> = {
  students: [],
  companies: [],
  payments: [],
};

function makeBuilder(table: string) {
  const rows = () => tableRows[table] ?? [];
  const record = (op: string, ...args: unknown[]) => {
    (appliedFilters[table] ??= []).push([op, ...args]);
  };
  const builder: Record<string, unknown> = {
    then: (resolve: (v: { data: Row[]; error: null }) => unknown) =>
      Promise.resolve({ data: rows(), error: null }).then(resolve),
  };
  for (const op of ['select', 'is', 'not', 'gte', 'lte', 'eq', 'order', 'limit']) {
    builder[op] = (...args: unknown[]) => {
      record(op, ...args);
      return builder;
    };
  }
  return builder;
}

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: (table: string) => makeBuilder(table) },
}));

process.env.ADMIN_SECRET_KEY = 'admin-key';

const COMPANY_IMPLIED = 'company-implied';
const COMPANY_PLAIN = 'company-plain';

function makeReq(from = '2026-07-27', to = '2026-08-02', key = 'admin-key', segment?: string) {
  const qs = new URLSearchParams({ from, to });
  if (segment != null) qs.set('segment', segment);
  return new NextRequest(`http://localhost/api/crm/stats?${qs.toString()}`, {
    headers: { 'x-admin-key': key },
  });
}

async function callRoute(segment?: string) {
  const { GET } = await import('../route');
  const res = await GET(makeReq('2026-07-27', '2026-08-02', 'admin-key', segment));
  return res;
}

function student(over: Row): Row {
  return {
    id: 'x',
    name: '학생',
    funnel_stage: '1',
    funnel_stage_updated_at: null,
    stage_history: [],
    lead_status: 'active',
    traffic_source: '인스타그램 광고',
    inquiry_date: '2026-07-30T10:00:00',
    created_at: '2026-07-30T01:00:00Z',
    first_message_sent_at: null,
    retry_strategy_id: null,
    company_id: null,
    ...over,
  };
}

function payment(over: Row): Row {
  return {
    student_id: 'x',
    student_name: '학생',
    amount: 0,
    payment_type: '최초결제',
    paid_at: '2026-07-30T10:00:00+09:00',
    tax_type: '면세',
    students: [{ company_id: null }],
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  tableRows.students = [];
  tableRows.payments = [];
  tableRows.companies = [
    { id: COMPANY_IMPLIED, name: '공부하는 아이들', is_active: true },
    { id: COMPANY_PLAIN, name: '일반 업체', is_active: true },
  ];
  appliedFilters.students = [];
  appliedFilters.companies = [];
  appliedFilters.payments = [];
});

describe('GET /api/crm/stats — B2B 리드 합산 (REQ-001)', () => {
  it('company_id 있는 B2B 리드도 신규 리드로 센다', async () => {
    tableRows.students = [
      student({ id: 'b2c-1', name: '김우찬' }),
      student({ id: 'b2b-1', name: '이도윤', company_id: COMPANY_PLAIN, traffic_source: 'B2B 파트너' }),
    ];

    const data = (await (await callRoute()).json()).data;

    expect(data.overview.total_leads).toBe(2);
  });

  it('students 조회에 업체 제외 필터(is company_id null)를 걸지 않는다', async () => {
    tableRows.students = [student({ id: 'b2c-1' })];

    await callRoute();

    const isFilters = appliedFilters.students.filter(([op]) => op === 'is');
    expect(isFilters).toEqual([]);
  });

  it('by_source에 B2B 파트너 채널이 집계된다', async () => {
    tableRows.students = [
      student({ id: 'b2c-1', name: '김우찬' }),
      student({ id: 'b2b-1', name: '이도윤', company_id: COMPANY_PLAIN, traffic_source: 'B2B 파트너' }),
    ];

    const data = (await (await callRoute()).json()).data;

    const b2b = data.by_source.find((r: { source: string }) => r.source === 'B2B 파트너');
    expect(b2b).toBeDefined();
    expect(b2b.leads).toBe(1);
  });
});

describe('GET /api/crm/stats — 센터형 파트너 컨택 판정 (REQ-002)', () => {
  it('센터형 파트너 소속 리드는 1단계여도 컨택 성공으로 센다', async () => {
    tableRows.students = [
      student({ id: 'b2b-1', name: '이도윤', company_id: COMPANY_IMPLIED, funnel_stage: '1' }),
    ];

    const data = (await (await callRoute()).json()).data;

    expect(data.overview.contacted).toBe(1);
    expect(data.overview.contacted_base).toBe(1);
  });

  it('일반 리드는 1단계면 컨택 성공에서 제외한다', async () => {
    tableRows.students = [
      student({ id: 'b2c-1', funnel_stage: '1' }),
      student({ id: 'b2b-plain', company_id: COMPANY_PLAIN, funnel_stage: '1' }),
    ];

    const data = (await (await callRoute()).json()).data;

    expect(data.overview.contacted).toBe(0);
  });

  it('2단계 이상 도달한 리드는 업체 무관하게 컨택 성공이다', async () => {
    tableRows.students = [
      student({ id: 'b2c-1', funnel_stage: '4' }),
      student({ id: 'b2b-plain', company_id: COMPANY_PLAIN, funnel_stage: '8' }),
    ];

    const data = (await (await callRoute()).json()).data;

    expect(data.overview.contacted).toBe(2);
  });
});

describe('GET /api/crm/stats — segment 필터 (REQ-004)', () => {
  it('잘못된 segment는 400 INVALID_SEGMENT를 반환한다', async () => {
    const res = await callRoute('foo');

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('INVALID_SEGMENT');
  });

  it('segment=all이면 students 조회에 company_id 필터를 추가하지 않는다', async () => {
    tableRows.students = [student({ id: 'b2c-1' })];

    await callRoute('all');

    const companyIdFilters = appliedFilters.students.filter(
      ([op, col]) => (op === 'is' || op === 'not') && col === 'company_id',
    );
    expect(companyIdFilters).toEqual([]);
  });

  it('segment=b2c면 students 조회에 .is(company_id, null) 필터를 추가한다', async () => {
    tableRows.students = [student({ id: 'b2c-1' })];

    await callRoute('b2c');

    expect(appliedFilters.students).toContainEqual(['is', 'company_id', null]);
  });

  it('segment=b2b면 students 조회에 .not(company_id, is, null) 필터를 추가한다', async () => {
    tableRows.students = [student({ id: 'b2b-1', company_id: COMPANY_PLAIN })];

    await callRoute('b2b');

    expect(appliedFilters.students).toContainEqual(['not', 'company_id', 'is', null]);
  });

  it('segment=b2c일 때 B2C 리드만 집계한다', async () => {
    tableRows.students = [student({ id: 'b2c-1', name: '김B2C' })];

    const data = (await (await callRoute('b2c')).json()).data;

    expect(data.overview.total_leads).toBe(1);
  });

  it('segment=b2b일 때 B2B 리드만 집계한다', async () => {
    tableRows.students = [
      student({ id: 'b2b-1', name: '이B2B', company_id: COMPANY_PLAIN, traffic_source: 'B2B 파트너' }),
    ];

    const data = (await (await callRoute('b2b')).json()).data;

    expect(data.overview.total_leads).toBe(1);
    expect(data.by_source.find((r: { source: string }) => r.source === 'B2B 파트너')?.leads).toBe(1);
  });

  it('segment=b2c일 때 B2C 학생의 결제만 매출에 포함한다', async () => {
    tableRows.students = [
      student({ id: 'b2c-1', name: '김B2C' }),
      student({ id: 'b2b-1', name: '이B2B', company_id: COMPANY_PLAIN }),
    ];
    tableRows.payments = [
      payment({ student_id: 'b2c-1', student_name: '김B2C', amount: 100000, students: [{ company_id: null }] }),
      payment({ student_id: 'b2b-1', student_name: '이B2B', amount: 200000, students: [{ company_id: COMPANY_PLAIN }] }),
    ];

    const data = (await (await callRoute('b2c')).json()).data;

    expect(data.overview.gross_revenue).toBe(100000);
  });

  it('segment=b2b일 때 B2B 학생의 결제만 매출에 포함한다', async () => {
    tableRows.students = [
      student({ id: 'b2c-1', name: '김B2C' }),
      student({ id: 'b2b-1', name: '이B2B', company_id: COMPANY_PLAIN }),
    ];
    tableRows.payments = [
      payment({ student_id: 'b2c-1', student_name: '김B2C', amount: 100000, students: [{ company_id: null }] }),
      payment({ student_id: 'b2b-1', student_name: '이B2B', amount: 200000, students: [{ company_id: COMPANY_PLAIN }] }),
    ];

    const data = (await (await callRoute('b2b')).json()).data;

    expect(data.overview.gross_revenue).toBe(200000);
  });

  it('B2C 학생이 문의일(inquiry_date)이 없어도 해당 학생의 결제는 segment=b2c에 포함된다', async () => {
    tableRows.students = [
      student({ id: 'b2c-null-inquiry', name: '김우솔', inquiry_date: null, created_at: '2026-05-28T03:30:11Z' }),
    ];
    tableRows.payments = [
      payment({
        student_id: 'b2c-null-inquiry',
        student_name: '김우솔',
        amount: -1429525,
        payment_type: '환불',
        students: [{ company_id: null }],
      }),
    ];

    const data = (await (await callRoute('b2c')).json()).data;

    expect(data.overview.total_refund).toBe(-1429525);
  });
});
