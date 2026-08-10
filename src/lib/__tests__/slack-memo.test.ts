// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const single = vi.fn();
const eq = vi.fn(() => ({ single }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from } }));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function slackBody() {
  const [, init] = fetchMock.mock.calls[0];
  return JSON.parse((init as RequestInit).body as string) as { channel: string; text: string };
}

describe('notifyMemoToSlack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SLACK_BOT_TOKEN = 'xoxb-test';
    single.mockResolvedValue({ data: { name: '홍길동' } });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  });

  it('학생 이름·상담인·메모 본문을 담아 상담 채널로 전송', async () => {
    const { notifyMemoToSlack } = await import('@/lib/slack-memo');

    await notifyMemoToSlack({ studentId: 's1', memo: '수학 보강 요청', author: '이민재' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://slack.com/api/chat.postMessage');
    const body = slackBody();
    expect(body.text).toContain('홍길동');
    expect(body.text).toContain('이민재');
    expect(body.text).toContain('수학 보강 요청');
    expect(body.text).toContain('상담 메모 등록');
  });

  it('heading을 주면 그 제목으로 전송 (Plaud 구분)', async () => {
    const { notifyMemoToSlack } = await import('@/lib/slack-memo');

    await notifyMemoToSlack({
      studentId: 's1',
      memo: '[핵심 니즈]\n- 1600 목표',
      author: '김우영',
      heading: '🎙️ *Plaud 녹음 상담 메모*',
    });

    const body = slackBody();
    expect(body.text).toContain('🎙️ *Plaud 녹음 상담 메모*');
    expect(body.text).toContain('1600 목표');
  });

  it('author 미지정 → "미기재"', async () => {
    const { notifyMemoToSlack } = await import('@/lib/slack-memo');
    await notifyMemoToSlack({ studentId: 's1', memo: '메모' });
    expect(slackBody().text).toContain('미기재');
  });

  it('학생 조회 실패해도 studentId 폴백으로 전송', async () => {
    single.mockResolvedValue({ data: null });
    const { notifyMemoToSlack } = await import('@/lib/slack-memo');
    await notifyMemoToSlack({ studentId: 's1', memo: '메모' });
    expect(slackBody().text).toContain('s1');
  });

  it('SLACK_BOT_TOKEN 없으면 전송하지 않음', async () => {
    delete process.env.SLACK_BOT_TOKEN;
    const { notifyMemoToSlack } = await import('@/lib/slack-memo');
    await notifyMemoToSlack({ studentId: 's1', memo: '메모' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('전송 실패해도 throw 하지 않음(메모 저장에 영향 없음)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('slack down'));
    const { notifyMemoToSlack } = await import('@/lib/slack-memo');
    await expect(notifyMemoToSlack({ studentId: 's1', memo: '메모' })).resolves.toBeUndefined();
  });
});
