import { describe, it, expect } from 'vitest';
import { formatInTimeZone, buildStudentMessage, buildCoachConfirmMessage, SCHEDULE_PROMPT_EN, SCHEDULE_PROMPT_KO } from '../coach-prep-student-message';

// 2026-10-26 10:00 KST = 2026-10-26 01:00 UTC = 2026-10-25 21:00 EDT = 2026-10-25 18:00 PDT
const KST_MON_10 = '2026-10-26T10:00:00+09:00';
const KST_WED_10 = '2026-10-28T10:00:00+09:00';
const LINK = 'https://app.superfastsat.io/report/abcDEF123_-xyz456789AB';

const base = {
  coachName: 'Jasmine', timezone: 'America/New_York', scheduleUrl: LINK,
  options: [{ label: '옵션 1', first: KST_MON_10, second: KST_WED_10 }],
};

describe('formatInTimeZone', () => {
  // REQ-001
  it('학생 시간대로 날짜·요일이 바뀐다 (한국어)', () => {
    expect(formatInTimeZone(KST_MON_10, 'America/New_York', 'ko')).toBe('10/25(일) 오후 9:00');
  });

  it('영어 표기', () => {
    expect(formatInTimeZone(KST_MON_10, 'America/New_York', 'en')).toBe('Sun 10/25, 9:00 PM');
  });

  it('DST가 끝난 뒤에는 오프셋이 달라진다 (11/2 이후 EST)', () => {
    expect(formatInTimeZone('2026-11-03T10:00:00+09:00', 'America/New_York', 'en')).toBe('Mon 11/2, 8:00 PM');
  });

  it('자정은 12:00 AM, 정오는 12:00 PM', () => {
    expect(formatInTimeZone('2026-10-26T13:00:00+09:00', 'Asia/Seoul', 'en')).toBe('Mon 10/26, 1:00 PM');
    expect(formatInTimeZone('2026-10-26T00:00:00+09:00', 'Asia/Seoul', 'en')).toBe('Mon 10/26, 12:00 AM');
    expect(formatInTimeZone('2026-10-26T12:00:00+09:00', 'Asia/Seoul', 'ko')).toBe('10/26(월) 오후 12:00');
  });
});

describe('buildStudentMessage', () => {
  // REQ-002
  it('한국어 학생: 학생 시간대 일정 + 한국어 안내문 + 링크', () => {
    const msg = buildStudentMessage({ ...base, language: 'korean' });
    expect(msg).toContain('Jasmine 코치님');
    expect(msg).toContain('America/New_York');
    expect(msg).toContain('옵션 1: 첫 수업 10/25(일) 오후 9:00 · 두 번째 수업 10/27(화) 오후 9:00');
    expect(msg.endsWith(`${SCHEDULE_PROMPT_KO}\n${LINK}`)).toBe(true);
    expect(msg).not.toContain('Study Hall" (for homework)');
  });

  it('영어 학생: 영어 문구와 지정된 영어 안내문', () => {
    const msg = buildStudentMessage({ ...base, language: 'english' });
    expect(msg).toContain('Jasmine');
    expect(msg).toContain('Option 1: 1st lesson Sun 10/25, 9:00 PM · 2nd lesson Tue 10/27, 9:00 PM');
    expect(msg.endsWith(`${SCHEDULE_PROMPT_EN}\n${LINK}`)).toBe(true);
  });

  it('안내문은 요청된 원문 그대로다', () => {
    expect(SCHEDULE_PROMPT_EN).toBe('You can schedule your "Study Hall" (for homework) and "Vocab Gym" (for vocabulary practice) through the link below. Please take a moment to input the hours you can study this week!');
    expect(SCHEDULE_PROMPT_KO).toBe('그리고 우리가 숙제를 할 Study Hall과 단어 공부를 할 Vocab Gym 스케줄을 등록해주세요! 매주 공부할 수 있는 시간을 상황에 맞게 최대한으로 넣어보자구요!!');
  });

  it('언어가 any이거나 비어 있으면 한국어', () => {
    expect(buildStudentMessage({ ...base, language: 'any' })).toContain('코치님');
    expect(buildStudentMessage({ ...base, language: null })).toContain('코치님');
  });

  it('옵션 2가 있으면 둘 다 나열한다', () => {
    const msg = buildStudentMessage({
      ...base, language: 'korean',
      options: [...base.options, { label: '옵션 2', first: '2026-10-27T10:00:00+09:00', second: '2026-10-29T10:00:00+09:00' }],
    });
    expect(msg).toContain('옵션 2: 첫 수업');
  });

  it('시간대를 모르면 KST로 표기하고 그렇게 밝힌다', () => {
    const msg = buildStudentMessage({ ...base, language: 'korean', timezone: null });
    expect(msg).toContain('한국 시간(KST)');
    expect(msg).toContain('10/26(월) 오전 10:00');
  });

  it('링크가 없으면 링크 줄 없이 안내문까지만', () => {
    const msg = buildStudentMessage({ ...base, language: 'korean', scheduleUrl: null });
    expect(msg.endsWith(SCHEDULE_PROMPT_KO)).toBe(true);
  });
});

describe('buildCoachConfirmMessage', () => {
  it('코치 시간대로 옵션 시간을 보여 준다', () => {
    const m = buildCoachConfirmMessage({ coachName: 'Jasmine', timezone: 'America/New_York', options: base.options });
    expect(m).toContain('코치님 현지 시간 America/New_York');
    expect(m).toContain('옵션 1: 첫 수업 10/25(일) 오후 9:00 / 두 번째 수업 10/27(화) 오후 9:00');
  });

  it('시간대를 모르면 KST로 안내한다', () => {
    const m = buildCoachConfirmMessage({ coachName: 'Jasmine', timezone: null, options: base.options });
    expect(m).toContain('한국 시간(KST) 기준');
    expect(m).toContain('10/26(월) 오전 10:00');
  });
});
