import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFrom = vi.fn();
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: (t: string) => mockFrom(t) } }));

process.env.ADMIN_SECRET_KEY = 'admin-key';
const params = Promise.resolve({ id: 's1' });

function req(method: string, body?: unknown, key = 'admin-key') {
  return new NextRequest('http://localhost/api/crm/students/s1/exam-scores', {
    method,
    headers: { 'x-admin-key': key, 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

/** select().eq().order() 체인이 rows 를 돌려주도록 만든다. */
function selectReturns(rows: unknown[]) {
  mockFrom.mockReturnValueOnce({
    select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: rows, error: null }) }) }),
  });
}

/** insert().select().single() 체인. */
function insertReturns(row: unknown, error: unknown = null) {
  const insert = vi.fn(() => ({ select: () => ({ single: () => Promise.resolve({ data: row, error }) }) }));
  mockFrom.mockReturnValueOnce({ insert });
  return insert;
}

const VALID = { exam_month: '2026-08', rw_score: 710, math_score: 780 };

describe('GET /api/crm/students/[id]/exam-scores', () => {
  beforeEach(() => vi.clearAllMocks());

  it('인증이 없으면 401', async () => {
    const { GET } = await import('../route');
    expect((await GET(req('GET', undefined, 'bad'), { params })).status).toBe(401);
  });

  it('시험월 내림차순으로 목록을 준다', async () => {
    selectReturns([{ id: 'e1', exam_month: '2026-08' }]);
    const { GET } = await import('../route');
    const res = await GET(req('GET'), { params });
    expect(res.status).toBe(200);
    expect((await res.json()).data).toHaveLength(1);
  });
});

describe('POST /api/crm/students/[id]/exam-scores', () => {
  beforeEach(() => vi.clearAllMocks());

  it('인증이 없으면 401', async () => {
    const { POST } = await import('../route');
    expect((await POST(req('POST', VALID, 'bad'), { params })).status).toBe(401);
  });

  it('시험월과 점수를 기록한다', async () => {
    const insert = insertReturns({ id: 'e1', ...VALID });
    const { POST } = await import('../route');
    const res = await POST(req('POST', { ...VALID, created_by: '이민재' }), { params });

    expect(res.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: 's1',
        exam_month: '2026-08',
        rw_score: 710,
        math_score: 780,
        created_by: '이민재',
      })
    );
  });

  it('RW 만 알아도 기록된다', async () => {
    const insert = insertReturns({ id: 'e2' });
    const { POST } = await import('../route');
    const res = await POST(req('POST', { exam_month: '2026-08', rw_score: 710 }), { params });
    expect(res.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ rw_score: 710, math_score: null })
    );
  });

  it('잘못된 시험월은 400', async () => {
    const { POST } = await import('../route');
    for (const m of ['2026-13', '26-08', '2026-08-15']) {
      const res = await POST(req('POST', { ...VALID, exam_month: m }), { params });
      expect(res.status).toBe(400);
    }
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('범위를 벗어난 점수는 400', async () => {
    const { POST } = await import('../route');
    expect((await POST(req('POST', { ...VALID, rw_score: 810 }), { params })).status).toBe(400);
    expect((await POST(req('POST', { ...VALID, math_score: 715 }), { params })).status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('RW·Math 가 둘 다 없으면 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(req('POST', { exam_month: '2026-08' }), { params });
    expect(res.status).toBe(400);
  });

  it('같은 시험월이 이미 있으면 409', async () => {
    insertReturns(null, { code: '23505', message: 'duplicate key' });
    const { POST } = await import('../route');
    const res = await POST(req('POST', VALID), { params });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/이미/);
  });
});
