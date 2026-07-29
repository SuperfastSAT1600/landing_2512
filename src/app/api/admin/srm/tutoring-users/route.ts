import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { isAuthenticated } from '@/lib/server-auth';

export type TutoringStatus = 'active' | 'paused' | 'partial_end' | 'sales' | 'ended';

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
}

export interface UnlinkedTutoringUser {
  sfv2ProfileId: string;
  name: string;
  purchasedHours: number;
}

export interface TutoringUsersResponse {
  linked: TutoringUser[];
  unlinked: UnlinkedTutoringUser[];
}

async function fetchV2Hours(): Promise<{
  purchased: Map<string, number>;
  refunded: Map<string, number>;
  used: Map<string, number>;
}> {
  // 1. 구매 시간: payment_transactions.hours by student_id
  const purchased = new Map<string, number>();
  let offset = 0;
  while (true) {
    const { data } = await supabaseSFv2
      .from('payment_transactions')
      .select('student_id, hours')
      .gt('hours', 0)
      .range(offset, offset + 999);
    if (!data?.length) break;
    for (const row of data as { student_id: string | null; hours: number }[]) {
      if (!row.student_id) continue;
      purchased.set(row.student_id, (purchased.get(row.student_id) ?? 0) + (row.hours ?? 0));
    }
    if (data.length < 1000) break;
    offset += 1000;
  }

  // 2. 환불 시간: payment_refunds.hours_refunded → payments.student_id
  const refunded = new Map<string, number>();
  offset = 0;
  while (true) {
    const { data } = await supabaseSFv2
      .from('payment_refunds')
      .select('hours_refunded, payment_id')
      .range(offset, offset + 999);
    if (!data?.length) break;
    const paymentIds = (data as { payment_id: string }[]).map((r) => r.payment_id);
    const { data: payments } = await supabaseSFv2
      .from('payments')
      .select('id, student_id')
      .in('id', paymentIds);
    const paymentToStudent = new Map((payments ?? []).map((p: { id: string; student_id: string | null }) => [p.id, p.student_id]));
    for (const row of data as { payment_id: string; hours_refunded: number }[]) {
      const sid = paymentToStudent.get(row.payment_id);
      if (!sid) continue;
      refunded.set(sid, (refunded.get(sid) ?? 0) + (row.hours_refunded ?? 0));
    }
    if (data.length < 1000) break;
    offset += 1000;
  }

  // 3. 사용 시간: 완료된 coach_room 세션 시간 by student_id
  const used = new Map<string, number>();
  const eventDuration = new Map<string, number>();
  offset = 0;
  while (true) {
    const { data } = await supabaseSFv2
      .from('scheduled_events')
      .select('id, starts_at, ends_at')
      .eq('status', 'completed')
      .eq('category', 'coach_room')
      .range(offset, offset + 999);
    if (!data?.length) break;
    for (const e of data as { id: string; starts_at: string; ends_at: string }[]) {
      const dur = (new Date(e.ends_at).getTime() - new Date(e.starts_at).getTime()) / 3_600_000;
      eventDuration.set(e.id, dur);
    }
    if (data.length < 1000) break;
    offset += 1000;
  }

  offset = 0;
  while (true) {
    const { data } = await supabaseSFv2
      .from('scheduled_event_participants')
      .select('event_id, user_id')
      .range(offset, offset + 999);
    if (!data?.length) break;
    for (const p of data as { event_id: string; user_id: string }[]) {
      const dur = eventDuration.get(p.event_id);
      if (!dur) continue;
      used.set(p.user_id, (used.get(p.user_id) ?? 0) + dur);
    }
    if (data.length < 1000) break;
    offset += 1000;
  }

  return { purchased, refunded, used };
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const today = new Date().toISOString().slice(0, 10);

    const [v2Hours, crmResult, pauseResult] = await Promise.all([
      fetchV2Hours(),
      supabaseAdmin
        .from('students')
        .select('id, name, grade, sfv2_profile_id, service_status')
        .not('sfv2_profile_id', 'is', null),
      supabaseAdmin
        .from('student_pauses')
        .select('student_id, sfv2_profile_id')
        .is('ended_at', null)
        .lte('pause_start', today)
        .or(`pause_until.is.null,pause_until.gte.${today}`),
    ]);

    const { purchased, refunded, used } = v2Hours;
    const crmStudents = (crmResult.data ?? []) as {
      id: string;
      name: string;
      grade: string | null;
      sfv2_profile_id: string;
      service_status: string | null;
    }[];

    const pausedByStudentId = new Set((pauseResult.data ?? []).map((p) => p.student_id).filter(Boolean) as string[]);
    const pausedByProfileId = new Set((pauseResult.data ?? []).map((p) => p.sfv2_profile_id).filter(Boolean) as string[]);

    const results: TutoringUser[] = [];

    for (const s of crmStudents) {
      const pid = s.sfv2_profile_id;
      const purchasedH = Math.round((purchased.get(pid) ?? 0) * 10) / 10;
      if (purchasedH === 0) continue; // 구매 이력 없으면 제외

      const refundedH = Math.round((refunded.get(pid) ?? 0) * 10) / 10;
      const usedH = Math.round((used.get(pid) ?? 0) * 10) / 10;
      const remainingH = Math.round(Math.max(0, purchasedH - refundedH - usedH) * 10) / 10;

      const isPaused = pausedByStudentId.has(s.id) || pausedByProfileId.has(pid);
      const svcStatus = s.service_status ?? 'active';

      let status: TutoringStatus;
      if (remainingH > 0) {
        if (isPaused) status = 'paused';
        else if (svcStatus === 'partial_end') status = 'partial_end';
        else status = 'active';
      } else {
        status = svcStatus === 'ended' ? 'ended' : 'sales';
      }

      results.push({
        sfv2ProfileId: pid,
        crmStudentId: s.id,
        name: s.name,
        grade: s.grade,
        purchasedHours: purchasedH,
        refundedHours: refundedH,
        usedHours: usedH,
        remainingHours: remainingH,
        status,
      });
    }

    const statusOrder: Record<TutoringStatus, number> = {
      active: 0, paused: 1, partial_end: 2, sales: 3, ended: 4,
    };
    results.sort((a, b) =>
      statusOrder[a.status] !== statusOrder[b.status]
        ? statusOrder[a.status] - statusOrder[b.status]
        : a.name.localeCompare(b.name)
    );

    // 미연결 sfv2 유저: 구매 이력 있지만 CRM에 sfv2_profile_id 미연결
    const linkedProfileIds = new Set(crmStudents.map((s) => s.sfv2_profile_id));
    const unlinkedProfileIds = [...purchased.keys()].filter((pid) => !linkedProfileIds.has(pid));

    const unlinked: UnlinkedTutoringUser[] = [];
    if (unlinkedProfileIds.length > 0) {
      const { data: profiles } = await supabaseSFv2
        .from('profiles')
        .select('id, full_name')
        .in('id', unlinkedProfileIds);

      for (const p of profiles ?? []) {
        const purchasedH = Math.round((purchased.get(p.id) ?? 0) * 10) / 10;
        if (purchasedH === 0) continue;
        unlinked.push({ sfv2ProfileId: p.id, name: p.full_name ?? p.id, purchasedHours: purchasedH });
      }
      unlinked.sort((a, b) => a.name.localeCompare(b.name));
    }

    return NextResponse.json({ linked: results, unlinked } satisfies TutoringUsersResponse);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
