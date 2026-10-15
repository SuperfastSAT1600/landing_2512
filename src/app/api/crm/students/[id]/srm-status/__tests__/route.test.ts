import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// CRM: students(sfv2_profile_id) 조회 + student_pauses 닫기
const mockStudent = vi.fn();
const mockPauseClose = vi.fn();
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (table: string) => table === 'students'
      ? { select: () => ({ eq: () => ({ maybeSingle: () => mockStudent() }) }) }
      : { update: (v: unknown) => ({ is: () => ({ or: (filter: string) => mockPauseClose(v, filter) }) }) },
  },
}));

// SFv2: payments 조회·업데이트
const mockList = vi.fn();
const mockUpdate = vi.fn();
vi.mock('@/lib/supabase-sfv2', () => ({
  supabaseSFv2: {
    from: () => ({
      select: () => ({ eq: (_c: string, pid: string) => ({ order: () => mockList(pid) }) }),
      update: (v: unknown) => ({ eq: (_c: string, pid: string) => ({ eq: (_c2: string, subject: string) => ({ select: () => mockUpdate(v, pid, subject) }) }) }),
    }),
  },
}));

process.env.ADMIN_SECRET_KEY = 'admin-key';
const SID = '11111111-2222-4333-8444-555555555555';
const params = Promise.resolve({ id: SID });
const url = `http://localhost/api/crm/students/${SID}/srm-status`;
const get = (key = 'admin-key') => new NextRequest(url, { headers: { 'x-admin-key': key } });
const patch = (body: unknown, key = 'admin-key') =>
  new NextRequest(url, { method: 'PATCH', headers: { 'x-admin-key': key, 'content-type': 'application/json' }, body: JSON.stringify(body) });

const linked = () => mockStudent.mockResolvedValue({ data: { sfv2_profile_id: 'p1' }, error: null });

// REQ-002 (crm-srm-status)
describe('/api/crm/students/[id]/srm-status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPauseClose.mockResolvedValue({ error: null });
  });

  it('관리자 키가 없으면 401', async () => {
    const { GET, PATCH } = await import('../route');
    expect((await GET(get('wrong'), { params })).status).toBe(401);
    expect((await PATCH(patch({ subject: 'SAT', status: 'paused' }, 'wrong'), { params })).status).toBe(401);
  });

  it('SFv2 미연결이면 404 no_v2_profile', async () => {
    mockStudent.mockResolvedValue({ data: { sfv2_profile_id: null }, error: null });
    const { GET } = await import('../route');
    const res = await GET(get(), { params });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('no_v2_profile');
  });

  it('GET은 과목별 상태를 돌려준다', async () => {
    linked();
    mockList.mockResolvedValue({ data: [{ subject: 'SAT', management_status: 'active' }], error: null });
    const { GET } = await import('../route');
    const res = await GET(get(), { params });
    expect(res.status).toBe(200);
    expect((await res.json()).data.subjects).toEqual([{ subject: 'SAT', status: 'active' }]);
    expect(mockList).toHaveBeenCalledWith('p1');
  });

  it('학생 id가 uuid가 아니면 400 (필터 문자열에 넣지 않는다)', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(patch({ subject: 'SAT', status: 'active' }), { params: Promise.resolve({ id: 'x,sfv2_profile_id.neq.0' }) });
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('다른 과목이 아직 휴원이면 휴원 기록을 닫지 않는다', async () => {
    linked();
    mockUpdate.mockResolvedValue({ data: [{ id: 'pay2' }], error: null });
    mockList.mockResolvedValue({ data: [{ subject: 'AP', management_status: 'active' }, { subject: 'SAT', management_status: 'paused' }], error: null });
    const { PATCH } = await import('../route');
    expect((await PATCH(patch({ subject: 'AP', status: 'active' }), { params })).status).toBe(200);
    expect(mockPauseClose).not.toHaveBeenCalled();
  });

  it('휴원 기록 정리가 실패해도 상태 변경은 성공으로 돌려준다', async () => {
    linked();
    mockUpdate.mockResolvedValue({ data: [{ id: 'pay1' }], error: null });
    mockList.mockResolvedValue({ data: [{ subject: 'SAT', management_status: 'active' }], error: null });
    mockPauseClose.mockResolvedValue({ error: { message: 'boom' } });
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { PATCH } = await import('../route');
    const res = await PATCH(patch({ subject: 'SAT', status: 'active' }), { params });
    expect(res.status).toBe(200);
    expect((await res.json()).data.subjects).toEqual([{ subject: 'SAT', status: 'active' }]);
    err.mockRestore();
  });

  it('잘못된 상태는 400', async () => {
    const { PATCH } = await import('../route');
    expect((await PATCH(patch({ subject: 'SAT', status: 'gone' }), { params })).status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('휴원으로 바꾸면 SFv2 payments만 갱신하고 휴원 기록은 그대로 둔다', async () => {
    linked();
    mockUpdate.mockResolvedValue({ data: [{ id: 'pay1' }], error: null });
    mockList.mockResolvedValue({ data: [{ subject: 'SAT', management_status: 'paused' }], error: null });
    const { PATCH } = await import('../route');
    const res = await PATCH(patch({ subject: 'SAT', status: 'paused' }), { params });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith({ management_status: 'paused' }, 'p1', 'SAT');
    expect(mockPauseClose).not.toHaveBeenCalled();
    expect((await res.json()).data.subjects).toEqual([{ subject: 'SAT', status: 'paused' }]);
  });

  it('재원으로 바꾸면 이 학생(CRM id·SRM 프로필)의 열린 휴원 기록을 닫는다', async () => {
    linked();
    mockUpdate.mockResolvedValue({ data: [{ id: 'pay1' }], error: null });
    mockList.mockResolvedValue({ data: [{ subject: 'SAT', management_status: 'active' }], error: null });
    const { PATCH } = await import('../route');
    expect((await PATCH(patch({ subject: 'SAT', status: 'active' }), { params })).status).toBe(200);
    expect(mockPauseClose).toHaveBeenCalledWith(expect.objectContaining({ ended_at: expect.any(String) }), `student_id.eq.${SID},sfv2_profile_id.eq.p1`);
  });

  it('과목 계정이 없으면 404 no_account (새로 만들지 않는다)', async () => {
    linked();
    mockUpdate.mockResolvedValue({ data: [], error: null });
    const { PATCH } = await import('../route');
    const res = await PATCH(patch({ subject: 'AP', status: 'inactive' }), { params });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('no_account');
    expect(mockPauseClose).not.toHaveBeenCalled();
  });

  it('SFv2 오류는 502', async () => {
    linked();
    mockUpdate.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const { PATCH } = await import('../route');
    expect((await PATCH(patch({ subject: 'SAT', status: 'paused' }), { params })).status).toBe(502);
  });
});
