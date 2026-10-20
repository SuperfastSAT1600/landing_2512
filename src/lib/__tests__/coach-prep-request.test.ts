import { describe, it, expect } from 'vitest';
import {
  CreateRequestsSchema,
  RespondSchema,
  generateRequestToken,
  isClosed,
  kstInputToIso,
  isoToKstInput,
  defaultDeadlineInput,
  buildLinkMessage,
  formatRemaining,
  isSameResponse,
} from '../coach-prep-request';

const FUTURE = '2099-01-01T10:00:00+09:00';
const PAST = '2000-01-01T10:00:00+09:00';

describe('CreateRequestsSchema', () => {
  it('REQ-001: 코치 1~5명과 미래 마감 일시를 받는다', () => {
    const r = CreateRequestsSchema.safeParse({ coach_slugs: ['a', 'b'], deadline_at: FUTURE });
    expect(r.success).toBe(true);
  });

  it('REQ-001: 코치가 없거나 5명을 넘거나 중복이면 거부한다', () => {
    expect(CreateRequestsSchema.safeParse({ coach_slugs: [], deadline_at: FUTURE }).success).toBe(false);
    expect(CreateRequestsSchema.safeParse({ coach_slugs: ['a', 'b', 'c', 'd', 'e', 'f'], deadline_at: FUTURE }).success).toBe(false);
    expect(CreateRequestsSchema.safeParse({ coach_slugs: ['a', 'a'], deadline_at: FUTURE }).success).toBe(false);
  });

  it('REQ-001: 과거 마감 일시는 거부한다', () => {
    expect(CreateRequestsSchema.safeParse({ coach_slugs: ['a'], deadline_at: PAST }).success).toBe(false);
  });
});

describe('RespondSchema', () => {
  const token = 'x'.repeat(32);

  it('REQ-001: 수락은 미래의 첫 수업 일시가 필요하다', () => {
    expect(RespondSchema.safeParse({ token, action: 'accept', first_lesson_at: FUTURE }).success).toBe(true);
    expect(RespondSchema.safeParse({ token, action: 'accept' }).success).toBe(false);
    expect(RespondSchema.safeParse({ token, action: 'accept', first_lesson_at: PAST }).success).toBe(false);
  });

  it('REQ-001: 거절은 첫 수업 일시 없이 사유(500자 이하)만 받는다', () => {
    expect(RespondSchema.safeParse({ token, action: 'decline', reason: '일정이 안 맞아요' }).success).toBe(true);
    expect(RespondSchema.safeParse({ token, action: 'decline' }).success).toBe(true);
    expect(RespondSchema.safeParse({ token, action: 'decline', first_lesson_at: FUTURE }).success).toBe(false);
    expect(RespondSchema.safeParse({ token, action: 'decline', reason: 'a'.repeat(501) }).success).toBe(false);
  });

  it('REQ-001: 알 수 없는 action은 거부한다', () => {
    expect(RespondSchema.safeParse({ token, action: 'maybe' }).success).toBe(false);
  });
});

describe('generateRequestToken', () => {
  it('REQ-001: 호출마다 다른 base64url 32자 이상 토큰', () => {
    const a = generateRequestToken();
    const b = generateRequestToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{32,}$/);
  });
});

describe('isClosed', () => {
  const now = new Date('2026-10-20T00:00:00Z');
  it('REQ-001: 마감 시각이 지나면 true, 이전이면 false', () => {
    expect(isClosed('2026-10-19T23:59:59Z', now)).toBe(true);
    expect(isClosed('2026-10-20T00:00:01Z', now)).toBe(false);
  });
});

describe('KST 입력 변환', () => {
  it('REQ-001: datetime-local 값을 +09:00 ISO로 바꾼다', () => {
    expect(kstInputToIso('2026-10-25T14:30')).toBe('2026-10-25T14:30:00+09:00');
  });

  it('REQ-001: 형식이 틀리면 null', () => {
    expect(kstInputToIso('')).toBeNull();
    expect(kstInputToIso('2026-10-25')).toBeNull();
    expect(kstInputToIso('abc')).toBeNull();
  });

  it('REQ-001: ISO를 KST datetime-local 값으로 되돌린다', () => {
    expect(isoToKstInput('2026-10-25T05:30:00Z')).toBe('2026-10-25T14:30');
  });

  it('REQ-001: 기본 마감은 지금부터 24시간 뒤(KST)', () => {
    expect(defaultDeadlineInput(new Date('2026-10-20T00:00:00Z'))).toBe('2026-10-21T09:00');
  });
});

describe('buildLinkMessage', () => {
  it('REQ-001: 코치별 개인 링크 안내문을 만든다', () => {
    const msg = buildLinkMessage('https://x.com', 'stu-1', [
      { coachName: '김혜지', token: 'tok1' },
      { coachName: '유승준', token: 'tok2' },
    ], '2026-10-21T09:00:00+09:00');
    expect(msg).toContain('김혜지: https://x.com/coach-prep/stu-1?t=tok1');
    expect(msg).toContain('유승준: https://x.com/coach-prep/stu-1?t=tok2');
    expect(msg).toContain('10/21');
    expect(msg).toContain('09:00');
  });
});

describe('formatRemaining', () => {
  const MIN = 60_000;
  it('REQ-007: 남은 시간을 일/시간/분으로 줄여 보여준다', () => {
    expect(formatRemaining(0)).toBe('마감');
    expect(formatRemaining(-5 * MIN)).toBe('마감');
    expect(formatRemaining(45 * MIN)).toBe('45분');
    expect(formatRemaining(90 * MIN)).toBe('1시간 30분');
    expect(formatRemaining(26 * 60 * MIN)).toBe('1일 2시간');
  });

  it('REQ-007: 1분 미만은 "1분 미만"', () => {
    expect(formatRemaining(30_000)).toBe('1분 미만');
  });
});

describe('isSameResponse', () => {
  const saved = { status: 'accepted', first_lesson_at: '2099-01-01T01:00:00+00:00', decline_reason: null };

  it('REQ-004: 같은 시각이면 표기(+00:00 / +09:00)가 달라도 같은 응답', () => {
    expect(isSameResponse(saved, 'accepted', '2099-01-01T10:00:00+09:00', null)).toBe(true);
  });

  it('REQ-004: 상태·시각·사유 중 하나라도 다르면 다른 응답', () => {
    expect(isSameResponse(saved, 'declined', null, null)).toBe(false);
    expect(isSameResponse(saved, 'accepted', '2099-01-02T10:00:00+09:00', null)).toBe(false);
    expect(isSameResponse({ status: 'declined', first_lesson_at: null, decline_reason: '일정' }, 'declined', null, '다른 사유')).toBe(false);
  });

  it('REQ-004: 거절을 같은 사유로 다시 보내면 같은 응답, 처음 응답(pending)은 항상 다르다', () => {
    expect(isSameResponse({ status: 'declined', first_lesson_at: null, decline_reason: '일정' }, 'declined', null, '일정')).toBe(true);
    expect(isSameResponse({ status: 'pending', first_lesson_at: null, decline_reason: null }, 'declined', null, null)).toBe(false);
  });
});
