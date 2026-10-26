// 매칭(학생-코치 쌍)의 첫 코치룸 수업이 잡혔을 때 보내는 슬랙 알림의 순수 로직.
import { formatKst } from '@/lib/coach-prep-request';
import { formatInZone } from '@/lib/slack-coach-response';

export interface RecentLesson {
  id: string;
  matching_id: string;
  starts_at: string;
  assigned_teacher_id: string | null;
}

/** 조회 구간에 새로 만들어진 일정 중, 구간 이전에는 일정이 없던 매칭의 첫 수업(시작이 가장 빠른 것)만 */
export function pickNewFirstLessons(recent: RecentLesson[], priorMatchingIds: Set<string>): RecentLesson[] {
  const earliest = new Map<string, RecentLesson>();
  for (const l of recent) {
    if (priorMatchingIds.has(l.matching_id)) continue;
    const cur = earliest.get(l.matching_id);
    if (!cur || l.starts_at < cur.starts_at) earliest.set(l.matching_id, l);
  }
  return [...earliest.values()];
}

export interface FirstLessonNotice {
  studentNames: string[];
  coachName: string | null;
  startsAt: string;
  /** 학생 IANA 시간대. 없으면 현지 시각 줄을 생략한다 */
  studentTimezone: string | null;
}

export function buildFirstLessonText(n: FirstLessonNotice): string {
  const lines = [
    '📅 *첫 수업이 잡혔어요*',
    `*학생:* ${n.studentNames.join(', ')}  |  *코치:* ${n.coachName ?? '코치 미정'}`,
    `*첫 수업:* ${formatKst(n.startsAt)} (KST)`,
  ];
  if (n.studentTimezone && n.studentTimezone !== 'Asia/Seoul') lines.push(`*학생 시간(${n.studentTimezone}):* ${formatInZone(n.startsAt, n.studentTimezone)}`);
  return lines.join('\n');
}
