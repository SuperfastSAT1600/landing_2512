import { NextRequest, NextResponse } from 'next/server';
import { notifyScheduleInputStatus } from '@/lib/slack-sfv2';
import { buildCoachRoster } from '@/lib/coach-roster';
import { fetchCoachRosterInput } from '@/lib/coach-roster-fetch';
import { classifySchedules, type StudentSchedule } from './classify';
import { applyDelta, buildCoachRatios, type CoachRatio } from './coach-ratio';
import { kstDate, loadSnapshot, saveSnapshot, yesterdayKstDate } from './coach-snapshots';
import { fetchAllActiveStudentsMap, fetchFutureCoachRoomMinutes, fetchHadLessonUserIds, fetchRemainingHoursMap, fetchScheduleSummary } from './fetchers';

// 테스트 계정 — 알림 대상에서 제외
const EXCLUDED_STUDENTS = new Set(['박윤재']);

/**
 * GET /api/cron/schedule-input-status
 * Vercel Cron — 매일 23:00 UTC (= 08:00 KST)
 *
 * 재원 학생의 스터디홀/보캡 일정을 발송 시각 기준으로 세 목록으로 나눠 슬랙에 올린다.
 * 1. 스케줄 종료 임박  2. 지금 스케줄 없음  3. 스케줄이 한 번도 없음
 * 이어서 코치별 "예약된 코치룸 시간 ÷ 잔여 수업권" 비율과 전일 대비 변동을 붙인다.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
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
      name: activeMap.get(userId)!,
      remainingHours: remainingMap.get(userId) ?? 0,
      everScheduled: summary.everScheduled.has(userId),
      isNew: !hadLesson.has(userId),
      studyHallMinutes: summary.studyHallMinutes.get(userId) ?? 0,
      vocabMinutes: summary.vocabMinutes.get(userId) ?? 0,
      lastDate: summary.lastDateByUser.get(userId) ?? null,
    }));

    const briefing = classifySchedules(students, now);
    console.log(`[cron/schedule-input-status] ending-soon=${briefing.endingSoon.length} | no-schedule=${briefing.noSchedule.length} | never=${briefing.neverScheduled.length}`);

    const coachRatios = await withPreviousDay(buildCoachRatios(roster, coachRoomMinutes, remainingMap), now);

    await notifyScheduleInputStatus(briefing, coachRatios, now);

    return NextResponse.json({
      ok: true,
      endingSoon: briefing.endingSoon.length,
      noSchedule: briefing.noSchedule.length,
      neverScheduled: briefing.neverScheduled.length,
      coaches: coachRatios.length,
    });
  } catch (error) {
    console.error('[cron/schedule-input-status] error:', error);
    return NextResponse.json({ error: 'Internal server error', detail: String(error) }, { status: 500 });
  }
}

/**
 * 전일 스냅샷과 비교한 뒤 오늘 값을 저장한다.
 * 스냅샷 테이블은 부가 정보라 읽기·쓰기에 실패해도 브리핑 본문은 발송한다 (변동치는 '-'로 표시).
 */
async function withPreviousDay(ratios: CoachRatio[], now: Date): Promise<CoachRatio[]> {
  let result = ratios;
  try {
    result = applyDelta(ratios, await loadSnapshot(yesterdayKstDate(now)));
  } catch (error) {
    console.error('[cron/schedule-input-status] snapshot load failed:', error);
  }
  try {
    await saveSnapshot(kstDate(now), ratios);
  } catch (error) {
    console.error('[cron/schedule-input-status] snapshot save failed:', error);
  }
  return result;
}
