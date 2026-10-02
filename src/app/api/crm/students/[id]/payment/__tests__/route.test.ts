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
    expect((await res.json()).error.code).toBe('UNAUTHORIZED');
  });

  it('accepts a 0원 가결제 → 201', async () => {
    happyPath();
    const { POST } = await import('../route');
    const res = await POST(makeReq({ ...VALID, amount: 0 }), { params });
    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ amount: 0 }));
    expect(mockEnroll).toHaveBeenCalled();
  });

  // REQ-002 (crm-quality-cleanup): KST 오전(=UTC 전날)에도 오늘 날짜는 KST 기준
  it('paid_at 미지정 시 KST 오늘 날짜로 기록한다', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-02T22:30:00Z')); // KST 10-03 07:30
    try {
      happyPath();
      const { POST } = await import('../route');
      await POST(makeReq(VALID), { params });
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ paid_at: '2026-10-03' }));
    } finally {
      vi.useRealTimers();
    }
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

  it('accepts a 소수점 시간 (41.5) → 201', async () => {
    happyPath();
    const { POST } = await import('../route');
    const res = await POST(makeReq({ ...VALID, hours: 41.5 }), { params });
    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ hours: 41.5 }));
  });

  it('accepts a null 시간 (시간 없는 상품) → 201', async () => {
    happyPath();
    const { POST } = await import('../route');
    const res = await POST(makeReq({ ...VALID, hours: null }), { params });
    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ hours: null }));
  });

  it('rejects a zero 시간 → 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({ ...VALID, hours: 0 }), { params });
    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects a negative 시간 → 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({ ...VALID, hours: -3 }), { params });
    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric 시간 → 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({ ...VALID, hours: '41.5' }), { params });
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

describe('POST /api/crm/students/[id]/payment — 결제수단 (REQ-002, REQ-003)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('고른 결제수단을 그대로 저장한다', async () => {
    happyPath();
    const { POST } = await import('../route');
    const res = await POST(makeReq({ ...VALID, payment_method: '신용카드' }), { params });

    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ payment_method: '신용카드' })
    );
  });

  it('결제수단을 안 보내면 null로 남긴다 — 기본값 계좌이체를 박지 않는다', async () => {
    happyPath();
    const { POST } = await import('../route');
    const res = await POST(makeReq(VALID), { params });

    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ payment_method: null })
    );
  });

  it('허용하지 않는 결제수단은 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({ ...VALID, payment_method: '비트코인' }), { params });

    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

describe('POST /api/crm/students/[id]/payment — 결제 저장 후 전환 실패', () => {
  beforeEach(() => vi.clearAllMocks());

  /** 결제 insert는 성공, enrollStudentOnPayment만 null(실패). */
  function enrollFails() {
    mockSelect.mockReturnValueOnce({
      eq: vi.fn().mockReturnValueOnce({ single: vi.fn().mockResolvedValueOnce({ data: { name: '정예준' } }) }),
    });
    mockInsert.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        single: vi.fn().mockResolvedValueOnce({ data: { id: 'pay-1' }, error: null }),
      }),
    });
    mockEnroll.mockResolvedValueOnce(null);
  }

  // REQ-001
  it('전환이 실패하면 ENROLL_FAILED와 저장된 결제를 돌려준다', async () => {
    enrollFails();
    const { POST } = await import('../route');
    const res = await POST(makeReq(VALID), { params });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe('ENROLL_FAILED');
    expect(json.data.payment.id).toBe('pay-1');
    expect(json.error.message).toContain('결제는 기록');
  });

  // REQ-001
  it('결제 insert 자체가 실패하면 ENROLL_FAILED를 쓰지 않는다', async () => {
    mockSelect.mockReturnValueOnce({
      eq: vi.fn().mockReturnValueOnce({ single: vi.fn().mockResolvedValueOnce({ data: { name: '정예준' } }) }),
    });
    mockInsert.mockReturnValueOnce({
      select: vi.fn().mockReturnValueOnce({
        single: vi.fn().mockResolvedValueOnce({ data: null, error: { message: 'insert failed' } }),
      }),
    });
    const { POST } = await import('../route');
    const res = await POST(makeReq(VALID), { params });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe('INTERNAL_ERROR');
    expect(mockEnroll).not.toHaveBeenCalled();
  });
});
