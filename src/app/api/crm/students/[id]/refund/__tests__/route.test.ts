import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({ select: mockSelect, insert: mockInsert, update: mockUpdate, delete: mockDelete })),
  },
}));

process.env.ADMIN_SECRET_KEY = 'admin-key';

const params = Promise.resolve({ id: 'stu-1' });
const BODY = { refund_amount: 300000, refund_reason: '일정 변경', churn_type: 'refund' };

function makeReq(body: Record<string, unknown> = BODY) {
  return new NextRequest('http://localhost/api/crm/students/stu-1/refund', {
    method: 'POST',
    headers: { 'x-admin-key': 'admin-key', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const prior = (stage: string) => ({ stage, label: `단계 ${stage}`, entered_at: '2026-09-01T00:00:00Z' });

/** 학생 조회 → 환불 insert → 학생 update 순서로 응답을 세팅한다. */
function arrange(stageHistory: unknown, updateError: { message: string } | null = null) {
  mockSelect.mockReturnValueOnce({
    eq: vi.fn().mockReturnValueOnce({
      single: vi.fn().mockResolvedValueOnce({
        data: { id: 'stu-1', name: '정예준', lead_status: 'enrolled', stage_history: stageHistory },
        error: null,
      }),
    }),
  });
  mockInsert.mockReturnValueOnce({
    select: vi.fn().mockReturnValueOnce({
      single: vi.fn().mockResolvedValueOnce({ data: { id: 'pay-9' }, error: null }),
    }),
  });
  mockUpdate.mockReturnValueOnce({
    eq: vi.fn().mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        single: vi.fn().mockResolvedValueOnce(
          updateError ? { data: null, error: updateError } : { data: { id: 'stu-1' }, error: null }
        ),
      }),
    }),
  });
}

describe('POST /api/crm/students/[id]/refund — stage_history', () => {
  beforeEach(() => vi.clearAllMocks());

  // REQ-001
  it('이탈 처리 시 churned 진입을 이력에 추가한다', async () => {
    arrange([prior('7'), prior('8')]);
    const { POST } = await import('../route');
    const res = await POST(makeReq(), { params });

    expect(res.status).toBe(200);
    const payload = mockUpdate.mock.calls[0][0];
    expect(payload.funnel_stage).toBe('churned');
    expect(payload.stage_history.map((h: { stage: string }) => h.stage)).toEqual(['7', '8', 'churned']);
    expect(payload.stage_history[2].label).toBe('이탈');
  });

  // REQ-001
  it('직전이 이미 churned면 stage_history를 쓰지 않는다', async () => {
    arrange([prior('8'), prior('churned')]);
    const { POST } = await import('../route');
    await POST(makeReq(), { params });

    expect(mockUpdate.mock.calls[0][0]).not.toHaveProperty('stage_history');
  });

  // REQ-001
  it('이력이 없어도 churned 항목 하나로 시작한다', async () => {
    arrange(null);
    const { POST } = await import('../route');
    await POST(makeReq(), { params });

    expect(mockUpdate.mock.calls[0][0].stage_history).toHaveLength(1);
  });

  // REQ-003
  it('환불 금액이 없으면 400 — DB를 건드리지 않는다', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({ ...BODY, refund_amount: 0 }), { params });

    expect(res.status).toBe(400);
    expect(mockSelect).not.toHaveBeenCalled();
  });
});

describe('POST /api/crm/students/[id]/refund — 부분 실패 보상', () => {
  beforeEach(() => vi.clearAllMocks());

  // REQ-001 (crm-quality-cleanup)
  it('학생 업데이트가 실패하면 방금 넣은 환불 행만 id로 삭제한다', async () => {
    arrange([prior('8')], { message: 'update failed' });
    const eqDelete = vi.fn().mockResolvedValueOnce({ error: null });
    mockDelete.mockReturnValueOnce({ eq: eqDelete });

    const { POST } = await import('../route');
    const res = await POST(makeReq(), { params });

    expect(res.status).toBe(500);
    expect(eqDelete).toHaveBeenCalledTimes(1);
    expect(eqDelete).toHaveBeenCalledWith('id', 'pay-9');
  });
});
