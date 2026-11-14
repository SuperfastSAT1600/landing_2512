// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  staff: vi.fn(), contacts: vi.fn(), workItems: vi.fn(), generate: vi.fn(), save: vi.fn(), markSent: vi.fn(),
}));
vi.mock('@/lib/staff-request', () => ({ getStaffUser: mocks.staff }));
vi.mock('@/lib/staff-contacts', () => ({ listContacts: mocks.contacts }));
vi.mock('@/lib/student-work-items', () => ({ listStudentWorkItems: mocks.workItems }));
vi.mock('@/lib/message-draft', async (orig) => ({ ...(await orig<typeof import('@/lib/message-draft')>()), generateMessageDraft: mocks.generate }));
vi.mock('@/lib/message-drafts', () => ({ saveDraft: mocks.save, markDraftSent: mocks.markSent }));

import { POST } from '../route';
import { PATCH } from '../[id]/route';

const url = 'http://localhost/api/staff/message-drafts';
const post = (body: unknown) => new NextRequest(url, { method: 'POST', body: JSON.stringify(body) });
const student = { targetId: 's1', name: '가나다', kind: 'student', remainingHours: 6, reasons: [{ kind: 'noSchedule' }] };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.staff.mockReturnValue({ id: 'st1', name: '알바B' });
  mocks.contacts.mockResolvedValue({ s1: [] });
  mocks.workItems.mockResolvedValue({});
  mocks.generate.mockResolvedValue({ message: '{이름} 학생 안녕하세요', basis: ['스케줄 없음'], handoff: null });
  mocks.save.mockResolvedValue('d1');
});

// REQ-011
describe('POST /api/staff/message-drafts', () => {
  it('세션이 없으면 401', async () => {
    mocks.staff.mockReturnValue(null);
    expect((await POST(post(student))).status).toBe(401);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('형식이 틀리면 400', async () => {
    expect((await POST(post({ ...student, reasons: [{ kind: 'x' }] }))).status).toBe(400);
  });

  it('연락 이력·운영 업무를 모아 초안을 만들고, 이름을 채워 저장한 뒤 돌려준다', async () => {
    const res = await POST(post(student));
    const { data } = await res.json();
    expect(mocks.contacts).toHaveBeenCalledWith(['s1']);
    expect(mocks.workItems).toHaveBeenCalledWith(['s1']);
    expect(mocks.generate.mock.calls[0][0]).toContain('스터디홀/보캡 없음');
    expect(mocks.generate.mock.calls[0][0]).not.toContain('가나다');
    expect(data).toEqual({ id: 'd1', message: '가나다 학생 안녕하세요', basis: ['스케줄 없음'], handoff: null });
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
      targetId: 's1', targetName: '가나다', purposes: ['noSchedule'], draft: '가나다 학생 안녕하세요', createdBy: '알바B',
    }));
  });

  it('코치는 운영 업무를 조회하지 않는다', async () => {
    await POST(post({ targetId: 'coach:ben', name: 'Ben', kind: 'coach', studentNames: ['라마'] }));
    expect(mocks.workItems).not.toHaveBeenCalled();
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ purposes: ['coach'] }));
  });

  it('초안 생성이 실패하면 502', async () => {
    mocks.generate.mockRejectedValue(new Error('refusal'));
    expect((await POST(post(student))).status).toBe(502);
  });
});

describe('PATCH /api/staff/message-drafts/[id]', () => {
  const patch = (body: unknown) => PATCH(new NextRequest(`${url}/d1`, { method: 'PATCH', body: JSON.stringify(body) }), { params: Promise.resolve({ id: 'd1' }) });

  it('세션이 없으면 401', async () => {
    mocks.staff.mockReturnValue(null);
    expect((await patch({ sentText: 'x' })).status).toBe(401);
  });

  it('실제 보낸 내용을 기록한다', async () => {
    expect((await patch({ sentText: '고친 문자' })).status).toBe(200);
    expect(mocks.markSent).toHaveBeenCalledWith('d1', '고친 문자', '알바B');
  });

  it('보낸 내용이 비면 400', async () => {
    expect((await patch({ sentText: ' ' })).status).toBe(400);
  });
});
