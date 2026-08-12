import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockInsert = vi.fn();

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: vi.fn(() => ({ insert: mockInsert })) },
}));

const mockEnroll = vi.fn();
vi.mock('@/lib/enroll-on-payment', () => ({
  enrollStudentOnPayment: (...args: unknown[]) => mockEnroll(...args),
}));

process.env.ADMIN_SECRET_KEY = 'admin-key';

function makeReq(body: Record<string, unknown>, key = 'admin-key') {
  return new NextRequest('http://localhost/api/crm/payments', {
    method: 'POST',
    headers: { 'x-admin-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function insertSucceeds() {
  mockInsert.mockReturnValueOnce({
    select: vi.fn().mockReturnValueOnce({
      single: vi.fn().mockResolvedValueOnce({ data: { id: 'pay-1' }, error: null }),
    }),
  });
}

const VALID = {
  student_id: 'student-1',
  student_name: '정예준',
  amount: 1200000,
  payment_type: '최초결제',
  paid_at: '2026-08-10',
};

describe('POST /api/crm/payments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a wrong admin key → 401', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq(VALID, 'nope'));
    expect(res.status).toBe(401);
  });

  it('accepts a 0원 가결제 and still enrolls the student → 201', async () => {
    insertSucceeds();
    const { POST } = await import('../route');
    const res = await POST(makeReq({ ...VALID, amount: 0 }));
    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ amount: 0 }));
    expect(mockEnroll).toHaveBeenCalledWith('student-1');
  });

  it('does not enroll on a refund → 201', async () => {
    insertSucceeds();
    const { POST } = await import('../route');
    const res = await POST(makeReq({ ...VALID, amount: -500000, payment_type: '환불' }));
    expect(res.status).toBe(201);
    expect(mockEnroll).not.toHaveBeenCalled();
  });

  it('rejects a missing amount → 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({ student_name: '정예준', paid_at: '2026-08-10' }));
    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric amount → 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({ ...VALID, amount: 'free' }));
    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
