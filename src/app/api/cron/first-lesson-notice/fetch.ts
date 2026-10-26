import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { sfv2Timezone } from '@/lib/coach-prep-student-context';
import type { RecentLesson } from '@/lib/first-lesson-notice';

const ACTIVE = ['awaiting_confirmation', 'approved', 'completed'];

function rows<T>(res: { data: unknown; error: { message: string } | null }, label: string): T[] {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
  return (res.data ?? []) as T[];
}

const PAGE = 1000;

/** PostgREST 1000행 상한을 넘겨도 잘리지 않게 끝까지 읽는다. 실패하면 던진다(잘린 결과로 오판하지 않게) */
async function allPages<T>(label: string, page: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const batch = rows<T>(await page(from, from + PAGE - 1), label);
    out.push(...batch);
    if (batch.length < PAGE) return out;
  }
}

/** since 이후 생성된 코치룸 일정 (취소 제외) */
export async function fetchRecentLessons(since: Date): Promise<RecentLesson[]> {
  return allPages<RecentLesson>('recent coach_room', (from, to) => supabaseSFv2.from('scheduled_events')
    .select('id, matching_id, starts_at, assigned_teacher_id')
    .eq('category', 'coach_room').in('status', ACTIVE).not('matching_id', 'is', null)
    .gte('created_at', since.toISOString()).order('id').range(from, to));
}

/** since 이전에 만들어진 코치룸 일정(취소 포함)이 하나라도 있는 매칭 */
export async function fetchPriorMatchingIds(matchingIds: string[], since: Date): Promise<Set<string>> {
  if (!matchingIds.length) return new Set();
  const data = await allPages<{ matching_id: string }>('prior coach_room', (from, to) => supabaseSFv2.from('scheduled_events')
    .select('matching_id').eq('category', 'coach_room').in('matching_id', matchingIds)
    .lt('created_at', since.toISOString()).order('id').range(from, to));
  return new Set(data.map((r) => r.matching_id));
}

export interface MatchingContext {
  studentNames: string[];
  coachName: string | null;
  studentTimezone: string | null;
}

export async function fetchMatchingContext(matchingId: string, assignedTeacherId: string | null): Promise<MatchingContext> {
  const [students, teachers] = await Promise.all([
    supabaseSFv2.from('matching_students').select('student_id').eq('matching_id', matchingId),
    supabaseSFv2.from('matching_teachers').select('teacher_id, response').eq('matching_id', matchingId),
  ]);
  const studentIds = rows<{ student_id: string }>(students, 'matching_students').map((r) => r.student_id);
  const teacherRows = rows<{ teacher_id: string; response: string | null }>(teachers, 'matching_teachers');
  // 거절·미응답 코치를 담당으로 잘못 표기하지 않는다 — 확정된 코치가 없으면 "코치 미정"
  const coachId = assignedTeacherId ?? teacherRows.find((t) => t.response === 'accepted')?.teacher_id ?? null;

  const ids = [...studentIds, ...(coachId ? [coachId] : [])];
  const profiles = ids.length
    ? rows<{ id: string; full_name: string | null }>(await supabaseSFv2.from('profiles').select('id, full_name').in('id', ids), 'profiles')
    : [];
  const nameOf = new Map(profiles.map((p) => [p.id, p.full_name]));
  return {
    studentNames: studentIds.map((id) => nameOf.get(id) ?? '이름 없음'),
    coachName: coachId ? nameOf.get(coachId) ?? null : null,
    // 시간대 조회가 실패해도 알림 자체는 나가야 한다 — 현지 시각 줄만 빠진다
    studentTimezone: studentIds[0] ? await sfv2Timezone(studentIds[0]).catch(() => null) : null,
  };
}
