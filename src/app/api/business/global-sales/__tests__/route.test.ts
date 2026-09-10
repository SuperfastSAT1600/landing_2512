// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFrom = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: mockFrom } }));

process.env.ADMIN_SECRET_KEY = 'admin-key';

type Result = { data: unknown; error: null | { message: string } };

function makeBuilder(result: Result) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'insert', 'order']) builder[m] = vi.fn(() => builder);
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (v: Result) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

function row(over: Record<string, unknown> = {}) {
  return {
    id: 'g-1',
    student_name: '김글로벌',
    payment_type: '최초결제',
    amount_usd: 500,
    sale_date: '2026-08-11',
    created_at: '2026-08-11T00:00:00Z',
    billing_type: '일회성',
    ...over,
  };
}

function getReq(key = 'admin-key') {
  return new NextRequest('http://localhost/api/business/global-sales', { headers: { 'x-admin-key': key } });
}
function postReq(body: unknown, key = 'admin-key') {
  return new NextRequest('http://localhost/api/business/global-sales', {
    method: 'POST',
    headers: { 'x-admin-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/business/global-sales', () => {
  it('잘못된 admin key → 401', async () => {
    const { GET } = await import('../route');
    expect((await GET(getReq('nope'))).status).toBe(401);
  });

  it('sale_date 내림차순 목록을 반환한다', async () => {
    const builder = makeBuilder({ data: [row(), row({ id: 'g-2' })], error: null });
    mockFrom.mockReturnValue(builder);

    const { GET } = await import('../route');
    const res = await GET(getReq());
    expect(res.status).toBe(200);
    const { data } = await res.json();
    expect(data).toHaveLength(2);
    expect(builder.order).toHaveBeenCalledWith('sale_date', { ascending: false });
  });

  it('DB 오류 → 500', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'boom' } }));
    const { GET } = await import('../route');
    expect((await GET(getReq())).status).toBe(500);
  });

  it('billing_type이 비어 있으면 일회성으로 채워 내려준다(마이그레이션 이전 행)', async () => {
    const legacy = row();
    delete (legacy as Record<string, unknown>).billing_type;
    mockFrom.mockReturnValue(makeBuilder({ data: [legacy], error: null }));

    const { GET } = await import('../route');
    const { data } = await (await GET(getReq())).json();
    expect(data[0].billing_type).toBe('일회성');
  });
});

describe('POST /api/business/global-sales', () => {
  it('잘못된 admin key → 401', async () => {
    const { POST } = await import('../route');
    expect((await POST(postReq({}, 'nope'))).status).toBe(401);
  });

  it('student_name 누락 → 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(postReq({ payment_type: '최초결제', amount_usd: 100, sale_date: '2026-08-11' }));
    expect(res.status).toBe(400);
  });

  it('payment_type이 최초결제/재결제가 아니면 → 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(
      postReq({ student_name: '김글로벌', payment_type: '부분결제', amount_usd: 100, sale_date: '2026-08-11' }),
    );
    expect(res.status).toBe(400);
  });

  it('amount_usd가 0 이하면 → 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(
      postReq({ student_name: '김글로벌', payment_type: '최초결제', amount_usd: 0, sale_date: '2026-08-11' }),
    );
    expect(res.status).toBe(400);
  });

  it('sale_date 누락 → 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(postReq({ student_name: '김글로벌', payment_type: '최초결제', amount_usd: 100 }));
    expect(res.status).toBe(400);
  });

  it('정상 생성 → 201', async () => {
    const builder = makeBuilder({ data: row(), error: null });
    mockFrom.mockReturnValue(builder);

    const { POST } = await import('../route');
    const res = await POST(
      postReq({ student_name: '  김글로벌  ', payment_type: '최초결제', amount_usd: 500, sale_date: '2026-08-11' }),
    );
    expect(res.status).toBe(201);
    expect(builder.insert).toHaveBeenCalledWith({
      student_name: '김글로벌',
      payment_type: '최초결제',
      amount_usd: 500,
      sale_date: '2026-08-11',
      country_code: null,
      billing_type: '일회성',
    });
  });

  it('billing_type을 저장한다', async () => {
    const builder = makeBuilder({ data: row({ billing_type: '구독' }), error: null });
    mockFrom.mockReturnValue(builder);

    const { POST } = await import('../route');
    const res = await POST(
      postReq({
        student_name: '김글로벌',
        payment_type: '최초결제',
        amount_usd: 500,
        sale_date: '2026-08-11',
        billing_type: '구독',
      }),
    );
    expect(res.status).toBe(201);
    expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({ billing_type: '구독' }));
  });

  it('알 수 없는 billing_type → 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(
      postReq({
        student_name: '김글로벌',
        payment_type: '최초결제',
        amount_usd: 500,
        sale_date: '2026-08-11',
        billing_type: '월정액',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('country_code를 대문자로 정규화해 저장한다', async () => {
    const builder = makeBuilder({ data: row({ country_code: 'PK' }), error: null });
    mockFrom.mockReturnValue(builder);

    const { POST } = await import('../route');
    const res = await POST(
      postReq({
        student_name: '김글로벌',
        payment_type: '최초결제',
        amount_usd: 500,
        sale_date: '2026-08-11',
        country_code: ' pk ',
      }),
    );
    expect(res.status).toBe(201);
    expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({ country_code: 'PK' }));
  });

  it('존재하지 않는 country_code → 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(
      postReq({
        student_name: '김글로벌',
        payment_type: '최초결제',
        amount_usd: 500,
        sale_date: '2026-08-11',
        country_code: 'ZZ',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('DB 오류 → 500', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'boom' } }));
    const { POST } = await import('../route');
    const res = await POST(
      postReq({ student_name: '김글로벌', payment_type: '최초결제', amount_usd: 500, sale_date: '2026-08-11' }),
    );
    expect(res.status).toBe(500);
  });
});
