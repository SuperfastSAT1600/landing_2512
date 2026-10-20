import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const db = vi.hoisted(() => ({
  findByToken: vi.fn(),
  saveResponse: vi.fn(),
  getStudentName: vi.fn(),
}));
const slack = vi.hoisted(() => ({ notifyCoachResponseToSlack: vi.fn() }));
vi.mock('@/lib/coach-prep-requests-db', () => db);
vi.mock('@/lib/slack-coach-response', () => slack);

const TOKEN = 'a'.repeat(32);
const FUTURE = '2099-01-01T10:00:00+09:00';
const SECOND = '2099-01-03T10:00:00+09:00';
const OPT2_FIRST = '2099-01-02T10:00:00+09:00';
const OPT2_SECOND = '2099-01-04T10:00:00+09:00';
const NO_TIMES = { first_lesson_at: null, second_lesson_at: null, option2_first_lesson_at: null, option2_second_lesson_at: null };
const OPT1 = { first_lesson_at: FUTURE, second_lesson_at: SECOND };

const row = (over: Record<string, unknown> = {}) => ({
  id: 'r-1', student_id: 'stu-1', coach_slug: 'kim', coach_name: '김혜지', token: TOKEN,
  deadline_at: FUTURE, status: 'pending', first_lesson_at: null, second_lesson_at: null,
  option2_first_lesson_at: null, option2_second_lesson_at: null, decline_reason: null,
  first_opened_at: null, responded_at: null, selected_at: null, created_at: '2026-10-20T00:00:00Z', ...over,
});

function post(body: unknown) {
  return new NextRequest('http://localhost/api/coach-prep/respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  db.findByToken.mockResolvedValue(row());
  db.getStudentName.mockResolvedValue('홍길동');
  db.saveResponse.mockImplementation(async (_id: string, patch: Record<string, unknown>) => row({ ...patch }));
});

describe('POST /api/coach-prep/respond', () => {
  // REQ-004
  it('잘못된 JSON은 400 INVALID_JSON', async () => {
    const { POST } = await import('../route');
    const res = await POST(post('{nope'));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('INVALID_JSON');
  });

  it('수락인데 두 번째 수업 일시가 없으면 400이고 저장하지 않는다', async () => {
    const { POST } = await import('../route');
    const res = await POST(post({ token: TOKEN, action: 'accept', first_lesson_at: FUTURE }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
    expect(db.saveResponse).not.toHaveBeenCalled();
  });

  it('모르는 토큰은 404 INVALID_TOKEN', async () => {
    db.findByToken.mockResolvedValue(null);
    const { POST } = await import('../route');
    const res = await POST(post({ token: TOKEN, action: 'decline' }));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('INVALID_TOKEN');
  });

  it('마감이 지났으면 409 DEADLINE_PASSED이고 저장·알림 모두 하지 않는다', async () => {
    db.findByToken.mockResolvedValue(row({ deadline_at: '2000-01-01T00:00:00Z' }));
    const { POST } = await import('../route');
    const res = await POST(post({ token: TOKEN, action: 'accept', ...OPT1 }));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('DEADLINE_PASSED');
    expect(db.saveResponse).not.toHaveBeenCalled();
    expect(slack.notifyCoachResponseToSlack).not.toHaveBeenCalled();
  });

  it('수락을 저장하고 Slack으로 한 번 알린다', async () => {
    const { POST } = await import('../route');
    const res = await POST(post({ token: TOKEN, action: 'accept', ...OPT1 }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toMatchObject({ status: 'accepted', first_lesson_at: FUTURE, second_lesson_at: SECOND, option2_first_lesson_at: null });
    expect(typeof json.meta.requestId).toBe('string');
    expect(JSON.stringify(json)).not.toContain(TOKEN); // 응답에 토큰을 돌려주지 않는다

    expect(db.saveResponse).toHaveBeenCalledWith('r-1', { status: 'accepted', ...OPT1, option2_first_lesson_at: null, option2_second_lesson_at: null, decline_reason: null });
    expect(slack.notifyCoachResponseToSlack).toHaveBeenCalledTimes(1);
    expect(slack.notifyCoachResponseToSlack).toHaveBeenCalledWith({
      studentName: '홍길동', coachName: '김혜지', action: 'accept',
      lessons: { ...OPT1, option2_first_lesson_at: null, option2_second_lesson_at: null }, reason: null, deadlineAt: FUTURE,
    });
  });

  it('옵션 2까지 보내면 두 옵션을 모두 저장하고 알린다', async () => {
    const { POST } = await import('../route');
    const body = { token: TOKEN, action: 'accept', ...OPT1, option2_first_lesson_at: OPT2_FIRST, option2_second_lesson_at: OPT2_SECOND };
    const res = await POST(post(body));
    expect(res.status).toBe(200);
    expect(db.saveResponse).toHaveBeenCalledWith('r-1', expect.objectContaining({ option2_first_lesson_at: OPT2_FIRST, option2_second_lesson_at: OPT2_SECOND }));
    expect(slack.notifyCoachResponseToSlack).toHaveBeenCalledWith(expect.objectContaining({
      lessons: expect.objectContaining({ option2_first_lesson_at: OPT2_FIRST }),
    }));
  });

  it('옵션 2를 한 칸만 채우거나 두 번째 수업이 첫 수업보다 빠르면 400', async () => {
    const { POST } = await import('../route');
    expect((await POST(post({ token: TOKEN, action: 'accept', ...OPT1, option2_first_lesson_at: OPT2_FIRST }))).status).toBe(400);
    expect((await POST(post({ token: TOKEN, action: 'accept', first_lesson_at: SECOND, second_lesson_at: FUTURE }))).status).toBe(400);
    expect(db.saveResponse).not.toHaveBeenCalled();
  });

  it('거절은 첫 수업 일시를 비우고 사유를 저장한다', async () => {
    const { POST } = await import('../route');
    const res = await POST(post({ token: TOKEN, action: 'decline', reason: '일정이 안 맞아요' }));

    expect(res.status).toBe(200);
    expect(db.saveResponse).toHaveBeenCalledWith('r-1', { status: 'declined', ...NO_TIMES, decline_reason: '일정이 안 맞아요' });
    expect(slack.notifyCoachResponseToSlack).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'decline', reason: '일정이 안 맞아요', lessons: null }),
    );
  });

  it('마감 전에는 이미 응답한 코치도 수정할 수 있다', async () => {
    db.findByToken.mockResolvedValue(row({ status: 'accepted', ...OPT1, responded_at: '2026-10-20T01:00:00Z' }));
    const { POST } = await import('../route');
    const res = await POST(post({ token: TOKEN, action: 'decline' }));
    expect(res.status).toBe(200);
    expect(db.saveResponse).toHaveBeenCalled();
  });

  it('저장 시점에 이미 마감이면(확인과 저장 사이 경쟁) 409 DEADLINE_PASSED이고 알림도 없다', async () => {
    db.saveResponse.mockResolvedValue('closed');
    const { POST } = await import('../route');
    const res = await POST(post({ token: TOKEN, action: 'decline' }));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe('DEADLINE_PASSED');
    expect(slack.notifyCoachResponseToSlack).not.toHaveBeenCalled();
  });

  it('토큰 조회가 DB 오류로 실패하면 404가 아니라 500 DB_ERROR (링크가 죽었다고 오해시키지 않는다)', async () => {
    db.findByToken.mockRejectedValue(new Error('db down'));
    const { POST } = await import('../route');
    const res = await POST(post({ token: TOKEN, action: 'decline' }));
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe('DB_ERROR');
  });

  it('이미 저장된 응답과 같은 내용을 다시 보내면 저장은 하되 Slack 알림은 중복으로 보내지 않는다', async () => {
    db.findByToken.mockResolvedValue(row({ status: 'accepted', first_lesson_at: '2099-01-01T01:00:00+00:00', second_lesson_at: '2099-01-03T01:00:00+00:00', responded_at: '2026-10-20T01:00:00Z' }));
    const { POST } = await import('../route');
    const res = await POST(post({ token: TOKEN, action: 'accept', first_lesson_at: '2099-01-01T10:00:00+09:00', second_lesson_at: SECOND }));
    expect(res.status).toBe(200);
    expect(slack.notifyCoachResponseToSlack).not.toHaveBeenCalled();
  });

  it('저장 실패(예외)는 500 DB_ERROR이고 알림을 보내지 않는다', async () => {
    db.saveResponse.mockRejectedValue(new Error('db down'));
    const { POST } = await import('../route');
    const res = await POST(post({ token: TOKEN, action: 'decline' }));
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe('DB_ERROR');
    expect(slack.notifyCoachResponseToSlack).not.toHaveBeenCalled();
  });
});
