// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const { postPlaudKeepaliveFailure, PLAUD_ALERT_CHANNEL } = await import('@/lib/slack-plaud-alert');

// REQ-004
describe('postPlaudKeepaliveFailure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SLACK_BOT_TOKEN = 'xoxb-test';
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  });

  it('실패 계정명·사유·재연결 안내를 알림 채널로 보낸다', async () => {
    await postPlaudKeepaliveFailure([
      { account: 'wooyoung', label: '김우영', ok: false, error: 'Plaud 토큰 갱신 실패: 401' },
    ]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://slack.com/api/chat.postMessage');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer xoxb-test' });
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.channel).toBe(PLAUD_ALERT_CHANNEL);
    expect(body.text).toContain('김우영');
    expect(body.text).toContain('Plaud 토큰 갱신 실패: 401');
    expect(body.text).toContain('tokens-mcp.json');
  });

  it('Slack API가 ok:false면 throw', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: false, error: 'not_in_channel' }) });
    await expect(
      postPlaudKeepaliveFailure([{ account: 'me', label: '이민재', ok: false, error: 'x' }])
    ).rejects.toThrow(/not_in_channel/);
  });

  it('Slack이 JSON이 아닌 오류 응답을 주면 HTTP 상태로 throw', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => { throw new SyntaxError('html'); } });
    await expect(
      postPlaudKeepaliveFailure([{ account: 'me', label: '이민재', ok: false }])
    ).rejects.toThrow(/HTTP 503/);
  });

  it('SLACK_BOT_TOKEN이 없으면 throw', async () => {
    delete process.env.SLACK_BOT_TOKEN;
    await expect(
      postPlaudKeepaliveFailure([{ account: 'me', label: '이민재', ok: false, error: 'x' }])
    ).rejects.toThrow(/SLACK_BOT_TOKEN/);
  });
});
