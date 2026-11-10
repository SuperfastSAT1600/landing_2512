import { buildCoachRoster } from '@/lib/coach-roster';
import { fetchCoachRosterInput } from '@/lib/coach-roster-fetch';
import { classifySchedules, type Briefing, type StudentSchedule } from './classify';
import { buildCoachRatios, type CoachRatio } from './coach-ratio';
import { fetchAllActiveStudentsMap, fetchFutureCoachRoomMinutes, fetchHadLessonUserIds, fetchRemainingHoursMap, fetchScheduleSummary } from './fetchers';

// 테스트 계정 — 알림 대상에서 제외
const EXCLUDED_STUDENTS = new Set(['박윤재']);

/** now 기준 스터디홀/보캡 세 목록과 코치별 코치룸 예약 비율(전일 대비 없음). 일일 cron 과 직원 업무 로그가 같이 쓴다. */
export async function computeScheduleBriefing(now: Date): Promise<{ briefing: Briefing; coachRatios: CoachRatio[] }> {
  const [activeMap, summary, hadLesson, rosterInput, coachRoomMinutes] = await Promise.all([
    fetchAllActiveStudentsMap(),
    fetchScheduleSummary(now),
    fetchHadLessonUserIds(now),
    fetchCoachRosterInput(),
    fetchFutureCoachRoomMinutes(now),
  ]);
  const roster = buildCoachRoster(rosterInput);

  const activeIds = [...activeMap].filter(([, name]) => !EXCLUDED_STUDENTS.has(name)).map(([id]) => id);
  const rosterIds = roster.coaches.flatMap(c => c.students.map(s => s.profileId));
  const remainingMap = await fetchRemainingHoursMap([...new Set([...activeIds, ...rosterIds])]);

  const students: StudentSchedule[] = activeIds.map(userId => ({
    userId,
    name: activeMap.get(userId)!,
    remainingHours: remainingMap.get(userId) ?? 0,
    everScheduled: summary.everScheduled.has(userId),
    isNew: !hadLesson.has(userId),
    studyHallMinutes: summary.studyHallMinutes.get(userId) ?? 0,
    vocabMinutes: summary.vocabMinutes.get(userId) ?? 0,
    lastDate: summary.lastDateByUser.get(userId) ?? null,
  }));

  return { briefing: classifySchedules(students, now), coachRatios: buildCoachRatios(roster, coachRoomMinutes, remainingMap) };
}
