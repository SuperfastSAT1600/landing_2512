import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const appendConsultationEntry = vi.fn();
const notifyMemoToSlack = vi.fn();
class StudentNotFoundError extends Error {}

vi.mock('@/lib/consultation-timeline', () => ({ appendConsultationEntry, StudentNotFoundError }));
vi.mock('@/lib/slack-memo', () => ({
  notifyMemoToSlack,
  CHURN_HEADING: '🚪 *이탈 처리*',
}));

process.env.ADMIN_SECRET_KEY = 'admin-key';

const VALID = {
  churn_tag: '회신 없음',
  reason: '콜 당일 무응답',
  churn_type: 'potential',
  author: '이민재',
};

function makeReq(body: Record<string, unknown>, key = 'admin-key') {
  return new NextRequest('http://localhost/api/crm/students/s1/churn-memo', {
    method: 'POST',
    headers: { 'x-admin-key': key, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
const params = Promise.resolve({ id: 's1' });

const MEMO = '이탈 처리 · 잠재 복귀 가능\n이탈 태그: 회신 없음\n사유: 콜 당일 무응답';

describe('POST /api/crm/students/[id]/churn-memo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifyMemoToSlack.mockResolvedValue(undefined);
    appendConsultationEntry.mockResolvedValue({ id: 'e1', published: false });
  });

  it('rejects unauthorized requests', async () => {
    const { POST } = await import('../route');
    expect((await POST(makeReq(VALID, 'bad'), { params })).status).toBe(401);
    expect(appendConsultationEntry).not.toHaveBeenCalled();
  });

  it('상담 타임라인에 이탈 메모를 남긴다', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq(VALID), { params });

    expect(res.status).toBe(201);
    expect(appendConsultationEntry).toHaveBeenCalledWith('s1', {
      raw_memo: MEMO,
      author: '이민재',
      published: false,
    });
  });

  it('상담내역 슬랙 채널에 이탈 헤딩으로 올린다', async () => {
    const { POST } = await import('../route');
    await POST(makeReq(VALID), { params });

    expect(notifyMemoToSlack).toHaveBeenCalledWith({
      studentId: 's1',
      memo: MEMO,
      author: '이민재',
      heading: '🚪 *이탈 처리*',
    });
  });

  it('이탈 태그가 없으면 400', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({ ...VALID, churn_tag: '  ' }), { params });
    expect(res.status).toBe(400);
    expect(appendConsultationEntry).not.toHaveBeenCalled();
  });

  it('학생이 없으면 404', async () => {
    appendConsultationEntry.mockRejectedValueOnce(new StudentNotFoundError());
    const { POST } = await import('../route');
    expect((await POST(makeReq(VALID), { params })).status).toBe(404);
  });

  it('슬랙 실패는 메모 저장을 되돌리지 않는다', async () => {
    notifyMemoToSlack.mockRejectedValueOnce(new Error('slack down'));
    const { POST } = await import('../route');
    expect((await POST(makeReq(VALID), { params })).status).toBe(201);
  });

  it('작성자가 없어도 저장된다', async () => {
    const { POST } = await import('../route');
    const res = await POST(makeReq({ ...VALID, author: undefined }), { params });
    expect(res.status).toBe(201);
    expect(appendConsultationEntry).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ raw_memo: MEMO })
    );
  });
});
