import { describe, it, expect } from 'vitest';
import {
  kstDateStr,
  isActionDoneToday,
  todaysMemos,
  type ConsultationEntry,
} from '@/types/crm';

// 기준 시각: 2026-06-10T05:00:00Z = KST 2026-06-10 14:00
const NOW = Date.parse('2026-06-10T05:00:00Z');

describe('kstDateStr', () => {
  it('UTC를 KST(+9) 날짜로 변환한다', () => {
    expect(kstDateStr(Date.parse('2026-06-10T05:00:00Z'))).toBe('2026-06-10');
  });

  it('KST 자정 직후(UTC 전날 15:00)는 다음 날짜로 넘어간다', () => {
    // 2026-06-09T15:00Z = KST 2026-06-10 00:00
    expect(kstDateStr(Date.parse('2026-06-09T15:00:00Z'))).toBe('2026-06-10');
  });

  it('KST 자정 직전(UTC 전날 14:59)은 전날짜로 남는다', () => {
    expect(kstDateStr(Date.parse('2026-06-09T14:59:00Z'))).toBe('2026-06-09');
  });
});

describe('isActionDoneToday', () => {
  it('done_at이 없으면 false', () => {
    expect(isActionDoneToday({ daily_action_done_at: null }, NOW)).toBe(false);
  });

  it('KST 오늘이면 true', () => {
    expect(
      isActionDoneToday({ daily_action_done_at: '2026-06-10T01:00:00Z' }, NOW)
    ).toBe(true);
  });

  it('KST 자정 경계: 전날 15:30Z(=KST 오늘 00:30)는 오늘로 판정', () => {
    expect(
      isActionDoneToday({ daily_action_done_at: '2026-06-09T15:30:00Z' }, NOW)
    ).toBe(true);
  });

  it('KST 어제(전날 14:30Z = KST 어제 23:30)는 false', () => {
    expect(
      isActionDoneToday({ daily_action_done_at: '2026-06-09T14:30:00Z' }, NOW)
    ).toBe(false);
  });

  it('잘못된 날짜 문자열은 false', () => {
    expect(isActionDoneToday({ daily_action_done_at: 'not-a-date' }, NOW)).toBe(false);
  });
});

describe('todaysMemos', () => {
  const memo = (id: string, created_at: string): ConsultationEntry => ({
    id,
    created_at,
    raw_memo: `memo-${id}`,
    published: false,
  });

  it('오늘(KST) 작성된 메모만 반환한다', () => {
    const entries = [
      memo('a', '2026-06-10T02:00:00Z'), // 오늘
      memo('b', '2026-06-09T10:00:00Z'), // 어제 (KST 어제 19:00)
      memo('c', '2026-06-09T15:10:00Z'), // KST 오늘 00:10
    ];
    const result = todaysMemos({ consultation_timeline: entries }, NOW);
    expect(result.map((e) => e.id).sort()).toEqual(['a', 'c']);
  });

  it('최신순(created_at desc)으로 정렬한다', () => {
    const entries = [
      memo('older', '2026-06-10T01:00:00Z'),
      memo('newer', '2026-06-10T04:00:00Z'),
    ];
    const result = todaysMemos({ consultation_timeline: entries }, NOW);
    expect(result.map((e) => e.id)).toEqual(['newer', 'older']);
  });

  it('빈 타임라인은 빈 배열', () => {
    expect(todaysMemos({ consultation_timeline: [] }, NOW)).toEqual([]);
  });
});
