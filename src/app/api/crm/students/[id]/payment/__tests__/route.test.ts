import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockInsert = vi.fn();
const mockSelect = vi.fn();

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: vi.fn(() => ({ insert: mockInsert, select: mockSelect })) },
}));

const mockEnroll = vi.fn();
vi.mock('@/lib/enroll-on-payment', () => ({
  enrollStudentOnPayment: (...args: unknown[]) => mockEnroll(...args),
}));

process.env.ADMIN_SECRET_KEY = 'admin-key';

const params = Promise.resolve({ id: 'student-1' });

function makeReq(body: Record<string, unknown>, key = 'admin-key') {
  return new NextRequest('http://localhost/api/crm/students/student-1/payment', {
    method: 'POST',
    headers: { 'x-admin-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** students.name 조회 → payments insert 순서로 응답을 세팅한다. */
function happyPath() {
  mockSelect.mockReturnValueOnce({
    eq: vi.fn().mockReturnValueOnce({ single: vi.fn().mockResolvedValueOnce({ data: { name: '정예준' } }) }),
  });
  mockInsert.mockReturnValueOnce({
    select: vi.fn().mockReturnValueOnce({
      single: vi.fn().mockResolvedValueOnce({ data: { id: 'pay-1' }, error: null }),
    }),
  });
  mockEnroll.mockResolvedValueOnce({ id: 'student-1' });
}

const VALID = { product: 'SAT 정규 1:1 수업 (관리형)', hours: 18, amount: 1200000 };

describe('POST /api/crm/students/[id]/payment', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a wrong admin key → 401', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq(VALID, 'nope'), { params });
    expect(res.status).toBe(401);
  });

  it('accepts a 0원 가결제 → 201', async () => {
    happyPath();
    const { POST } = await import('../route');
    const res = await POST(makeReq({ ...VALID, amount: 0 }), { params });
    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ amount: 0 }));
    expect(mockEnroll).toHaveBeenCalled();
  });

  it('accepts a normal positive amount → 201', async () => {
    happyPath();
    const { POST } = await import('../route');
    const res = await POST(makeReq(VALID), { params });
    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ amount: 1200000 }));
  });

  it('rejects a negative amount → 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({ ...VALID, amount: -1000 }), { params });
    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects a missing amount → 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({ product: VALID.product }), { params });
    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric amount → 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({ ...VALID, amount: '1200000' }), { params });
    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects a missing product → 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({ amount: 0 }), { params });
    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
