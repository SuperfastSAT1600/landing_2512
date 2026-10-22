import type { CoachRoster } from '@/lib/coach-roster';

export interface StudentRatio {
  userId: string;
  name: string;
  scheduledHours: number;
  remainingHours: number;
  /** 예약 ÷ 잔여 (%), 잔여가 0이면 null */
  ratio: number | null;
}

export interface CoachRatio {
  key: string;
  name: string;
  studentCount: number;
  /** 지금 이후 예약된 코치룸 시간 합 */
  scheduledHours: number;
  /** 잔여 수업권 시간 합 */
  remainingHours: number;
  /** 예약 ÷ 잔여 (%), 잔여가 0이면 null */
  ratio: number | null;
  /** 전일 대비 변동 (%p), 비교할 전일 값이 없으면 null */
  deltaPp: number | null;
  /** 비율이 낮은 순 (잔여 0은 맨 뒤) */
  students: StudentRatio[];
}

export interface SnapshotValues {
  scheduled_hours: number;
  remaining_hours: number;
}

const COUNTED_STATUSES = new Set(['active', 'onboarding']);

const percent = (scheduled: number, remaining: number): number | null =>
  remaining > 0 ? (scheduled / remaining) * 100 : null;

function byRatioAscending(a: StudentRatio, b: StudentRatio): number {
  if (a.ratio === null || b.ratio === null) return Number(a.ratio === null) - Number(b.ratio === null) || a.name.localeCompare(b.name, 'ko');
  return a.ratio - b.ratio || a.name.localeCompare(b.name, 'ko');
}

/** 재원·온보딩 학생이 있는 코치별 비율. 코치 순서는 코치 현황 정렬 그대로. */
export function buildCoachRatios(
  roster: CoachRoster,
  scheduledMinutes: Map<string, number>,
  remainingHours: Map<string, number>,
): CoachRatio[] {
  const ratios: CoachRatio[] = [];
  for (const coach of roster.coaches) {
    const students = coach.students.filter(s => COUNTED_STATUSES.has(s.status));
    if (!students.length) continue;

    const perStudent = students.map((s): StudentRatio => {
      const scheduled = (scheduledMinutes.get(s.profileId) ?? 0) / 60;
      const remainingOfStudent = remainingHours.get(s.profileId) ?? 0;
      return { userId: s.profileId, name: s.name, scheduledHours: scheduled, remainingHours: remainingOfStudent, ratio: percent(scheduled, remainingOfStudent) };
    }).sort(byRatioAscending);
    const scheduledHours = perStudent.reduce((sum, s) => sum + s.scheduledHours, 0);
    const remaining = perStudent.reduce((sum, s) => sum + s.remainingHours, 0);
    ratios.push({
      key: coach.key,
      name: coach.name,
      studentCount: students.length,
      scheduledHours,
      remainingHours: remaining,
      ratio: percent(scheduledHours, remaining),
      deltaPp: null,
      students: perStudent,
    });
  }
  return ratios;
}

export function applyDelta(ratios: CoachRatio[], previous: Map<string, SnapshotValues>): CoachRatio[] {
  return ratios.map(r => {
    const prev = previous.get(r.key);
    const prevRatio = prev ? percent(prev.scheduled_hours, prev.remaining_hours) : null;
    return { ...r, deltaPp: r.ratio !== null && prevRatio !== null ? r.ratio - prevRatio : null };
  });
}
