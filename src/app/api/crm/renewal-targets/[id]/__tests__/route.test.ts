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

/** 직전 쿼리에 전달된 update payload. */
function updatePayload(): Record<string, unknown> {
  return lastBuilder.update.mock.calls[0][0] as Record<string, unknown>;
}

const mockFrom = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: mockFrom },
}));

process.env.ADMIN_SECRET_KEY = 'admin-key';

const params = Promise.resolve({ id: 'rt-1' });

function makeReq(method: 'PATCH' | 'DELETE', body?: Record<string, unknown>, key = 'admin-key') {
  return new NextRequest('http://localhost/api/crm/renewal-targets/rt-1', {
    method,
    headers: { 'x-admin-key': key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const baseTarget = {
  id: 'rt-1',
  student_id: 's-1',
  week_start: '2026-08-10',
  stage: '2',
  stage_updated_at: '2026-08-10T00:00:00Z',
  converted_payment_id: null,
  drop_reason: null,
  created_by: null,
  created_at: '2026-08-10T00:00:00Z',
  updated_at: '2026-08-10T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PATCH /api/crm/renewal-targets/[id]', () => {
  it('rejects a wrong admin key → 401', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq('PATCH', { stage: '3' }, 'nope'), { params });
    expect(res.status).toBe(401);
  });

  it('updates stage and refreshes stage_updated_at → 200', async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder({
        data: { ...baseTarget, stage: '3', stage_updated_at: '2026-08-11T00:00:00Z' },
        error: null,
      })
    );
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq('PATCH', { stage: '3' }), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.stage).toBe('3');
  });

  it('stores converted_payment_id when stage is 4 → 200', async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder({
        data: { ...baseTarget, stage: '4', converted_payment_id: 'pay-1' },
        error: null,
      })
    );
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq('PATCH', { stage: '4', converted_payment_id: 'pay-1' }), {
      params,
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.converted_payment_id).toBe('pay-1');
  });

  it('stores drop_reason when stage is 5 (미전환) → 200', async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder({ data: { ...baseTarget, stage: '5', drop_reason: '예산' }, error: null })
    );
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq('PATCH', { stage: '5', drop_reason: '예산' }), { params });
    expect(res.status).toBe(200);
    expect(updatePayload().drop_reason).toBe('예산');
    const json = await res.json();
    expect(json.data.stage).toBe('5');
  });

  it('ignores drop_reason on non-terminal stages', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: { ...baseTarget, stage: '2' }, error: null }));
    const { PATCH } = await import('../route');
    await PATCH(makeReq('PATCH', { stage: '2', drop_reason: '예산' }), { params });
    expect(updatePayload()).not.toHaveProperty('drop_reason');
  });

  it('clears drop_reason when reopening a 미전환 target', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: { ...baseTarget, stage: '2' }, error: null }));
    const { PATCH } = await import('../route');
    await PATCH(makeReq('PATCH', { stage: '2', clear_drop_reason: true }), { params });
    expect(updatePayload().drop_reason).toBeNull();
  });

  it('joins the student so the response shape matches GET/POST → 200', async () => {
    mockFrom.mockReturnValueOnce(
      makeBuilder({
        data: { ...baseTarget, stage: '3', student: { id: 's-1', name: '김학생' } },
        error: null,
      })
    );
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq('PATCH', { stage: '3' }), { params });
    const json = await res.json();
    expect(json.data.student.name).toBe('김학생');
    expect(lastBuilder.select.mock.calls[0][0]).toContain('student:students(');
  });

  it('rejects an invalid stage → 400', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq('PATCH', { stage: '9' }), { params });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/crm/renewal-targets/[id]', () => {
  it('rejects a wrong admin key → 401', async () => {
    const { DELETE } = await import('../route');
    const res = await DELETE(makeReq('DELETE', undefined, 'nope'), { params });
    expect(res.status).toBe(401);
  });

  it('deletes the target and returns id → 200', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: [], error: null }));
    const { DELETE } = await import('../route');
    const res = await DELETE(makeReq('DELETE'), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.id).toBe('rt-1');
  });
});
