import { NextRequest, NextResponse } from 'next/server';
import { notifyScheduleInputStatus } from '@/lib/slack-sfv2';
import { classifySchedules, type StudentSchedule } from './classify';
import { fetchAllActiveStudentsMap, fetchHadLessonUserIds, fetchRemainingHoursMap, fetchScheduleSummary } from './fetchers';

// 테스트 계정 — 알림 대상에서 제외
const EXCLUDED_STUDENTS = new Set(['박윤재']);

/**
 * GET /api/cron/schedule-input-status
 * Vercel Cron — 매일 23:00 UTC (= 08:00 KST)
 *
 * 재원 학생의 스터디홀/보캡 일정을 발송 시각 기준으로 세 목록으로 나눠 슬랙에 올린다.
 * 1. 스케줄 종료 임박  2. 지금 스케줄 없음  3. 스케줄이 한 번도 없음
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const [activeMap, summary, hadLesson] = await Promise.all([
      fetchAllActiveStudentsMap(),
      fetchScheduleSummary(now),
      fetchHadLessonUserIds(now),
    ]);

    const activeIds = [...activeMap].filter(([, name]) => !EXCLUDED_STUDENTS.has(name)).map(([id]) => id);
    const remainingMap = await fetchRemainingHoursMap(activeIds);

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

    await notifyScheduleInputStatus(briefing, now);

    return NextResponse.json({
      ok: true,
      endingSoon: briefing.endingSoon.length,
      noSchedule: briefing.noSchedule.length,
      neverScheduled: briefing.neverScheduled.length,
    });
  } catch (error) {
    console.error('[cron/schedule-input-status] error:', error);
    return NextResponse.json({ error: 'Internal server error', detail: String(error) }, { status: 500 });
  }
}
