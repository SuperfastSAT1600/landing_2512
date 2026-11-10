/** 알바생 연락 업무: 일일 스케줄 브리핑에서 연락할 학생·코치를 뽑는다 */
import type { BriefingPayload, PayloadEntry } from '@/app/api/cron/schedule-input-status/briefing-payload';

export type ContactTaskKind = 'coachRoom' | 'coach' | 'endingSoon' | 'noSchedule' | 'neverScheduled';

export interface ContactTask {
  /** 학생은 SFv2 profile id, 코치는 `coach:<코치 key>` (연락 기록이 학생과 섞이지 않게) */
  targetId: string;
  name: string;
  remainingHours?: number;
  coachNames?: string[];
  studentNames?: string[];
  lastDate?: string;
  isNew?: boolean;
}

export interface ContactTaskGroup {
  kind: ContactTaskKind;
  title: string;
  target: '학생' | '코치';
  tasks: ContactTask[];
}

type Coach = BriefingPayload['coaches'][number];

const unbookedStudents = (c: Coach) => c.students.filter(s => s.scheduledHours === 0 && s.remainingHours > 0);

/** 코치가 여럿인 학생은 한 줄로 모은다 */
function coachRoomTasks(coaches: Coach[]): ContactTask[] {
  const byStudent = new Map<string, ContactTask & { coachNames: string[] }>();
  for (const c of coaches) {
    for (const s of unbookedStudents(c)) {
      const task = byStudent.get(s.userId);
      if (task) task.coachNames.push(c.name);
      else byStudent.set(s.userId, { targetId: s.userId, name: s.name, remainingHours: s.remainingHours, coachNames: [c.name] });
    }
  }
  return [...byStudent.values()];
}

function scheduleTask(e: PayloadEntry): ContactTask {
  return {
    targetId: e.userId,
    name: e.name,
    remainingHours: e.remainingHours,
    ...(e.lastDate ? { lastDate: e.lastDate } : {}),
    ...(e.isNew ? { isNew: true } : {}),
  };
}

export function buildContactTasks(payload: BriefingPayload): ContactTaskGroup[] {
  const coachesWithUnbooked = payload.coaches.filter(c => unbookedStudents(c).length > 0);
  return [
    {
      kind: 'coachRoom', title: '코칭룸 미예약', target: '학생',
      tasks: coachRoomTasks(coachesWithUnbooked),
    },
    {
      kind: 'coach', title: '코칭룸 미예약 학생이 있는 코치', target: '코치',
      tasks: coachesWithUnbooked.map(c => ({ targetId: `coach:${c.key}`, name: c.name, studentNames: unbookedStudents(c).map(s => s.name) })),
    },
    { kind: 'endingSoon', title: '스터디홀/보캡 스케줄 곧 끝남', target: '학생', tasks: payload.endingSoon.map(scheduleTask) },
    { kind: 'noSchedule', title: '스터디홀/보캡 스케줄 없음', target: '학생', tasks: payload.noSchedule.map(scheduleTask) },
    { kind: 'neverScheduled', title: '스터디홀/보캡 한 번도 안 잡음', target: '학생', tasks: payload.neverScheduled.map(scheduleTask) },
  ];
}
