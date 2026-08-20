// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

function makeBuilder(result: { data: unknown; error: null | { message: string } }) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'update', 'insert']) {
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

function makeReq(body: Record<string, unknown>, key = 'admin-key') {
  return new NextRequest('http://localhost/api/crm/winback-targets/bulk', {
    method: 'POST',
    headers: { 'x-admin-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function target(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    student_id: `s-${id}`,
    sent_at: null,
    message_draft: '기본 문구',
    play: { title: 'AP 과목 선정 상담' },
    variant: { name: '기본' },
    ...overrides,
  };
}

/** markSent 1건이 소비하는 supabase 호출 순서: 타겟 조회 → 학생 조회 → 학생 갱신 → 타겟 갱신 */
function queueMarkSent(id: string, studentName: string, overrides: Record<string, unknown> = {}) {
  mockFrom.mockReturnValueOnce(makeBuilder({ data: target(id, overrides), error: null }));
  if (overrides.sent_at) return;
  mockFrom.mockReturnValueOnce(
    makeBuilder({ data: { name: studentName, lead_status: 'churned', reactivation_log: [] }, error: null })
  );
  mockFrom.mockReturnValueOnce(makeBuilder({ data: null, error: null }));
  mockFrom.mockReturnValueOnce(
    makeBuilder({ data: { id, student: { id: `s-${id}`, name: studentName } }, error: null })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  appendConsultationEntry.mockResolvedValue({ id: 'entry-1' });
  notifyWinbackSendsToSlack.mockResolvedValue(undefined);
});

describe('POST /api/crm/winback-targets/bulk — mark_sent 슬랙 알림', () => {
  it('발송 건들을 모아 슬랙 알림을 1회 호출', async () => {
    queueMarkSent('t-1', 'Sylvie Kim');
    queueMarkSent('t-2', '손호원');

    const { POST } = await import('../route');
    const res = await POST(
      makeReq({ target_ids: ['t-1', 't-2'], action: 'mark_sent', author: 'Ethan' })
    );

    expect(res.status).toBe(200);
    expect(notifyWinbackSendsToSlack).toHaveBeenCalledTimes(1);
    expect(notifyWinbackSendsToSlack).toHaveBeenCalledWith({
      author: 'Ethan',
      sends: [
        { studentName: 'Sylvie Kim', playLabel: 'AP 과목 선정 상담 / 기본', message: '기본 문구' },
        { studentName: '손호원', playLabel: 'AP 과목 선정 상담 / 기본', message: '기본 문구' },
      ],
    });
  });

  it('타겟별 커스텀 문구를 그대로 알림에 담는다', async () => {
    queueMarkSent('t-1', '지수현');

    const { POST } = await import('../route');
    await POST(
      makeReq({
        target_ids: ['t-1'],
        action: 'mark_sent',
        author: 'Ethan',
        messages: { 't-1': '수정한 문구' },
      })
    );

    expect(notifyWinbackSendsToSlack.mock.calls[0][0].sends[0].message).toBe('수정한 문구');
  });

  it('이미 발송된(멱등) 타겟은 알림에 포함하지 않는다', async () => {
    queueMarkSent('t-1', '홍길동', { sent_at: '2026-08-19T00:00:00Z' });

    const { POST } = await import('../route');
    const res = await POST(makeReq({ target_ids: ['t-1'], action: 'mark_sent' }));

    expect(res.status).toBe(200);
    expect(appendConsultationEntry).not.toHaveBeenCalled();
    expect(notifyWinbackSendsToSlack).not.toHaveBeenCalled();
  });

  it('발송이 실패한 타겟은 알림에 포함하지 않는다', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'not found' } }));

    const { POST } = await import('../route');
    const res = await POST(makeReq({ target_ids: ['t-1'], action: 'mark_sent' }));

    expect(res.status).toBe(500);
    expect(notifyWinbackSendsToSlack).not.toHaveBeenCalled();
  });

  it('슬랙 알림이 실패해도 발송 응답은 200', async () => {
    queueMarkSent('t-1', '홍길동');
    notifyWinbackSendsToSlack.mockRejectedValueOnce(new Error('slack down'));

    const { POST } = await import('../route');
    const res = await POST(makeReq({ target_ids: ['t-1'], action: 'mark_sent' }));

    expect(res.status).toBe(200);
  });

  it('mark_sent 이외의 액션은 알림하지 않는다', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder({ data: [], error: null }));

    const { POST } = await import('../route');
    await POST(makeReq({ target_ids: ['t-1'], action: 'skip' }));

    expect(notifyWinbackSendsToSlack).not.toHaveBeenCalled();
  });
});
