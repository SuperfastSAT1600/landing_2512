// 코치 현황 원본 — SFv2 매칭·결제 상태와 CRM 코치·학생을 한 번에 읽는다.
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { scanAllPages } from '@/lib/supabase-scan';
import type { RosterInput } from '@/lib/coach-roster';

// UUID 100개 ≈ 3.7KB — 프록시 URL 길이 한도(8KB) 안쪽
const IN_CHUNK = 100;
const LISTED = new Set(['active', 'onboarding', 'paused']);

function chunks<T>(xs: T[]): T[][] {
  return Array.from({ length: Math.ceil(xs.length / IN_CHUNK) }, (_, i) => xs.slice(i * IN_CHUNK, i * IN_CHUNK + IN_CHUNK));
}

function rows<T>(res: { data: unknown; error: { message: string } | null }): T[] {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T[];
}

async function fetchCoaches(): Promise<RosterInput['coaches']> {
  // sort_order는 마이그레이션 156 전에는 없다 — '*'로 읽어 없으면 등록순으로 대체한다
  const data = rows<Record<string, unknown>>(await supabaseAdmin.from('coaches').select('*'));
  return data.map((c) => ({
    slug: String(c.slug), name: String(c.name ?? c.slug), v2_user_id: (c.v2_user_id as string | null) ?? null,
    is_active: c.is_active !== false, sort_order: typeof c.sort_order === 'number' ? c.sort_order : null,
    created_at: String(c.created_at ?? ''),
  }));
}

/** 수락 코치가 없는 활성 매칭 → 가장 최근 coach_room 담당 교사 */
async function fetchLastEventTeacher(matchingIds: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const ids of chunks(matchingIds)) {
    // PostgREST는 1000행에서 조용히 자른다 — 끝까지 읽고, 최근 순으로 매칭별 첫 행을 쓴다
    const events = await scanAllPages<{ matching_id: string; assigned_teacher_id: string }>((f, t, c) => supabaseSFv2.from('scheduled_events')
      .select('matching_id, assigned_teacher_id', c).eq('category', 'coach_room').in('matching_id', ids)
      .not('assigned_teacher_id', 'is', null).order('starts_at', { ascending: false }).order('id').range(f, t));
    for (const e of events) out[e.matching_id] ??= e.assigned_teacher_id;
  }
  return out;
}

async function fetchNames(ids: string[]): Promise<Record<string, string | null>> {
  const lists = await Promise.all(chunks(ids).map(async (part) =>
    rows<{ id: string; full_name: string | null }>(await supabaseSFv2.from('profiles').select('id, full_name').in('id', part))));
  return Object.fromEntries(lists.flat().map((p) => [p.id, p.full_name]));
}

export async function fetchCoachRosterInput(): Promise<RosterInput> {
  const [coaches, crmStudents, matchings, matchingTeachers, matchingStudents, payments] = await Promise.all([
    fetchCoaches(),
    scanAllPages<RosterInput['crmStudents'][number]>((f, t, c) => supabaseAdmin.from('students')
      .select('id, name, sfv2_profile_id', c).not('sfv2_profile_id', 'is', null).order('id').range(f, t)),
    scanAllPages<RosterInput['matchings'][number]>((f, t, c) =>
      supabaseSFv2.from('matchings').select('id, status, subject', c).order('id').range(f, t)),
    scanAllPages<RosterInput['matchingTeachers'][number]>((f, t, c) => supabaseSFv2.from('matching_teachers')
      .select('matching_id, teacher_id, response', c).order('matching_id').order('teacher_id').range(f, t)),
    scanAllPages<RosterInput['matchingStudents'][number]>((f, t, c) => supabaseSFv2.from('matching_students')
      .select('matching_id, student_id', c).order('matching_id').order('student_id').range(f, t)),
    scanAllPages<RosterInput['payments'][number]>((f, t, c) => supabaseSFv2.from('payments')
      .select('student_id, subject, management_status', c).order('id').range(f, t)),
  ]);

  const active = matchings.filter((m) => m.status === 'active').map((m) => m.id);
  const accepted = new Set(matchingTeachers.filter((t) => t.response === 'accepted').map((t) => t.matching_id));
  const lastEventTeacher = await fetchLastEventTeacher(active.filter((id) => !accepted.has(id)));

  // 이름이 필요한 프로필: 명단에 오를 수 있는 학생 + 매칭 교사(CRM 미등록 교사 카드용)
  const activeSet = new Set(active);
  const nameIds = new Set<string>([
    ...payments.filter((p) => p.student_id && LISTED.has(p.management_status ?? '')).map((p) => p.student_id!),
    ...matchingTeachers.filter((t) => activeSet.has(t.matching_id)).map((t) => t.teacher_id),
    ...Object.values(lastEventTeacher),
  ]);
  const profileNames = await fetchNames([...nameIds]);

  return { coaches, matchings, matchingTeachers, matchingStudents, lastEventTeacher, payments, profileNames, crmStudents };
}
