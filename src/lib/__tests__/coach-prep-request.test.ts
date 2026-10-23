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
  deadlineProgress,
  isSameResponse,
  formatKst,
  kstInputDayLabel,
  lessonOptions,
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
  const F1 = '2099-01-01T10:00:00+09:00';
  const S1 = '2099-01-03T10:00:00+09:00';
  const F2 = '2099-01-02T10:00:00+09:00';
  const S2 = '2099-01-04T10:00:00+09:00';
  const opt1 = { first_lesson_at: F1, second_lesson_at: S1 };
  const ok = (body: object) => RespondSchema.safeParse({ token, ...body }).success;

  it('REQ-002: 수락은 옵션 1의 첫 수업·두 번째 수업이 모두 필요하다', () => {
    expect(ok({ action: 'accept', ...opt1 })).toBe(true);
    expect(ok({ action: 'accept' })).toBe(false);
    expect(ok({ action: 'accept', first_lesson_at: F1 })).toBe(false);
    expect(ok({ action: 'accept', second_lesson_at: S1 })).toBe(false);
  });

  it('REQ-002: 옵션 2는 선택이고, 넣으려면 첫 수업·두 번째 수업을 모두 넣는다', () => {
    expect(ok({ action: 'accept', ...opt1, option2_first_lesson_at: F2, option2_second_lesson_at: S2 })).toBe(true);
    expect(ok({ action: 'accept', ...opt1, option2_first_lesson_at: F2 })).toBe(false);
    expect(ok({ action: 'accept', ...opt1, option2_second_lesson_at: S2 })).toBe(false);
  });

  it('REQ-002: 두 번째 수업은 첫 수업보다 늦어야 한다(옵션 1·2 각각)', () => {
    expect(ok({ action: 'accept', first_lesson_at: S1, second_lesson_at: F1 })).toBe(false);
    expect(ok({ action: 'accept', first_lesson_at: F1, second_lesson_at: F1 })).toBe(false);
    expect(ok({ action: 'accept', ...opt1, option2_first_lesson_at: S2, option2_second_lesson_at: F2 })).toBe(false);
  });

  it('REQ-002: 과거 일시는 거부한다', () => {
    expect(ok({ action: 'accept', first_lesson_at: PAST, second_lesson_at: S1 })).toBe(false);
    expect(ok({ action: 'accept', ...opt1, option2_first_lesson_at: PAST, option2_second_lesson_at: S2 })).toBe(false);
  });

  it('REQ-002: 옵션 1과 같은 조합을 옵션 2로 또 넣으면 거부한다(표기가 달라도 같은 시각이면 같다)', () => {
    expect(ok({ action: 'accept', ...opt1, option2_first_lesson_at: F1, option2_second_lesson_at: S1 })).toBe(false);
    expect(ok({ action: 'accept', ...opt1, option2_first_lesson_at: '2099-01-01T01:00:00Z', option2_second_lesson_at: '2099-01-03T01:00:00Z' })).toBe(false);
    expect(ok({ action: 'accept', ...opt1, option2_first_lesson_at: F1, option2_second_lesson_at: S2 })).toBe(true);
  });

  it('REQ-002: 거절은 수업 일시 없이 사유(500자 이하)만 받는다', () => {
    expect(ok({ action: 'decline', reason: '일정이 안 맞아요' })).toBe(true);
    expect(ok({ action: 'decline' })).toBe(true);
    expect(ok({ action: 'decline', first_lesson_at: F1 })).toBe(false);
    expect(ok({ action: 'decline', option2_first_lesson_at: F2, option2_second_lesson_at: S2 })).toBe(false);
    expect(ok({ action: 'decline', reason: 'a'.repeat(501) })).toBe(false);
  });

  it('REQ-002: 알 수 없는 action은 거부한다', () => {
    expect(ok({ action: 'maybe' })).toBe(false);
  });
});

describe('요일·날짜 표기', () => {
  it('REQ-005: formatKst는 KST 날짜에 요일을 붙인다', () => {
    expect(formatKst('2026-10-26T09:00:00+09:00')).toBe('10/26(월) 09:00');
    expect(formatKst('2026-10-25T20:00:00Z')).toBe('10/26(월) 05:00'); // UTC 일요일 밤은 KST 월요일 새벽
  });

  it('REQ-005: kstInputDayLabel은 입력값의 날짜와 요일을 돌려준다', () => {
    expect(kstInputDayLabel('2026-10-26T09:00')).toBe('10/26(월)');
    expect(kstInputDayLabel('2026-10-31T23:30')).toBe('10/31(토)');
    expect(kstInputDayLabel('')).toBe('');
  });
});

describe('lessonOptions', () => {
  const t = (over = {}) => ({ first_lesson_at: null, second_lesson_at: null, option2_first_lesson_at: null, option2_second_lesson_at: null, ...over });

  it('REQ-003: 값이 있는 옵션만 순서대로 돌려준다', () => {
    expect(lessonOptions(t())).toEqual([]);
    expect(lessonOptions(t({ first_lesson_at: 'a', second_lesson_at: 'b' }))).toEqual([{ label: '옵션 1', first: 'a', second: 'b' }]);
    expect(lessonOptions(t({ first_lesson_at: 'a', second_lesson_at: 'b', option2_first_lesson_at: 'c', option2_second_lesson_at: 'd' })).map((o) => o.label))
      .toEqual(['옵션 1', '옵션 2']);
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
    expect(msg).toContain('10/21(수)');
    expect(msg).toContain('09:00');
    expect(msg.startsWith('<신규 학생 배정 안내>')).toBe(true);
  });

  it('코치 한 명이면 이름 없이 링크만 붙인다', () => {
    const msg = buildLinkMessage('https://x.com', 'stu-1', [{ coachName: '김혜지', token: 'tok1' }], '2026-10-24T15:00:00+09:00');
    expect(msg).toBe([
      '<신규 학생 배정 안내>',
      '',
      '신규 학생 자료를 확인하시고 10/24(토) 15:00(KST)까지 수업 가능 여부와 희망하시는 첫 수업·두 번째 수업 일정(옵션 1, 2)을 남겨 주세요!',
      '',
      'https://x.com/coach-prep/stu-1?t=tok1',
    ].join('\n'));
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
  const times = (over = {}) => ({ first_lesson_at: null, second_lesson_at: null, option2_first_lesson_at: null, option2_second_lesson_at: null, ...over });
  const saved = {
    status: 'accepted', decline_reason: null,
    ...times({ first_lesson_at: '2099-01-01T01:00:00+00:00', second_lesson_at: '2099-01-03T01:00:00+00:00' }),
  };
  const same = times({ first_lesson_at: '2099-01-01T10:00:00+09:00', second_lesson_at: '2099-01-03T10:00:00+09:00' });

  it('REQ-003: 같은 시각이면 표기(+00:00 / +09:00)가 달라도 같은 응답', () => {
    expect(isSameResponse(saved, 'accepted', same, null)).toBe(true);
  });

  it('REQ-003: 상태·옵션 1·옵션 2·사유 중 하나라도 다르면 다른 응답', () => {
    expect(isSameResponse(saved, 'declined', times(), null)).toBe(false);
    expect(isSameResponse(saved, 'accepted', { ...same, second_lesson_at: '2099-01-04T10:00:00+09:00' }, null)).toBe(false);
    expect(isSameResponse(saved, 'accepted', { ...same, option2_first_lesson_at: '2099-01-02T10:00:00+09:00', option2_second_lesson_at: '2099-01-05T10:00:00+09:00' }, null)).toBe(false);
    expect(isSameResponse({ ...saved, status: 'declined', decline_reason: '일정', ...times() }, 'declined', times(), '다른 사유')).toBe(false);
  });

  it('REQ-003: 거절을 같은 사유로 다시 보내면 같은 응답, 처음 응답(pending)은 항상 다르다', () => {
    expect(isSameResponse({ status: 'declined', decline_reason: '일정', ...times() }, 'declined', times(), '일정')).toBe(true);
    expect(isSameResponse({ status: 'pending', decline_reason: null, ...times() }, 'declined', times(), null)).toBe(false);
  });
});

// REQ-002
describe('deadlineProgress', () => {
  const start = Date.parse('2026-10-20T00:00:00Z');
  const end = Date.parse('2026-10-21T00:00:00Z');
  const at = (ms: number) => deadlineProgress('2026-10-20T00:00:00Z', '2026-10-21T00:00:00Z', ms);

  it('생성부터 마감까지 지난 비율을 돌려준다', () => {
    expect(at(start)).toBe(0);
    expect(at(start + (end - start) / 4)).toBeCloseTo(0.25);
    expect(at(end)).toBe(1);
  });

  it('범위를 벗어나면 0과 1로 자른다', () => {
    expect(at(start - 1000)).toBe(0);
    expect(at(end + 1000)).toBe(1);
  });

  it('기간이 0 이하이면 마감 전 0, 마감 후 1', () => {
    expect(deadlineProgress('2026-10-21T00:00:00Z', '2026-10-20T00:00:00Z', start - 1)).toBe(0);
    expect(deadlineProgress('2026-10-21T00:00:00Z', '2026-10-20T00:00:00Z', end + 1)).toBe(1);
  });
});
