// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const fetchWeeklyGoalRows = vi.hoisted(() => vi.fn());
vi.mock('@/lib/marketing-goals', () => ({ fetchWeeklyGoalRows }));

process.env.ADMIN_SECRET_KEY = 'admin-key';

function req(qs = '', key = 'admin-key') {
  return new NextRequest(`http://localhost/api/crm/marketing/goal-history${qs}`, {
    headers: { 'x-admin-key': key },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchWeeklyGoalRows.mockResolvedValue([]);
});

// REQ-009: 단일 주차의 목표 + 소스별 실적 조회
describe('GET /api/crm/marketing/goal-history', () => {
  it('관리자 키가 없으면 401', async () => {
    const { GET } = await import('../route');
    expect((await GET(req('?week_start=2026-08-31', 'wrong'))).status).toBe(401);
    expect(fetchWeeklyGoalRows).not.toHaveBeenCalled();
  });

  it('지정한 주차 하나만 조회한다', async () => {
    const { GET } = await import('../route');
    const res = await GET(req('?week_start=2026-08-24'));

    expect(res.status).toBe(200);
    expect(fetchWeeklyGoalRows).toHaveBeenCalledWith(['2026-08-24']);
  });

  it('미래 주차도 조회한다 (다음 주 목표 미리 설정)', async () => {
    const { GET } = await import('../route');
    await GET(req('?week_start=2026-09-14'));
    expect(fetchWeeklyGoalRows).toHaveBeenCalledWith(['2026-09-14']);
  });

  it('week_start 가 없으면 400', async () => {
    const { GET } = await import('../route');
    expect((await GET(req())).status).toBe(400);
    expect(fetchWeeklyGoalRows).not.toHaveBeenCalled();
  });

  it('월요일이 아니면 400', async () => {
    const { GET } = await import('../route');
    expect((await GET(req('?week_start=2026-09-03'))).status).toBe(400);
    expect(fetchWeeklyGoalRows).not.toHaveBeenCalled();
  });

  it('날짜 형식이 아니면 400', async () => {
    const { GET } = await import('../route');
    expect((await GET(req('?week_start=2026-8-31'))).status).toBe(400);
  });

  it('집계 실패는 500', async () => {
    fetchWeeklyGoalRows.mockRejectedValue(new Error('boom'));
    const { GET } = await import('../route');
    expect((await GET(req('?week_start=2026-08-31'))).status).toBe(500);
  });
});
