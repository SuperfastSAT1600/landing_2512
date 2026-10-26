import { NextRequest, NextResponse } from 'next/server';
import { buildFirstLessonText, pickNewFirstLessons } from '@/lib/first-lesson-notice';
import { postFirstLessonNotice } from '@/lib/slack-first-lesson';
import { fetchMatchingContext, fetchPriorMatchingIds, fetchRecentLessons } from './fetch';
import { claimMatching, releaseMatching } from './store';

/** 일시 장애 후에도 놓치지 않도록 cron 주기보다 넉넉히 본다. 중복은 first_lesson_notices 가 막는다 */
const LOOKBACK_MS = 6 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const since = new Date(Date.now() - LOOKBACK_MS);
  const results = { sent: 0, skipped: 0, errors: 0 };
  try {
    const recent = await fetchRecentLessons(since);
    const prior = await fetchPriorMatchingIds([...new Set(recent.map((l) => l.matching_id))], since);
    for (const lesson of pickNewFirstLessons(recent, prior)) {
      if (!(await claimMatching(lesson.matching_id))) {
        results.skipped++;
        continue;
      }
      try {
        const ctx = await fetchMatchingContext(lesson.matching_id, lesson.assigned_teacher_id);
        await postFirstLessonNotice(buildFirstLessonText({ ...ctx, startsAt: lesson.starts_at }));
        results.sent++;
      } catch (err) {
        console.error(`[first-lesson-notice] 전송 실패: ${lesson.matching_id}`, err);
        await releaseMatching(lesson.matching_id).catch((e) => console.error('[first-lesson-notice] release 실패', e));
        results.errors++;
      }
    }
    return NextResponse.json({ ok: true, ...results });
  } catch (err) {
    console.error('[first-lesson-notice] 오류:', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
