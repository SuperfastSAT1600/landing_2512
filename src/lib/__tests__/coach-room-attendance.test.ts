import { describe, it, expect } from 'vitest';
import { togetherMinutes, attendanceHeld, type RoomSession } from '../coach-room-attendance';

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
  it('30분 수업은 절반(15분)이면 진행', () => {
    expect(attendanceHeld(15, 30)).toBe(true);
    expect(attendanceHeld(14, 30)).toBe(false);
  });
});
