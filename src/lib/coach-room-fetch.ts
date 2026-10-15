// SFv2에서 한 학생의 코치룸 장부 원본을 읽는다 — SRM Payment 상세와 같은 소스.
// 결제(payment_transactions)·계정(payments)·환불(payment_refunds)·수업(matching_students → matchings → scheduled_events).
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import type { LedgerInput } from '@/lib/coach-room-ledger';
import { fetchAllRows } from '@/lib/srm-test-center';

const LESSON_STATUSES = ['awaiting_confirmation', 'approved', 'completed'];

function rows<T>(res: { data: unknown; error: { message: string } | null }): T[] {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T[];
}

async function fetchLessons(profileId: string): Promise<LedgerInput['lessons']> {
  const ms = rows<{ matching_id: string }>(await supabaseSFv2.from('matching_students').select('matching_id').eq('student_id', profileId));
  const mids = [...new Set(ms.map((r) => r.matching_id))];
  if (!mids.length) return [];

  const [matchings, teachers, events] = await Promise.all([
    supabaseSFv2.from('matchings').select('id, subject').in('id', mids),
    supabaseSFv2.from('matching_teachers').select('matching_id, teacher_id, response').in('matching_id', mids),
    // PostgREST 1000행 상한 — 오래 다닌 학생도 잘리지 않게 끝까지 읽는다
    fetchAllRows((from, to) => supabaseSFv2.from('scheduled_events')
      .select('id, matching_id, assigned_teacher_id, starts_at, ends_at, status')
      .eq('category', 'coach_room').in('status', LESSON_STATUSES).in('matching_id', mids)
      .order('id').range(from, to)).then((data) => ({ data, error: null })),
  ]);
  const subjectByMatching = new Map(rows<{ id: string; subject: string | null }>(matchings).map((m) => [m.id, m.subject]));
  const teacherRows = rows<{ matching_id: string; teacher_id: string; response: string | null }>(teachers);
  const eventRows = rows<{ id: string; matching_id: string; assigned_teacher_id: string | null; starts_at: string; ends_at: string; status: string }>(events);

  const teacherIds = [...new Set([...teacherRows.map((t) => t.teacher_id), ...eventRows.map((e) => e.assigned_teacher_id).filter((x): x is string => !!x)])];
  const names = teacherIds.length
    ? rows<{ id: string; full_name: string | null }>(await supabaseSFv2.from('profiles').select('id, full_name').in('id', teacherIds))
    : [];
  const nameById = new Map(names.map((p) => [p.id, p.full_name]));
  // 배정 코치가 없으면 매칭의 수락 코치(없으면 첫 코치) — SRM과 같은 순서
  const matchingCoach = new Map<string, string>();
  for (const t of [...teacherRows].sort((a, b) => Number(b.response === 'accepted') - Number(a.response === 'accepted'))) {
    if (!matchingCoach.has(t.matching_id)) matchingCoach.set(t.matching_id, t.teacher_id);
  }

  return eventRows.map((e) => {
    const coachId = e.assigned_teacher_id ?? matchingCoach.get(e.matching_id) ?? null;
    return {
      id: e.id, subject: subjectByMatching.get(e.matching_id) ?? null,
      starts_at: e.starts_at, ends_at: e.ends_at, status: e.status,
      teacher: coachId ? nameById.get(coachId) ?? null : null,
    };
  });
}

export async function fetchCoachRoomLedgerInput(profileId: string): Promise<LedgerInput> {
  const [transactions, paymentsRes, lessons] = await Promise.all([
    fetchAllRows((from, to) => supabaseSFv2.from('payment_transactions').select('subject, hours, paid_at, product').eq('student_id', profileId).order('id').range(from, to))
      .then((data) => ({ data, error: null })),
    supabaseSFv2.from('payments').select('id, subject, management_status').eq('student_id', profileId),
    fetchLessons(profileId),
  ]);
  const payments = rows<LedgerInput['payments'][number]>(paymentsRes);
  const refunds = payments.length
    ? rows<LedgerInput['refunds'][number]>(await supabaseSFv2.from('payment_refunds').select('payment_id, hours_refunded, refunded_at, reason').in('payment_id', payments.map((p) => p.id)))
    : [];
  return { transactions: rows<LedgerInput['transactions'][number]>(transactions), payments, refunds, lessons };
}
