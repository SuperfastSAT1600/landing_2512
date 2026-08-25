import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

let lastBuilder: Record<string, ReturnType<typeof vi.fn>>;

function makeBuilder(result: { data: unknown; error: null | { message: string } }) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'eq', 'in', 'insert', 'update', 'delete']) {
    builder[m] = vi.fn(() => builder);
  }
  builder.single = vi.fn(() => builder);
  builder.then = (resolve: (v: typeof result) => unknown) => Promise.resolve(result).then(resolve);
  lastBuilder = builder as Record<string, ReturnType<typeof vi.fn>>;
  return builder;
}

const mockFrom = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: mockFrom },
}));

process.env.ADMIN_SECRET_KEY = 'admin-key';

function makeReq(
  method: 'GET' | 'POST',
  body?: Record<string, unknown>,
  qs = '',
  key = 'admin-key'
) {
  return new NextRequest(`http://localhost/api/crm/renewal-targets${qs}`, {
    method,
    headers: { 'x-admin-key': key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const baseTarget = {
  id: 'rt-1',
  student_id: 's-1',
  week_start: '2026-08-10',
  stage: '1',
  stage_updated_at: '2026-08-10T00:00:00Z',
  converted_payment_id: null,
  created_by: null,
  created_at: '2026-08-10T00:00:00Z',
  updated_at: '2026-08-10T00:00:00Z',
  student: { id: 's-1', name: '김학생', grade: '11', parent_phone: '010-0000-0000', is_vip: false },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/crm/renewal-targets', () => {
  it('rejects a wrong admin key → 401', async () => {
    const { GET } = await import('../route');
    const res = await GET(makeReq('GET', undefined, '', 'nope'));
    expect(res.status).toBe(401);
  });

  it('returns list of renewal targets with joined students → 200', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: [baseTarget], error: null }));
    const { GET } = await import('../route');
    const res = await GET(makeReq('GET'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0].student?.name).toBe('김학생');
  });

  it('filters by week_start when query param is provided → 200', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: [baseTarget], error: null }));
    const { GET } = await import('../route');
    const res = await GET(makeReq('GET', undefined, '?week_start=2026-08-10'));
    expect(res.status).toBe(200);
    expect(lastBuilder.eq).toHaveBeenCalledWith('week_start', '2026-08-10');
    const json = await res.json();
    expect(json.data).toHaveLength(1);
  });

  it('restricts to open stages when scope=open → 200', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: [baseTarget], error: null }));
    const { GET } = await import('../route');
    const res = await GET(makeReq('GET', undefined, '?scope=open'));
    expect(res.status).toBe(200);
    expect(lastBuilder.in).toHaveBeenCalledWith('stage', ['1', '2', '3']);
  });

  it('does not restrict stages without scope=open → 200', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: [baseTarget], error: null }));
    const { GET } = await import('../route');
    await GET(makeReq('GET'));
    expect(lastBuilder.in).not.toHaveBeenCalled();
  });
});

describe('POST /api/crm/renewal-targets', () => {
  it('rejects a wrong admin key → 401', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq('POST', { student_id: 's-1' }, '', 'nope'));
    expect(res.status).toBe(401);
  });

  it('creates a new target at stage 1 for current week → 201', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: [], error: null })) // open-target guard
      .mockReturnValueOnce(
        makeBuilder({
          data: { ...baseTarget, stage: '1', week_start: expect.any(String) },
          error: null,
        })
      );
    const { POST } = await import('../route');
    const res = await POST(makeReq('POST', { student_id: 's-1' }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.stage).toBe('1');
  });

  it('returns 409 when an open target already exists for the student', async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder({ data: [{ id: 'rt-existing', stage: '2' }], error: null })
    );
    const { POST } = await import('../route');
    const res = await POST(makeReq('POST', { student_id: 's-1' }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error.code).toBe('ALREADY_OPEN');
  });

  it('returns 400 when student_id is missing', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq('POST', {}));
    expect(res.status).toBe(400);
  });
});
