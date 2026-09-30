import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockUpdate = vi.fn();
const mockSelect = vi.fn();

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: vi.fn(() => ({ update: mockUpdate, select: mockSelect })) },
}));

vi.mock('@/lib/embedding', () => ({
  generateEmbedding: vi.fn(async () => [0]),
  buildEmbeddingText: vi.fn(() => 'text'),
}));

process.env.ADMIN_SECRET_KEY = 'admin-key';

const params = Promise.resolve({ id: 'stu-1' });

function makeReq(body: Record<string, unknown>, key = 'admin-key') {
  return new NextRequest('http://localhost/api/crm/students/stu-1', {
    method: 'PATCH',
    headers: { 'x-admin-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** update().eq().select().maybeSingle() 한 번의 응답을 지정한다. */
function updateResolves(result: { data: unknown; error: unknown }) {
  mockUpdate.mockReturnValueOnce({
    eq: vi.fn().mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        maybeSingle: vi.fn().mockResolvedValueOnce(result),
      }),
    }),
  });
}

describe('PATCH /api/crm/students/[id] — 삭제된 리드 처리', () => {
  beforeEach(() => vi.clearAllMocks());

  // REQ-001
  it('갱신된 행이 없으면 404와 STUDENT_NOT_FOUND를 반환한다', async () => {
    updateResolves({ data: null, error: null });
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ name: '새 이름' }), { params });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error.code).toBe('STUDENT_NOT_FOUND');
    expect(json.error.message).toContain('삭제된 리드');
  });

  // REQ-004 — PostgREST 원문이 사용자에게 노출되지 않는다
  it('0행 응답에 PostgREST 원문을 담지 않는다', async () => {
    updateResolves({ data: null, error: null });
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ name: '새 이름' }), { params });

    expect(JSON.stringify(await res.json())).not.toContain('coerce');
  });

  // REQ-001 — 정상 경로 회귀 방지
  it('정상 갱신이면 200과 갱신된 행을 반환한다', async () => {
    updateResolves({ data: { id: 'stu-1', name: '새 이름' }, error: null });
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ name: '새 이름' }), { params });

    expect(res.status).toBe(200);
    expect((await res.json()).data.name).toBe('새 이름');
    expect(mockUpdate).toHaveBeenCalledWith({ name: '새 이름' });
  });

  // REQ-001 — 진짜 DB 오류는 계속 500
  it('DB 오류는 500으로 유지한다', async () => {
    updateResolves({
      data: null,
      error: { message: 'permission denied', code: '42501', details: null },
    });
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ name: '새 이름' }), { params });

    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe('42501');
  });
});
