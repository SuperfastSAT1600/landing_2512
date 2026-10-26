import { describe, it, expect } from 'vitest';
import { togetherMinutes, attendanceHeld, heldLessonIds, isPastLesson, type RoomSession } from '../coach-room-attendance';

const lesson = { matchingId: 'm1', startsAt: '2026-10-13T02:00:00Z', endsAt: '2026-10-13T03:00:00Z' };
const s = (role: 'teacher' | 'student', a: string, b: string, matchingId = 'm1'): RoomSession => ({ matching_id: matchingId, role, started_at: a, ended_at: b });

// REQ-004 (crm-coach-room-card)
describe('togetherMinutes', () => {
  it('Joy 10/13: 코치 1회 + 학생 재접속 여러 번 → 겹친 시간', () => {
    const sessions = [
      s('teacher', '2026-10-13T01:59:00Z', '2026-10-13T03:03:00Z'),
      s('student', '2026-10-13T02:00:00Z', '2026-10-13T02:22:00Z'),
      s('student', '2026-10-13T02:23:00Z', '2026-10-13T02:44:00Z'),
      s('student', '2026-10-13T02:45:00Z', '2026-10-13T03:03:00Z'),
    ];
    expect(togetherMinutes(lesson, sessions)).toBe(61);
  });

  it('수업 창(앞뒤 30분) 밖과 다른 매칭은 세지 않는다', () => {
    const sessions = [
      s('teacher', '2026-10-13T00:00:00Z', '2026-10-13T05:00:00Z'),
      s('student', '2026-10-13T00:00:00Z', '2026-10-13T05:00:00Z'),
      s('student', '2026-10-13T02:00:00Z', '2026-10-13T03:00:00Z', 'other'),
    ];
    expect(togetherMinutes(lesson, sessions)).toBe(120);
  });

  it('코치만 있었으면 0', () => {
    expect(togetherMinutes(lesson, [s('teacher', '2026-10-13T02:00:00Z', '2026-10-13T03:00:00Z')])).toBe(0);
  });

  it('겹치는 같은 역할 구간은 두 번 세지 않는다', () => {
    const sessions = [
      s('teacher', '2026-10-13T02:00:00Z', '2026-10-13T03:00:00Z'),
      s('student', '2026-10-13T02:00:00Z', '2026-10-13T02:40:00Z'),
      s('student', '2026-10-13T02:10:00Z', '2026-10-13T02:30:00Z'),
    ];
    expect(togetherMinutes(lesson, sessions)).toBe(40);
  });
});

describe('attendanceHeld', () => {
  it('20분 이상 함께면 진행', () => {
    expect(attendanceHeld(20, 60)).toBe(true);
    expect(attendanceHeld(19, 60)).toBe(false);
  });
  it('길이 0 수업도 함께 접속이 없으면 진행 아님', () => {
    expect(attendanceHeld(0, 0)).toBe(false);
  });
  it('30분 수업은 절반(15분)이면 진행', () => {
    expect(attendanceHeld(15, 30)).toBe(true);
    expect(attendanceHeld(14, 30)).toBe(false);
  });
});

// REQ-001 (crm-renewal-held-hours)
describe('heldLessonIds', () => {
  const NOW = '2026-10-22T10:00:00Z';
  const L = (id: string, status: string, startsAt: string, endsAt: string, matching_id = 'm1') =>
    ({ id, matching_id, status, starts_at: startsAt, ends_at: endsAt });
  const together = [
    s('teacher', '2026-10-22T01:30:00Z', '2026-10-22T03:30:00Z'),
    s('student', '2026-10-22T01:30:00Z', '2026-10-22T03:30:00Z'),
  ];

  it('완료 처리 안 된 지난 수업 중 함께 접속한 수업만 고른다', () => {
    const lessons = [
      L('held', 'approved', '2026-10-22T01:30:00Z', '2026-10-22T03:30:00Z'),
      L('pending', 'awaiting_confirmation', '2026-10-22T01:30:00Z', '2026-10-22T03:30:00Z'),
      L('done', 'completed', '2026-10-22T01:30:00Z', '2026-10-22T03:30:00Z'),
      L('nobody', 'approved', '2026-10-21T01:30:00Z', '2026-10-21T03:30:00Z'),
    ];
    expect([...heldLessonIds(lessons, together, NOW)].sort()).toEqual(['held', 'pending']);
  });

  it('끝나고 30분이 안 지난 수업은 아직 판정하지 않는다', () => {
    const lessons = [L('just', 'approved', '2026-10-22T07:40:00Z', '2026-10-22T09:40:00Z')];
    const sessions = [
      s('teacher', '2026-10-22T07:40:00Z', '2026-10-22T09:40:00Z'),
      s('student', '2026-10-22T07:40:00Z', '2026-10-22T09:40:00Z'),
    ];
    expect(heldLessonIds(lessons, sessions, NOW).size).toBe(0);
  });

  it('닫히지 않은 접속은 지금까지 있던 것으로 본다', () => {
    const lessons = [L('open', 'approved', '2026-10-22T07:00:00Z', '2026-10-22T09:00:00Z')];
    const sessions: RoomSession[] = [
      { matching_id: 'm1', role: 'teacher', started_at: '2026-10-22T07:00:00Z', ended_at: null },
      { matching_id: 'm1', role: 'student', started_at: '2026-10-22T07:00:00Z', ended_at: null },
    ];
    expect([...heldLessonIds(lessons, sessions, NOW)]).toEqual(['open']);
  });
});

describe('isPastLesson', () => {
  it('끝나고 30분이 지나야 지난 수업', () => {
    expect(isPastLesson('2026-10-22T09:30:00Z', Date.parse('2026-10-22T10:00:00Z'))).toBe(true);
    expect(isPastLesson('2026-10-22T09:31:00Z', Date.parse('2026-10-22T10:00:00Z'))).toBe(false);
  });
});
