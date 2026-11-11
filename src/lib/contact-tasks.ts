/** 수업 관리 업무: 스케줄 데이터에서 연락할 학생(용건별)과 코치를 뽑는다 */
import type { BriefingPayload, PayloadEntry } from '@/app/api/cron/schedule-input-status/briefing-payload';

export const REASON_KINDS = ['coachRoom', 'endingSoon', 'noSchedule', 'neverScheduled'] as const;
export type ReasonKind = (typeof REASON_KINDS)[number];

const LABELS: Record<string, string> = {
  coachRoom: '코칭룸 미예약',
  endingSoon: '스터디홀/보캡 곧 끝남',
  noSchedule: '스터디홀/보캡 없음',
  neverScheduled: '스터디홀/보캡 한 번도 안 잡음',
  coach: '코치 연락',
  other: '기타',
};

/** 용건(연락 기록의 list_key) 이름. 모르는 값은 그대로 */
export const reasonLabel = (key: string): string => LABELS[key] ?? key;

export interface Reason {
  kind: ReasonKind;
  coachNames?: string[];
  lastDate?: string;
  isNew?: boolean;
}

export interface StudentTask {
  studentId: string;
  name: string;
  remainingHours: number;
  /** 신규인데 코칭룸·스터디홀·보캡을 모두 안 잡은 학생. 맨 위에 둔다 */
  topPriority: boolean;
  reasons: Reason[];
}

export interface CoachTask {
  /** `coach:<코치 key>` — 연락 기록이 학생과 섞이지 않게 */
  targetId: string;
  name: string;
  studentNames: string[];
}

export interface ContactTasks {
  students: StudentTask[];
  coaches: CoachTask[];
}

type Coach = BriefingPayload['coaches'][number];

const unbookedStudents = (c: Coach) => c.students.filter(s => s.scheduledHours === 0 && s.remainingHours > 0);

function scheduleReason(kind: ReasonKind, e: PayloadEntry): Reason {
  return { kind, ...(e.lastDate ? { lastDate: e.lastDate } : {}), ...(e.isNew ? { isNew: true } : {}) };
}

const isTopPriority = (reasons: Reason[]) =>
  reasons.some(r => r.kind === 'coachRoom') && reasons.some(r => r.kind === 'neverScheduled' && r.isNew);

/**
 * 학생마다 한 줄. 최우선(신규 + 코칭룸 미예약 + 스터디홀·보캡 한 번도 안 잡음) → 용건이 많은 학생 순.
 * 같으면 코칭룸 미예약 → 곧 끝남 → 없음 → 한 번도 안 잡음 순으로 처음 나온 자리를 지킨다
 */
export function buildContactTasks(payload: BriefingPayload): ContactTasks {
  const byStudent = new Map<string, StudentTask>();
  const add = (studentId: string, name: string, remainingHours: number, reason: Reason) => {
    const task = byStudent.get(studentId) ?? { studentId, name, remainingHours, topPriority: false, reasons: [] };
    byStudent.set(studentId, task);
    const same = task.reasons.find(r => r.kind === reason.kind);
    if (same?.coachNames && reason.coachNames) same.coachNames.push(...reason.coachNames);
    else if (!same) task.reasons.push(reason);
  };

  const coachesWithUnbooked = payload.coaches.filter(c => unbookedStudents(c).length > 0);
  for (const c of coachesWithUnbooked) {
    for (const s of unbookedStudents(c)) add(s.userId, s.name, s.remainingHours, { kind: 'coachRoom', coachNames: [c.name] });
  }
  for (const kind of ['endingSoon', 'noSchedule', 'neverScheduled'] as const) {
    for (const e of payload[kind]) add(e.userId, e.name, e.remainingHours, scheduleReason(kind, e));
  }

  const students = [...byStudent.values()].map(t => ({ ...t, topPriority: isTopPriority(t.reasons) }));
  // Array.prototype.sort 는 안정 정렬이라 같은 순위는 처음 나온 순서를 지킨다
  students.sort((a, b) => Number(b.topPriority) - Number(a.topPriority) || b.reasons.length - a.reasons.length);
  return {
    students,
    coaches: coachesWithUnbooked.map(c => ({ targetId: `coach:${c.key}`, name: c.name, studentNames: unbookedStudents(c).map(s => s.name) })),
  };
}
