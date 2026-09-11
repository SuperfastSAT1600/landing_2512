import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFrom = vi.fn();
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: (t: string) => mockFrom(t) } }));

process.env.ADMIN_SECRET_KEY = 'admin-key';
const params = Promise.resolve({ id: 'e1' });

function req(method: string, body?: unknown, key = 'admin-key') {
  return new NextRequest('http://localhost/api/crm/exam-scores/e1', {
    method,
    headers: { 'x-admin-key': key, 'content-type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function updateReturns(row: unknown, error: unknown = null) {
  const update = vi.fn((_patch: Record<string, unknown>) => ({
    eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: row, error }) }) }),
  }));
  mockFrom.mockReturnValueOnce({ update });
  return update;
}

function deleteReturns(error: unknown = null) {
  const del = vi.fn(() => ({ eq: () => Promise.resolve({ error }) }));
  mockFrom.mockReturnValueOnce({ delete: del });
  return del;
}

describe('PATCH /api/crm/exam-scores/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('인증이 없으면 401', async () => {
    const { PATCH } = await import('../route');
    expect((await PATCH(req('PATCH', { rw_score: 720 }, 'bad'), { params })).status).toBe(401);
  });

  it('RW 만 부분 수정한다', async () => {
    const update = updateReturns({ id: 'e1', rw_score: 720 });
    const { PATCH } = await import('../route');
    const res = await PATCH(req('PATCH', { rw_score: 720 }), { params });

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ rw_score: 720 }));
    expect(update.mock.calls[0][0]).not.toHaveProperty('math_score');
  });

  it('점수를 비우는 것도 반영한다', async () => {
    const update = updateReturns({ id: 'e1', math_score: null });
    const { PATCH } = await import('../route');
    await PATCH(req('PATCH', { math_score: null }), { params });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ math_score: null }));
  });

  it('시험월도 고칠 수 있다', async () => {
    const update = updateReturns({ id: 'e1', exam_month: '2026-10' });
    const { PATCH } = await import('../route');
    expect((await PATCH(req('PATCH', { exam_month: '2026-10' }), { params })).status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ exam_month: '2026-10' }));
  });

  it('잘못된 값은 400', async () => {
    const { PATCH } = await import('../route');
    expect((await PATCH(req('PATCH', { rw_score: 815 }), { params })).status).toBe(400);
    expect((await PATCH(req('PATCH', { exam_month: '2026-13' }), { params })).status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('바꿀 필드가 없으면 400', async () => {
    const { PATCH } = await import('../route');
    expect((await PATCH(req('PATCH', {}), { params })).status).toBe(400);
  });

  it('없는 기록이면 404', async () => {
    updateReturns(null, { code: 'PGRST116', message: 'no rows' });
    const { PATCH } = await import('../route');
    expect((await PATCH(req('PATCH', { rw_score: 720 }), { params })).status).toBe(404);
  });

  it('같은 시험월로 바꾸면 409', async () => {
    updateReturns(null, { code: '23505', message: 'duplicate key' });
    const { PATCH } = await import('../route');
    expect((await PATCH(req('PATCH', { exam_month: '2026-10' }), { params })).status).toBe(409);
  });
});

describe('DELETE /api/crm/exam-scores/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('인증이 없으면 401', async () => {
    const { DELETE } = await import('../route');
    expect((await DELETE(req('DELETE', undefined, 'bad'), { params })).status).toBe(401);
  });

  it('기록을 지운다', async () => {
    const del = deleteReturns();
    const { DELETE } = await import('../route');
    expect((await DELETE(req('DELETE'), { params })).status).toBe(200);
    expect(del).toHaveBeenCalled();
  });

  it('삭제 실패는 500', async () => {
    deleteReturns({ message: 'boom' });
    const { DELETE } = await import('../route');
    expect((await DELETE(req('DELETE'), { params })).status).toBe(500);
  });
});
