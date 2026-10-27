import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildCoachResponseText, notifyCoachResponseToSlack, COACH_RESPONSE_CHANNEL } from '../slack-coach-response';

const lessons = {
  first_lesson_at: '2026-10-26T14:30:00+09:00',
  second_lesson_at: '2026-10-28T14:30:00+09:00',
  option2_first_lesson_at: null,
  option2_second_lesson_at: null,
};

const base = {
  studentName: '홍길동',
  coachName: '김혜지',
  deadlineAt: '2026-10-21T09:00:00+09:00',
};

describe('buildCoachResponseText', () => {
  it('REQ-003: 수락이면 학생·코치·옵션 1의 첫/두 번째 수업(요일 포함, KST)·마감을 담는다', () => {
    const text = buildCoachResponseText({ ...base, action: 'accept', lessons });
    expect(text).toContain('수락');
    expect(text).toContain('홍길동');
    expect(text).toContain('김혜지');
    expect(text).toContain('옵션 1');
    expect(text).toContain('첫 수업 10/26(월) 14:30');
    expect(text).toContain('두 번째 수업 10/28(수) 14:30');
    expect(text).toContain('10/21(수) 09:00');
    expect(text).not.toContain('옵션 2');
  });

  it('학생 시간대가 있으면 현지 시각(DST 반영)을 함께 담는다', () => {
    const text = buildCoachResponseText({ ...base, action: 'accept', lessons, studentTimezone: 'America/Los_Angeles' });
    expect(text).toContain('학생 시간(America/Los_Angeles)');
    expect(text).toContain('첫 수업 10/25(일) 22:30 PDT');
  });

  it('REQ-003: 옵션 2가 있으면 함께 담는다', () => {
    const text = buildCoachResponseText({
      ...base, action: 'accept',
      lessons: { ...lessons, option2_first_lesson_at: '2026-10-27T10:00:00+09:00', option2_second_lesson_at: '2026-10-29T10:00:00+09:00' },
    });
    expect(text).toContain('옵션 2');
    expect(text).toContain('첫 수업 10/27(화) 10:00');
    expect(text).toContain('두 번째 수업 10/29(목) 10:00');
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

  it('수락이면 본문 뒤에 스레드로 한글·영어 선택 안내를 학생 시간대로 남긴다', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true, ts: '111.222' }) });
    await notifyCoachResponseToSlack({ ...base, action: 'accept', lessons, studentTimezone: 'America/Los_Angeles', coachTimezone: 'America/New_York' });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const [, ko, en, coach] = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));
    expect(ko.thread_ts).toBe('111.222');
    expect(ko.text).toContain('하나를 선택');
    expect(ko.text).toContain('옵션 1: 첫 수업 10/25(일) 오후 10:30');
    expect(en.thread_ts).toBe('111.222');
    expect(en.text).toContain('pick the one option');
    expect(en.text).toContain('Option 1: 1st lesson Sun 10/25, 10:30 PM');
    expect(coach.thread_ts).toBe('111.222');
    expect(coach.text).toContain('코치 전달용');
    expect(coach.text).toContain('코치님 현지 시간 America/New_York');
    expect(coach.text).toContain('옵션 1: 첫 수업 10/26(월) 오전 1:30'); // 10/26 14:30 KST = 10/26 01:30 EDT
  });

  it('거절이면 스레드 안내 없이 본문만 보낸다', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true, ts: '1.2' }) });
    await notifyCoachResponseToSlack({ ...base, action: 'decline' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('REQ-005: C0CCCD90Z0Q 채널로 본문을 보낸다', async () => {
    await notifyCoachResponseToSlack({ ...base, action: 'accept', lessons });
    expect(COACH_RESPONSE_CHANNEL).toBe('C0CCCD90Z0Q');
    expect(fetchMock).toHaveBeenCalledTimes(1); // ts가 없으면 스레드 안내는 생략
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://slack.com/api/chat.postMessage');
    expect(JSON.parse(init.body).channel).toBe('C0CCCD90Z0Q');
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
