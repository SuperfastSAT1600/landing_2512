import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mockRecent = vi.fn();
const mockPrior = vi.fn();
const mockContext = vi.fn();
vi.mock('../fetch', () => ({
  fetchRecentLessons: (...a: unknown[]) => mockRecent(...a),
  fetchPriorMatchingIds: (...a: unknown[]) => mockPrior(...a),
  fetchMatchingContext: (...a: unknown[]) => mockContext(...a),
}));
const mockClaim = vi.fn();
const mockRelease = vi.fn();
vi.mock('../store', () => ({
  claimMatching: (...a: unknown[]) => mockClaim(...a),
  releaseMatching: (...a: unknown[]) => mockRelease(...a),
}));
const mockPost = vi.fn();
vi.mock('@/lib/slack-first-lesson', () => ({ postFirstLessonNotice: (...a: unknown[]) => mockPost(...a) }));

process.env.CRON_SECRET = 'secret';
const { GET } = await import('../route');

const req = (auth: string | null = 'Bearer secret') =>
  new NextRequest('http://localhost/api/cron/first-lesson-notice', { headers: auth ? { authorization: auth } : {} });
const lesson = { id: 'e1', matching_id: 'm1', starts_at: '2026-11-02T05:00:00Z', assigned_teacher_id: null };

// REQ-003
describe('GET /api/cron/first-lesson-notice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecent.mockResolvedValue([lesson]);
    mockPrior.mockResolvedValue(new Set());
    mockContext.mockResolvedValue({ studentNames: ['김학생'], coachName: '박코치', studentTimezone: null });
    mockClaim.mockResolvedValue(true);
    mockPost.mockResolvedValue(undefined);
    mockRelease.mockResolvedValue(undefined);
  });

  it('인증이 맞지 않으면 401', async () => {
    expect((await GET(req('Bearer wrong'))).status).toBe(401);
    expect(mockRecent).not.toHaveBeenCalled();
  });

  it('신규 매칭이면 선점 후 슬랙으로 보낸다', async () => {
    const body = await (await GET(req())).json();
    expect(body).toMatchObject({ ok: true, sent: 1 });
    expect(mockPost.mock.calls[0][0]).toContain('김학생');
  });

  it('이미 알린 매칭은 다시 보내지 않는다', async () => {
    mockClaim.mockResolvedValue(false);
    const body = await (await GET(req())).json();
    expect(body.sent).toBe(0);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('이전 일정이 있던 매칭은 건너뛴다', async () => {
    mockPrior.mockResolvedValue(new Set(['m1']));
    await GET(req());
    expect(mockClaim).not.toHaveBeenCalled();
  });

  it('전송이 실패하면 선점을 풀어 다음 실행에서 재시도한다', async () => {
    mockPost.mockRejectedValue(new Error('slack down'));
    const body = await (await GET(req())).json();
    expect(mockRelease).toHaveBeenCalledWith('m1');
    expect(body).toMatchObject({ sent: 0, errors: 1 });
  });
});
