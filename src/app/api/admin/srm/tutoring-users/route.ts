import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { isAuthenticated } from '@/lib/server-auth';

export type TutoringStatus = 'unclassified' | 'onboarding' | 'active' | 'paused' | 'renewal_pending' | 'ended';

export interface TutoringUser {
  sfv2ProfileId: string;
  crmStudentId: string | null;
  name: string;
  grade: string | null;
  purchasedHours: number;
  refundedHours: number;
  usedHours: number;
  remainingHours: number;
  status: TutoringStatus;
  subjects: string[];
}

export interface UnlinkedTutoringUser {
  sfv2ProfileId: string;
  name: string;
  purchasedHours: number;
  remainingHours: number;
}

export interface TutoringUsersResponse {
  linked: TutoringUser[];
  unlinked: UnlinkedTutoringUser[];
}

// 복수 subject row → 대표 status 롤업
const STATUS_PRIORITY: TutoringStatus[] = ['active', 'onboarding', 'paused', 'renewal_pending', 'unclassified', 'ended'];

function rollupStatus(statuses: TutoringStatus[]): TutoringStatus {
  for (const s of STATUS_PRIORITY) {
    if (statuses.includes(s)) return s;
  }
  return 'unclassified';
}

async function scanAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
  onPage: (rows: T[]) => void,
): Promise<void> {
  let offset = 0;
  while (true) {
    const { data } = await build(offset, offset + 999);
    if (!data?.length) break;
    onPage(data);
    if (data.length < 1000) break;
    offset += 1000;
  }
}

async function fetchSubjectManagement(): Promise<Map<string, { status: TutoringStatus; subjects: string[] }>> {
  const rows: { student_id: string; subject: string; lifecycle_status: string }[] = [];
  await scanAll<{ student_id: string; subject: string; lifecycle_status: string }>(
    (f, t) => supabaseSFv2.schema('srm').from('subject_management').select('student_id, subject, lifecycle_status').range(f, t),
    (page) => rows.push(...page),
  );

  const byStudent = new Map<string, { statuses: TutoringStatus[]; subjects: string[] }>();
  for (const row of rows) {
    if (!row.student_id) continue;
    const entry = byStudent.get(row.student_id) ?? { statuses: [], subjects: [] };
    entry.statuses.push((row.lifecycle_status ?? 'unclassified') as TutoringStatus);
    if (row.subject && !entry.subjects.includes(row.subject)) entry.subjects.push(row.subject);
    byStudent.set(row.student_id, entry);
  }

  const result = new Map<string, { status: TutoringStatus; subjects: string[] }>();
  for (const [sid, { statuses, subjects }] of byStudent) {
    result.set(sid, { status: rollupStatus(statuses), subjects });
  }
  return result;
}

async function fetchPurchased() {
  const purchased = new Map<string, number>();
  await scanAll<{ student_id: string | null; hours: number }>(
    (f, t) => supabaseSFv2.from('payment_transactions').select('student_id, hours').gt('hours', 0).range(f, t),
    (rows) => {
      for (const row of rows) {
        if (!row.student_id) continue;
        purchased.set(row.student_id, (purchased.get(row.student_id) ?? 0) + (row.hours ?? 0));
      }
    },
  );
  return purchased;
}

async function fetchRefunded() {
  const refunded = new Map<string, number>();
  const refundRows: { payment_id: string; hours_refunded: number }[] = [];
  await scanAll<{ payment_id: string; hours_refunded: number }>(
    (f, t) => supabaseSFv2.from('payment_refunds').select('hours_refunded, payment_id').range(f, t),
    (rows) => refundRows.push(...rows),
  );
  for (let i = 0; i < refundRows.length; i += 1000) {
    const batch = refundRows.slice(i, i + 1000);
    const { data: payments } = await supabaseSFv2
      .from('payments').select('id, student_id').in('id', batch.map((r) => r.payment_id));
    const paymentToStudent = new Map((payments ?? []).map((p: { id: string; student_id: string | null }) => [p.id, p.student_id]));
    for (const row of batch) {
      const sid = paymentToStudent.get(row.payment_id);
      if (!sid) continue;
      refunded.set(sid, (refunded.get(sid) ?? 0) + (row.hours_refunded ?? 0));
    }
  }
  return refunded;
}

async function fetchUsed() {
  const used = new Map<string, number>();
  const eventMeta = new Map<string, number>();
  await scanAll<{ id: string; starts_at: string; ends_at: string }>(
    (f, t) => supabaseSFv2.from('scheduled_events').select('id, starts_at, ends_at').eq('status', 'completed').eq('category', 'coach_room').range(f, t),
    (rows) => {
      for (const e of rows) {
        const dur = (new Date(e.ends_at).getTime() - new Date(e.starts_at).getTime()) / 3_600_000;
        eventMeta.set(e.id, dur);
      }
    },
  );
  await scanAll<{ event_id: string; user_id: string }>(
    (f, t) => supabaseSFv2.from('scheduled_event_participants').select('event_id, user_id').range(f, t),
    (rows) => {
      for (const p of rows) {
        const dur = eventMeta.get(p.event_id);
        if (!dur) continue;
        used.set(p.user_id, (used.get(p.user_id) ?? 0) + dur);
      }
    },
  );
  return used;
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [subjectMap, purchased, refunded, used, crmResult] = await Promise.all([
      fetchSubjectManagement(),
      fetchPurchased(),
      fetchRefunded(),
      fetchUsed(),
      supabaseAdmin
        .from('students')
        .select('id, name, grade, sfv2_profile_id')
        .not('sfv2_profile_id', 'is', null),
    ]);

    const crmStudents = (crmResult.data ?? []) as {
      id: string;
      name: string;
      grade: string | null;
      sfv2_profile_id: string;
    }[];

    const linkedProfileIds = new Set(crmStudents.map((s) => s.sfv2_profile_id));

    const results: TutoringUser[] = [];

    for (const s of crmStudents) {
      const pid = s.sfv2_profile_id;
      const subjectInfo = subjectMap.get(pid);
      if (!subjectInfo) continue;

      const purchasedH = Math.round((purchased.get(pid) ?? 0) * 10) / 10;
      const refundedH = Math.round((refunded.get(pid) ?? 0) * 10) / 10;
      const usedH = Math.round((used.get(pid) ?? 0) * 10) / 10;
      const remainingH = Math.round(Math.max(0, purchasedH - refundedH - usedH) * 10) / 10;

      results.push({
        sfv2ProfileId: pid,
        crmStudentId: s.id,
        name: s.name,
        grade: s.grade,
        purchasedHours: purchasedH,
        refundedHours: refundedH,
        usedHours: usedH,
        remainingHours: remainingH,
        status: subjectInfo.status,
        subjects: subjectInfo.subjects,
      });
    }

    const statusOrder: Record<TutoringStatus, number> = {
      active: 0, onboarding: 1, paused: 2, renewal_pending: 3, unclassified: 4, ended: 5,
    };
    results.sort((a, b) =>
      statusOrder[a.status] !== statusOrder[b.status]
        ? statusOrder[a.status] - statusOrder[b.status]
        : a.name.localeCompare(b.name)
    );

    // 미연결: subject_management에 있지만 CRM 미매칭, ended 제외
    const unlinkedProfileIds = [...subjectMap.entries()]
      .filter(([pid, { status }]) => !linkedProfileIds.has(pid) && status !== 'ended')
      .map(([pid]) => pid);

    const unlinked: UnlinkedTutoringUser[] = [];
    if (unlinkedProfileIds.length > 0) {
      const { data: profiles } = await supabaseSFv2
        .from('profiles')
        .select('id, full_name')
        .in('id', unlinkedProfileIds);

      for (const p of profiles ?? []) {
        const purchasedH = Math.round((purchased.get(p.id) ?? 0) * 10) / 10;
        const refundedH = Math.round((refunded.get(p.id) ?? 0) * 10) / 10;
        const usedH = Math.round((used.get(p.id) ?? 0) * 10) / 10;
        const remainingH = Math.round(Math.max(0, purchasedH - refundedH - usedH) * 10) / 10;
        unlinked.push({ sfv2ProfileId: p.id, name: p.full_name ?? p.id, purchasedHours: purchasedH, remainingHours: remainingH });
      }
      unlinked.sort((a, b) => b.remainingHours - a.remainingHours || a.name.localeCompare(b.name));
    }

    return NextResponse.json({ linked: results, unlinked } satisfies TutoringUsersResponse);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
