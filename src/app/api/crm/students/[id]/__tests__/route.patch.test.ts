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

/** select('stage_history').eq().single() 한 번의 응답을 지정한다. */
function currentHistoryResolves(row: { stage_history: unknown } | null) {
  mockSelect.mockReturnValueOnce({
    eq: vi.fn().mockReturnValueOnce({
      single: vi.fn().mockResolvedValueOnce({ data: row, error: null }),
    }),
  });
}

describe('PATCH /api/crm/students/[id] — stage_history 연속 중복 방지', () => {
  beforeEach(() => vi.clearAllMocks());

  const prior = (stage: string) => ({ stage, label: `단계 ${stage}`, entered_at: '2026-09-30T00:00:00Z' });

  // REQ-002
  it('직전과 같은 단계로 PATCH하면 stage_history를 쓰지 않는다', async () => {
    currentHistoryResolves({ stage_history: [prior('4'), prior('5a')] });
    updateResolves({ data: { id: 'stu-1' }, error: null });
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ funnel_stage: '5a' }), { params });

    expect(res.status).toBe(200);
    const payload = mockUpdate.mock.calls[0][0];
    expect(payload.funnel_stage).toBe('5a');
    expect(payload).not.toHaveProperty('stage_history');
  });

  // REQ-002
  it('다른 단계로 PATCH하면 이력에 1건 추가한다', async () => {
    currentHistoryResolves({ stage_history: [prior('4')] });
    updateResolves({ data: { id: 'stu-1' }, error: null });
    const { PATCH } = await import('../route');
    await PATCH(makeReq({ funnel_stage: '5a' }), { params });

    const history = mockUpdate.mock.calls[0][0].stage_history;
    expect(history.map((h: { stage: string }) => h.stage)).toEqual(['4', '5a']);
    expect(history[1].label).toBeTruthy();
  });

  // REQ-002
  it('이력이 없는 리드도 첫 항목이 기록된다', async () => {
    currentHistoryResolves(null);
    updateResolves({ data: { id: 'stu-1' }, error: null });
    const { PATCH } = await import('../route');
    await PATCH(makeReq({ funnel_stage: '2' }), { params });

    expect(mockUpdate.mock.calls[0][0].stage_history).toHaveLength(1);
  });
});
