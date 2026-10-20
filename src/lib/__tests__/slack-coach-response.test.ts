import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildCoachResponseText, notifyCoachResponseToSlack, COACH_RESPONSE_CHANNEL } from '../slack-coach-response';

const base = {
  studentName: '홍길동',
  coachName: '김혜지',
  deadlineAt: '2026-10-21T09:00:00+09:00',
};

describe('buildCoachResponseText', () => {
  it('REQ-005: 수락이면 학생·코치·첫 수업 일시(KST)·마감을 담는다', () => {
    const text = buildCoachResponseText({ ...base, action: 'accept', firstLessonAt: '2026-10-25T14:30:00+09:00' });
    expect(text).toContain('수락');
    expect(text).toContain('홍길동');
    expect(text).toContain('김혜지');
    expect(text).toContain('10/25 14:30');
    expect(text).toContain('10/21 09:00');
  });

  it('REQ-005: 거절이면 사유를 담고 첫 수업 줄은 없다', () => {
    const text = buildCoachResponseText({ ...base, action: 'decline', reason: '일정이 안 맞아요' });
    expect(text).toContain('어려움');
    expect(text).toContain('일정이 안 맞아요');
    expect(text).not.toContain('첫 수업');
  });

  it('REQ-005: 사유가 없으면 "사유 없음"', () => {
    expect(buildCoachResponseText({ ...base, action: 'decline' })).toContain('사유 없음');
  });
});

describe('notifyCoachResponseToSlack', () => {
  const fetchMock = vi.fn();
  const origToken = process.env.SLACK_BOT_TOKEN;

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetchMock);
    process.env.SLACK_BOT_TOKEN = 'xoxb-test';
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    if (origToken === undefined) delete process.env.SLACK_BOT_TOKEN;
    else process.env.SLACK_BOT_TOKEN = origToken;
  });

  it('REQ-005: C0C9B0DEGDN 채널로 한 번 보낸다', async () => {
    await notifyCoachResponseToSlack({ ...base, action: 'accept', firstLessonAt: '2026-10-25T14:30:00+09:00' });
    expect(COACH_RESPONSE_CHANNEL).toBe('C0C9B0DEGDN');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://slack.com/api/chat.postMessage');
    expect(JSON.parse(init.body).channel).toBe('C0C9B0DEGDN');
    expect(init.headers.Authorization).toBe('Bearer xoxb-test');
  });

  it('REQ-005: 토큰이 없으면 보내지 않고 조용히 끝난다', async () => {
    delete process.env.SLACK_BOT_TOKEN;
    await expect(notifyCoachResponseToSlack({ ...base, action: 'decline' })).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('REQ-005: 전송이 실패해도 던지지 않는다', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'));
    await expect(notifyCoachResponseToSlack({ ...base, action: 'decline' })).resolves.toBeUndefined();
  });

  it('REQ-005: Slack이 ok:false를 주면 로그만 남기고 던지지 않는다', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: false, error: 'not_in_channel' }) });
    await expect(notifyCoachResponseToSlack({ ...base, action: 'decline' })).resolves.toBeUndefined();
  });
});
