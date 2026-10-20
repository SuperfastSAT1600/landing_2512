import { describe, it, expect, vi, beforeEach } from 'vitest';

const db = vi.hoisted(() => ({ findByToken: vi.fn() }));
vi.mock('@/lib/coach-prep-requests-db', () => db);

import { loadCoachRequestInfo } from '../coach-request-info';

const req = (over: Record<string, unknown> = {}) => ({
  id: 'r-1', student_id: 'stu-1', coach_slug: 'kim', coach_name: '김혜지', token: 'tok',
  deadline_at: '2099-01-01T00:00:00Z', status: 'pending', first_lesson_at: null, second_lesson_at: null,
  option2_first_lesson_at: null, option2_second_lesson_at: null, decline_reason: null,
  first_opened_at: null, responded_at: null, selected_at: null, created_at: '2026-10-20T00:00:00Z', ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('loadCoachRequestInfo', () => {
  it('토큰이 없으면 DB를 조회하지 않고 null', async () => {
    expect(await loadCoachRequestInfo('stu-1', undefined)).toBeNull();
    expect(db.findByToken).not.toHaveBeenCalled();
  });

  it('다른 학생의 토큰이면 null (자료는 보이지만 응답 폼은 안 나온다)', async () => {
    db.findByToken.mockResolvedValue(req({ student_id: 'other' }));
    expect(await loadCoachRequestInfo('stu-1', 'tok')).toBeNull();
  });

  it('모르는 토큰이면 null', async () => {
    db.findByToken.mockResolvedValue(null);
    expect(await loadCoachRequestInfo('stu-1', 'tok')).toBeNull();
  });

  it('유효하면 본인 요청 정보만 돌려준다 (다른 코치·선택 정보는 없음)', async () => {
    db.findByToken.mockResolvedValue(req({ status: 'accepted', first_lesson_at: '2099-02-01T00:00:00Z', second_lesson_at: '2099-02-03T00:00:00Z' }));
    const info = await loadCoachRequestInfo('stu-1', 'tok');
    expect(info).toEqual({
      token: 'tok', coach_name: '김혜지', deadline_at: '2099-01-01T00:00:00Z',
      status: 'accepted', first_lesson_at: '2099-02-01T00:00:00Z', second_lesson_at: '2099-02-03T00:00:00Z',
      option2_first_lesson_at: null, option2_second_lesson_at: null, decline_reason: null,
    });
  });

  it('조회가 실패해도 던지지 않고 null (페이지는 자료만 보여준다)', async () => {
    db.findByToken.mockRejectedValue(new Error('db down'));
    expect(await loadCoachRequestInfo('stu-1', 'tok')).toBeNull();
  });
});
