// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

function makeBuilder(result: { data: unknown; error: null | { message: string } }) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'update', 'delete']) {
    builder[m] = vi.fn(() => builder);
  }
  builder.single = vi.fn(() => builder);
  builder.then = (resolve: (v: typeof result) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

const mockFrom = vi.hoisted(() => vi.fn());
const appendConsultationEntry = vi.hoisted(() => vi.fn());
const notifyWinbackSendsToSlack = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from: mockFrom } }));
vi.mock('@/lib/consultation-timeline', () => ({ appendConsultationEntry }));
vi.mock('@/lib/slack-memo', () => ({ notifyWinbackSendsToSlack }));

process.env.ADMIN_SECRET_KEY = 'admin-key';

const params = Promise.resolve({ id: 'wt-1' });

function makeReq(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/crm/winback-targets/wt-1', {
    method: 'PATCH',
    headers: { 'x-admin-key': 'admin-key', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const target = {
  id: 'wt-1',
  student_id: 's-1',
  play: { title: 'AP 과목 선정 상담' },
  variant: { name: '기본' },
  student: { name: '지수현' },
};

beforeEach(() => {
  vi.clearAllMocks();
  appendConsultationEntry.mockResolvedValue({ id: 'entry-1' });
  notifyWinbackSendsToSlack.mockResolvedValue(undefined);
  mockFrom.mockReturnValueOnce(makeBuilder({ data: target, error: null }));
  mockFrom.mockReturnValueOnce(makeBuilder({ data: { id: 'wt-1' }, error: null }));
});

describe('PATCH /api/crm/winback-targets/[id] — 슬랙 알림', () => {
  it('sent_message로 상담메모를 남기면 슬랙 알림 1건', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ sent_message: '개별 발송 문구', sent_by: 'Ethan' }), { params });

    expect(res.status).toBe(200);
    expect(notifyWinbackSendsToSlack).toHaveBeenCalledWith({
      author: 'Ethan',
      sends: [
        { studentName: '지수현', playLabel: 'AP 과목 선정 상담 / 기본', message: '개별 발송 문구' },
      ],
    });
  });

  it('sent_message 없는 일반 PATCH는 알림하지 않는다', async () => {
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ response: 'positive' }), { params });

    expect(res.status).toBe(200);
    expect(appendConsultationEntry).not.toHaveBeenCalled();
    expect(notifyWinbackSendsToSlack).not.toHaveBeenCalled();
  });

  it('슬랙 알림이 실패해도 응답은 200', async () => {
    notifyWinbackSendsToSlack.mockRejectedValueOnce(new Error('slack down'));
    const { PATCH } = await import('../route');
    const res = await PATCH(makeReq({ sent_message: '문구' }), { params });
    expect(res.status).toBe(200);
  });
});
