import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockUpdate = vi.fn();
const mockSelect = vi.fn();

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: vi.fn(() => ({ update: mockUpdate, select: mockSelect })) },
}));

process.env.ADMIN_SECRET_KEY = 'admin-key';

const params = Promise.resolve({ id: 'pay-1' });

function makeReq(body: Record<string, unknown>, key = 'admin-key') {
  return new NextRequest('http://localhost/api/crm/payments/pay-1', {
    method: 'PATCH',
    headers: { 'x-admin-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** 현재 결제 유형 조회(금액 부호 검증용) 응답. */
function currentTypeIs(payment_type: string) {
  mockSelect.mockReturnValueOnce({
    eq: vi.fn().mockReturnValueOnce({
      single: vi.fn().mockResolvedValueOnce({ data: { payment_type }, error: null }),
    }),
  });
}

function updateSucceeds(row: Record<string, unknown> = { id: 'pay-1' }) {
  mockUpdate.mockReturnValueOnce({
    eq: vi.fn().mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        single: vi.fn().mockResolvedValueOnce({ data: row, error: null }),
      }),
    }),
  });
}

describe('PATCH /api/crm/payments/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a wrong admin key → 401', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ amount: 1200000 }, 'nope'), { params });
    expect(res.status).toBe(401);
  });

  it('updates 금액 on a 가결제 (0원 → 실입금액) → 200', async () => {
    currentTypeIs('최초결제');
    updateSucceeds({ id: 'pay-1', amount: 1200000 });
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ amount: 1200000 }), { params });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ amount: 1200000 });
  });

  it('updates 금액 back down to 0 (가결제) → 200', async () => {
    currentTypeIs('최초결제');
    updateSucceeds({ id: 'pay-1', amount: 0 });
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ amount: 0 }), { params });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ amount: 0 });
  });

  it('updates 시간 together with 금액 → 200', async () => {
    currentTypeIs('최초결제');
    updateSucceeds();
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ amount: 1200000, hours: 12 }), { params });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ amount: 1200000, hours: 12 });
  });

  it('clears 시간 with null → 200', async () => {
    updateSucceeds();
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ hours: null }), { params });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ hours: null });
  });

  it('rejects a negative amount on a non-refund payment → 400', async () => {
    currentTypeIs('최초결제');
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ amount: -1000 }), { params });
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejects a non-negative amount on a refund payment → 400', async () => {
    currentTypeIs('환불');
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ amount: 0 }), { params });
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('allows a negative amount on a refund payment → 200', async () => {
    currentTypeIs('환불');
    updateSucceeds({ id: 'pay-1', amount: -500000 });
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ amount: -500000 }), { params });
    expect(res.status).toBe(200);
  });

  it('rejects a non-integer amount → 400', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ amount: '1200000' }), { params });
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejects a zero or negative 시간 → 400', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ hours: 0 }), { params });
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 404 when the payment does not exist', async () => {
    mockSelect.mockReturnValueOnce({
      eq: vi.fn().mockReturnValueOnce({
        single: vi.fn().mockResolvedValueOnce({ data: null, error: { message: 'no rows' } }),
      }),
    });
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ amount: 1000 }), { params });
    expect(res.status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('still updates 결제 유형 without touching 금액 → 200', async () => {
    updateSucceeds();
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ payment_type: '재결제' }), { params });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ payment_type: '재결제' });
    expect(mockSelect).not.toHaveBeenCalled(); // 금액 미변경이면 현재 유형 조회 불필요
  });

  it('validates 금액 against the payment_type sent in the same request', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ payment_type: '재결제', amount: -1 }), { params });
    expect(res.status).toBe(400);
    expect(mockSelect).not.toHaveBeenCalled(); // 요청에 유형이 있으면 조회 없이 판정
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
