import { describe, it, expect } from 'vitest';
import { formatInZone } from '@/lib/slack-coach-response';
import { pickNewFirstLessons, buildFirstLessonText, type RecentLesson } from '@/lib/first-lesson-notice';

const ev = (matching_id: string, starts_at: string, extra: Partial<RecentLesson> = {}): RecentLesson => ({
  id: `${matching_id}-${starts_at}`, matching_id, starts_at, assigned_teacher_id: null, ...extra,
});

describe('pickNewFirstLessons', () => {
  it('REQ-001: 이전에 일정이 있던 매칭은 제외한다', () => {
    const out = pickNewFirstLessons([ev('m1', '2026-11-02T05:00:00Z'), ev('m2', '2026-11-03T05:00:00Z')], new Set(['m1']));
    expect(out.map((l) => l.matching_id)).toEqual(['m2']);
  });

  it('REQ-001: 같은 매칭의 여러 일정은 시작이 가장 빠른 한 건만 돌려준다', () => {
    const out = pickNewFirstLessons([ev('m1', '2026-11-09T05:00:00Z'), ev('m1', '2026-11-02T05:00:00Z')], new Set());
    expect(out).toHaveLength(1);
    expect(out[0].starts_at).toBe('2026-11-02T05:00:00Z');
  });

  it('REQ-001: 일정이 없으면 빈 배열', () => {
    expect(pickNewFirstLessons([], new Set())).toEqual([]);
  });
});

describe('buildFirstLessonText', () => {
  const base = { studentNames: ['김학생'], coachName: '박코치', startsAt: '2026-11-02T05:00:00Z' };

  it('REQ-002: 학생·코치와 KST, 학생 현지 시각을 담는다', () => {
    const t = buildFirstLessonText({ ...base, studentTimezone: 'America/Los_Angeles' });
    expect(t).toContain('김학생');
    expect(t).toContain('박코치');
    expect(t).toContain('14:00'); // 05:00Z = KST 14:00
    expect(t).toContain('(KST)');
    expect(t).toContain('PST'); // 11/1 21:00 PST (DST 종료 후)
  });

  it('REQ-002: 시간대가 없으면 학생 현지 줄을 생략한다', () => {
    expect(buildFirstLessonText({ ...base, studentTimezone: null })).not.toContain('학생 시간');
  });

  it('REQ-002: 코치가 없으면 코치 미정, 학생이 여럿이면 모두 표기', () => {
    const t = buildFirstLessonText({ ...base, coachName: null, studentNames: ['김학생', '이학생'], studentTimezone: null });
    expect(t).toContain('코치 미정');
    expect(t).toContain('김학생, 이학생');
  });
});

describe('학생 현지 시각 표기', () => {
  it('REQ-002: 정각도 분을 두 자리로 보여 준다', () => {
    expect(formatInZone('2026-11-02T05:00:00Z', 'America/Los_Angeles')).toContain('21:00');
  });

  it('REQ-002: 학생이 한국 시간대면 현지 줄을 생략한다', () => {
    const t = buildFirstLessonText({ studentNames: ['김'], coachName: 'c', startsAt: '2026-11-02T05:00:00Z', studentTimezone: 'Asia/Seoul' });
    expect(t).not.toContain('학생 시간');
  });
});
