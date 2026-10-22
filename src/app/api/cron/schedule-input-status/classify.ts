export const ENDING_SOON_MS = 2 * 24 * 60 * 60 * 1000;

export interface StudentSchedule {
  name: string;
  remainingHours: number;
  everScheduled: boolean;
  /** 코치룸 1회차 수업을 아직 받지 않은 신규 학생 */
  isNew: boolean;
  studyHallMinutes: number;
  vocabMinutes: number;
  /** 기준 시각 이후 마지막 스터디홀/보캡 시작 시각, 미래 일정이 없으면 null */
  lastDate: Date | null;
}

export interface BriefingEntry {
  name: string;
  remainingHours: number;
  isNew: boolean;
  studyHallMinutes: number;
  vocabMinutes: number;
  lastDate: Date | null;
}

export interface Briefing {
  endingSoon: BriefingEntry[];
  noSchedule: BriefingEntry[];
  neverScheduled: BriefingEntry[];
}

function byRemainingHours(a: BriefingEntry, b: BriefingEntry): number {
  return a.remainingHours - b.remainingHours || a.name.localeCompare(b.name, 'ko');
}

/** 종료 임박(미래 일정 있음, 마지막이 48h 이내) / 지금 없음(과거엔 있었음) / 한 번도 없음 */
export function classifySchedules(students: StudentSchedule[], now: Date): Briefing {
  const soon = now.getTime() + ENDING_SOON_MS;
  const briefing: Briefing = { endingSoon: [], noSchedule: [], neverScheduled: [] };

  for (const s of students) {
    const entry: BriefingEntry = {
      name: s.name,
      remainingHours: s.remainingHours,
      isNew: s.isNew,
      studyHallMinutes: s.studyHallMinutes,
      vocabMinutes: s.vocabMinutes,
      lastDate: s.lastDate,
    };
    if (s.lastDate) {
      if (s.lastDate.getTime() < soon) briefing.endingSoon.push(entry);
    } else if (s.everScheduled) {
      briefing.noSchedule.push(entry);
    } else {
      briefing.neverScheduled.push(entry);
    }
  }

  briefing.endingSoon.sort(byRemainingHours);
  briefing.noSchedule.sort(byRemainingHours);
  briefing.neverScheduled.sort(byRemainingHours);
  return briefing;
}
