import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const appendConsultationEntry = vi.fn();
const notifyMemoToSlack = vi.fn();
class StudentNotFoundError extends Error {}

vi.mock('@/lib/consultation-timeline', () => ({ appendConsultationEntry, StudentNotFoundError }));
vi.mock('@/lib/slack-memo', () => ({ notifyMemoToSlack }));

process.env.ADMIN_SECRET_KEY = 'admin-key';

function makeReq(body: Record<string, unknown>, key = 'admin-key') {
  return new NextRequest('http://localhost/api/crm/students/s1/memo', {
    method: 'POST',
    headers: { 'x-admin-key': key, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
const params = Promise.resolve({ id: 's1' });

describe('POST /api/crm/students/[id]/memo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifyMemoToSlack.mockResolvedValue(undefined);
  });

  it('rejects unauthorized requests', async () => {
    const { POST } = await import('../route');
    expect((await POST(makeReq({ raw_memo: 'memo' }, 'bad'), { params })).status).toBe(401);
  });

  it('passes public copy to the append path and Slack only receives raw memo', async () => {
    appendConsultationEntry.mockResolvedValueOnce({
      id: 'e1',
      published: true,
      ai_purified: '안내문',
    });
    const { POST } = await import('../route');
    const res = await POST(
      makeReq({ raw_memo: '내부 메모', ai_purified: '안내문', author: '상담자' }),
      { params }
    );
    expect(res.status).toBe(201);
    expect(appendConsultationEntry).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ raw_memo: '내부 메모', ai_purified: '안내문' })
    );
    expect(notifyMemoToSlack).toHaveBeenCalledWith({
      studentId: 's1',
      memo: '내부 메모',
      author: '상담자',
    });
  });

  it('rejects an empty memo without attachments', async () => {
    const { POST } = await import('../route');
    expect((await POST(makeReq({ raw_memo: ' ' }), { params })).status).toBe(400);
    expect(appendConsultationEntry).not.toHaveBeenCalled();
  });

  it('returns 404 when the student does not exist', async () => {
    appendConsultationEntry.mockRejectedValueOnce(new StudentNotFoundError());
    const { POST } = await import('../route');
    expect((await POST(makeReq({ raw_memo: 'memo' }), { params })).status).toBe(404);
  });
});
