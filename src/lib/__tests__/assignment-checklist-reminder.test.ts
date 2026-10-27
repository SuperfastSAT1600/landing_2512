import { describe, it, expect } from 'vitest';
import { pickDueChecklists, buildReminderText, type OpenChecklist } from '../assignment-checklist-reminder';

const now = new Date('2026-10-27T12:00:00Z');
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000).toISOString();

function row(over: Partial<OpenChecklist> = {}): OpenChecklist {
  return {
    channel: 'C0C9B0DEGDN', message_ts: '200.2', request_text: '하예린 코치 배정 필요합니다\n둘째 줄',
    checked_ids: ['t1', 't2'], created_at: hoursAgo(5), last_reminded_at: null, ...over,
  };
}

describe('pickDueChecklists (REQ-002)', () => {
  it('생성 후 3시간 가까이 지난 건은 대상', () => {
    expect(pickDueChecklists([row()], now)).toHaveLength(1);
  });

  it('생성된 지 얼마 안 된 건은 제외', () => {
    expect(pickDueChecklists([row({ created_at: hoursAgo(1) })], now)).toHaveLength(0);
  });

  it('마지막 알림이 3시간 미만 전이면 제외, 이상이면 대상', () => {
    expect(pickDueChecklists([row({ last_reminded_at: hoursAgo(1) })], now)).toHaveLength(0);
    expect(pickDueChecklists([row({ last_reminded_at: hoursAgo(3) })], now)).toHaveLength(1);
  });
});

describe('buildReminderText (REQ-002)', () => {
  it('요청 글 첫 줄, 남은 항목(순서대로), 스레드 링크를 담는다', () => {
    const text = buildReminderText([row()]);
    expect(text).toContain('하예린 코치 배정 필요합니다');
    expect(text).not.toContain('둘째 줄');
    expect(text).toContain('코치와 학생 매칭');
    expect(text).not.toContain('회원 가입 확인');
    expect(text).toContain('https://slack.com/archives/C0C9B0DEGDN/p2002');
    expect(text.indexOf('코치 초대')).toBeLessThan(text.indexOf('코치와 학생 매칭'));
  });

  it('여러 건이면 건수를 제목에 표시', () => {
    expect(buildReminderText([row(), row({ message_ts: '300.3' })])).toContain('2건');
  });
});
