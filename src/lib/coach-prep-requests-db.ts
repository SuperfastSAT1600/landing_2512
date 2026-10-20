// coach_prep_requests DB 접근 — 라우트가 얇게 유지되도록 쿼리만 모았다. (supabase/migrations/157_coach_prep_requests.sql, 158_coach_prep_lesson_options.sql)
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateRequestToken } from '@/lib/coach-prep-request';
import type { CoachPrepRequestRow, CoachPrepRequestView, CoachPrepStatus, LessonTimes } from '@/types/coach-prep';

const COLS =
  'id, student_id, coach_slug, token, deadline_at, status, first_lesson_at, second_lesson_at, option2_first_lesson_at, option2_second_lesson_at, decline_reason, first_opened_at, responded_at, selected_at, created_at';

export interface CoachRef { slug: string; name: string }

export async function studentExists(studentId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from('students').select('id').eq('id', studentId).maybeSingle();
  return !!data;
}

export async function getStudentName(studentId: string): Promise<string> {
  const { data } = await supabaseAdmin.from('students').select('name').eq('id', studentId).maybeSingle();
  return (data as { name?: string } | null)?.name ?? studentId;
}

/** 활성 코치만. 입력 순서를 유지한다. */
export async function findActiveCoaches(slugs: string[]): Promise<CoachRef[]> {
  const { data, error } = await supabaseAdmin.from('coaches').select('slug, name').in('slug', slugs).eq('is_active', true);
  if (error) throw new Error(error.message);
  const byslug = new Map((data ?? []).map((c) => [c.slug as string, c.name as string]));
  return slugs.filter((s) => byslug.has(s)).map((slug) => ({ slug, name: byslug.get(slug)! }));
}

async function withCoachNames(rows: CoachPrepRequestRow[]): Promise<CoachPrepRequestView[]> {
  if (rows.length === 0) return [];
  const slugs = [...new Set(rows.map((r) => r.coach_slug))];
  const { data } = await supabaseAdmin.from('coaches').select('slug, name').in('slug', slugs);
  const names = new Map((data ?? []).map((c) => [c.slug as string, c.name as string]));
  return rows.map((r) => ({ ...r, coach_name: names.get(r.coach_slug) ?? r.coach_slug }));
}

export async function listRequests(studentId: string): Promise<CoachPrepRequestView[]> {
  const { data, error } = await supabaseAdmin
    .from('coach_prep_requests').select(COLS).eq('student_id', studentId)
    // 한 번에 만든 행은 created_at이 같아 순서가 흔들리므로 코치 slug로 고정한다
    .order('created_at', { ascending: true }).order('coach_slug', { ascending: true });
  if (error) throw new Error(error.message);
  return withCoachNames((data ?? []) as CoachPrepRequestRow[]);
}

/** 이미 있는 (학생, 코치)는 토큰·응답을 유지한 채 마감만 갱신하고, 없는 코치만 새 토큰으로 만든다. */
export async function upsertRequests(studentId: string, coaches: CoachRef[], deadlineAt: string): Promise<CoachPrepRequestView[]> {
  const slugs = coaches.map((c) => c.slug);
  const { data: existing, error: selErr } = await supabaseAdmin
    .from('coach_prep_requests').select('coach_slug').eq('student_id', studentId).in('coach_slug', slugs);
  if (selErr) throw new Error(selErr.message);

  const have = new Set((existing ?? []).map((r) => r.coach_slug as string));
  if (have.size > 0) {
    const { error } = await supabaseAdmin
      .from('coach_prep_requests').update({ deadline_at: deadlineAt }).eq('student_id', studentId).in('coach_slug', [...have]);
    if (error) throw new Error(error.message);
  }

  const fresh = coaches.filter((c) => !have.has(c.slug)).map((c) => ({
    student_id: studentId, coach_slug: c.slug, token: generateRequestToken(), deadline_at: deadlineAt,
  }));
  if (fresh.length > 0) {
    // 동시에 두 번 눌러도 (student_id, coach_slug) 중복으로 실패하지 않고 먼저 만들어진 행을 그대로 둔다
    const { error } = await supabaseAdmin
      .from('coach_prep_requests').upsert(fresh, { onConflict: 'student_id,coach_slug', ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }

  const all = await listRequests(studentId);
  return slugs.map((s) => all.find((r) => r.coach_slug === s)!).filter(Boolean);
}

/** 없는 토큰은 null, DB 오류는 던진다 — 호출부가 "죽은 링크"와 "일시 장애"를 구분한다. */
export async function findByToken(token: string): Promise<CoachPrepRequestView | null> {
  const { data, error } = await supabaseAdmin.from('coach_prep_requests').select(COLS).eq('token', token).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return (await withCoachNames([data as CoachPrepRequestRow]))[0];
}

/** 첫 열람 시각만 기록한다(이미 있으면 그대로). 링크 미리보기 봇이 아니라 열린 브라우저에서 호출된다. */
export async function markOpenedByToken(token: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('coach_prep_requests').update({ first_opened_at: new Date().toISOString() }).eq('token', token).is('first_opened_at', null);
  if (error) throw new Error(error.message);
}

export interface ResponsePatch extends LessonTimes {
  status: Exclude<CoachPrepStatus, 'pending'>;
  decline_reason: string | null;
}

/**
 * 마감 전인 행만 갱신한다(확인과 저장 사이에 마감이 지나는 경쟁을 막는다) — 갱신된 행이 없으면 'closed'.
 * 거절로 바뀌면 담당자 선택도 풀어 DB 제약(선택은 수락만)을 지킨다.
 */
export async function saveResponse(id: string, patch: ResponsePatch): Promise<CoachPrepRequestView | 'closed'> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('coach_prep_requests')
    .update({ ...patch, responded_at: now, ...(patch.status === 'declined' ? { selected_at: null } : {}) })
    .eq('id', id).gt('deadline_at', now).select(COLS).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return 'closed';
  return (await withCoachNames([data as CoachPrepRequestRow]))[0];
}

export type SelectResult = 'ok' | 'not_found' | 'not_accepted' | 'conflict';

// 23505: 다른 코치가 먼저 선택됨(학생당 1명 인덱스), 23514: 그 사이 거절로 바뀜(선택은 수락만 CHECK)
const SELECTION_CONFLICT_CODES = new Set(['23505', '23514']);

/** 학생당 한 명만 선택된다 — 기존 선택을 먼저 풀고 새로 건다. */
export async function selectRequest(studentId: string, requestId: string): Promise<SelectResult> {
  const { data } = await supabaseAdmin
    .from('coach_prep_requests').select('id, status').eq('id', requestId).eq('student_id', studentId).maybeSingle();
  if (!data) return 'not_found';
  if (data.status !== 'accepted') return 'not_accepted';

  const clear = await supabaseAdmin
    .from('coach_prep_requests').update({ selected_at: null }).eq('student_id', studentId).neq('id', requestId).not('selected_at', 'is', null);
  if (clear.error) throw new Error(clear.error.message);
  const set = await supabaseAdmin
    .from('coach_prep_requests').update({ selected_at: new Date().toISOString() }).eq('id', requestId);
  if (set.error) {
    if (SELECTION_CONFLICT_CODES.has(set.error.code)) return 'conflict';
    throw new Error(set.error.message);
  }
  return 'ok';
}
