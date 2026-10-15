import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockStudent = vi.fn();
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => mockStudent() }) }) }) },
}));
const mockFetchInput = vi.fn();
vi.mock('@/lib/coach-room-fetch', () => ({ fetchCoachRoomLedgerInput: (id: string) => mockFetchInput(id) }));

process.env.ADMIN_SECRET_KEY = 'admin-key';
const params = Promise.resolve({ id: 's1' });
const req = (key = 'admin-key') =>
  new NextRequest('http://localhost/api/crm/students/s1/coach-room', { headers: { 'x-admin-key': key } });

// REQ-002 (crm-coach-room-card)
describe('GET /api/crm/students/[id]/coach-room', () => {
  beforeEach(() => vi.clearAllMocks());

  it('관리자 키가 없으면 401', async () => {
    const { GET } = await import('../route');
    expect((await GET(req('wrong'), { params })).status).toBe(401);
  });

  it('SFv2 미연결이면 404 no_v2_profile', async () => {
    mockStudent.mockResolvedValue({ data: { sfv2_profile_id: null }, error: null });
    const { GET } = await import('../route');
    const res = await GET(req(), { params });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('no_v2_profile');
  });

  it('연결된 학생은 과목별 장부를 돌려준다', async () => {
    mockStudent.mockResolvedValue({ data: { sfv2_profile_id: 'p1' }, error: null });
    mockFetchInput.mockResolvedValue({
      transactions: [{ subject: 'SAT', hours: 10, paid_at: '2026-10-01T00:00:00Z', product: 'SAT 10h' }],
      payments: [{ id: 'pay1', subject: 'SAT', management_status: 'active' }],
      refunds: [],
      lessons: [{ id: 'l1', subject: 'SAT', starts_at: '2026-10-02T07:00:00Z', ends_at: '2026-10-02T09:00:00Z', status: 'completed', teacher: '박기훈' }],
    });
    const { GET } = await import('../route');
    const res = await GET(req(), { params });
    expect(res.status).toBe(200);
    expect(mockFetchInput).toHaveBeenCalledWith('p1');
    const body = await res.json();
    expect(body.data.subjects[0].totals).toMatchObject({ purchased: 10, completed: 2, remaining: 8 });
  });

  it('SFv2 조회가 실패하면 502', async () => {
    mockStudent.mockResolvedValue({ data: { sfv2_profile_id: 'p1' }, error: null });
    mockFetchInput.mockRejectedValue(new Error('boom'));
    const { GET } = await import('../route');
    expect((await GET(req(), { params })).status).toBe(502);
  });
});
