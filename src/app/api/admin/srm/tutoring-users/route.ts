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
  remainingHours: number;
}

export interface TutoringUsersResponse {
  linked: TutoringUser[];
  unlinked: UnlinkedTutoringUser[];
}

// 오프셋 페이지네이션(1000행 캡)을 한 곳에서 처리. 페이지별 처리는 onPage 콜백에 위임.
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

// 1. 구매 시간 + 최근 결제일: payment_transactions.hours by student_id
async function fetchPurchased() {
  const purchased = new Map<string, number>();
  const lastPurchaseDate = new Map<string, string>();
  await scanAll<{ student_id: string | null; hours: number; created_at: string }>(
    (f, t) => supabaseSFv2.from('payment_transactions').select('student_id, hours, created_at').gt('hours', 0).range(f, t),
    (rows) => {
      for (const row of rows) {
        if (!row.student_id) continue;
        purchased.set(row.student_id, (purchased.get(row.student_id) ?? 0) + (row.hours ?? 0));
        const prev = lastPurchaseDate.get(row.student_id);
        if (!prev || row.created_at > prev) lastPurchaseDate.set(row.student_id, row.created_at);
      }
    },
  );
  return { purchased, lastPurchaseDate };
}

// 2. 환불 시간: payment_refunds.hours_refunded → payments.student_id
async function fetchRefunded() {
  const refunded = new Map<string, number>();
  // payment_refunds → payments(student_id) 매핑이 필요하므로 전 페이지 수집 후 배치 처리.
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
  return { refunded };
}

// 3. 사용 시간 + 최근 세션일: 완료된 coach_room 세션 by user_id
async function fetchUsed() {
  const used = new Map<string, number>();
  const lastSessionDate = new Map<string, string>();
  const eventMeta = new Map<string, { duration: number; startsAt: string }>();
  await scanAll<{ id: string; starts_at: string; ends_at: string }>(
    (f, t) => supabaseSFv2.from('scheduled_events').select('id, starts_at, ends_at').eq('status', 'completed').eq('category', 'coach_room').range(f, t),
    (rows) => {
      for (const e of rows) {
        const dur = (new Date(e.ends_at).getTime() - new Date(e.starts_at).getTime()) / 3_600_000;
        eventMeta.set(e.id, { duration: dur, startsAt: e.starts_at });
      }
    },
  );
  await scanAll<{ event_id: string; user_id: string }>(
    (f, t) => supabaseSFv2.from('scheduled_event_participants').select('event_id, user_id').range(f, t),
    (rows) => {
      for (const p of rows) {
        const meta = eventMeta.get(p.event_id);
        if (!meta) continue;
        used.set(p.user_id, (used.get(p.user_id) ?? 0) + meta.duration);
        const prev = lastSessionDate.get(p.user_id);
        if (!prev || meta.startsAt > prev) lastSessionDate.set(p.user_id, meta.startsAt);
      }
    },
  );
  return { used, lastSessionDate };
}

async function fetchV2Hours(): Promise<{
  purchased: Map<string, number>;
  refunded: Map<string, number>;
  used: Map<string, number>;
  lastPurchaseDate: Map<string, string>;
  lastSessionDate: Map<string, string>;
}> {
  // 세 집계는 서로 독립 → 병렬 실행(원격 SFv2 왕복 지연이 병목이므로 순차 대비 큰 단축).
  const [p, r, u] = await Promise.all([fetchPurchased(), fetchRefunded(), fetchUsed()]);
  return {
    purchased: p.purchased,
    lastPurchaseDate: p.lastPurchaseDate,
    refunded: r.refunded,
    used: u.used,
    lastSessionDate: u.lastSessionDate,
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const today = new Date().toISOString().slice(0, 10);

    const [v2Hours, crmResult, pauseResult, activePaymentsResult] = await Promise.all([
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
      supabaseSFv2
        .from('payments')
        .select('student_id')
        .eq('management_status', 'active')
        .not('student_id', 'is', null),
    ]);

    const { purchased, refunded, used, lastSessionDate } = v2Hours;
    const activePaymentIds = new Set(
      ((activePaymentsResult.data ?? []) as { student_id: string }[]).map((p) => p.student_id)
    );
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
      const hasActivePayment = activePaymentIds.has(pid);

      // 구매 이력도 없고 활성 결제도 없으면 제외
      if (purchasedH === 0 && !hasActivePayment) continue;

      const refundedH = Math.round((refunded.get(pid) ?? 0) * 10) / 10;
      const usedH = Math.round((used.get(pid) ?? 0) * 10) / 10;
      const rawRemainingH = purchasedH - refundedH - usedH;
      const remainingH = Math.round(Math.max(0, rawRemainingH) * 10) / 10;

      const isPaused = pausedByStudentId.has(s.id) || pausedByProfileId.has(pid);
      const svcStatus = s.service_status ?? 'active';

      let status: TutoringStatus;
      if (rawRemainingH < 0 && hasActivePayment) {
        // 사용 시간이 구매 시간 초과(또는 0h 구매) + 활성 결제 → 재결제 세일즈
        status = 'sales';
      } else if (remainingH > 0) {
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

    // 미연결 sfv2 유저: 수업중/휴원/부분종료/세일즈에 해당하지만 CRM에 sfv2_profile_id 미연결
    const linkedProfileIds = new Set(crmStudents.map((s) => s.sfv2_profile_id));
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoStr = ninetyDaysAgo.toISOString();

    // purchased.keys() + activePaymentIds 모두 후보로 (hours=0이지만 active payment인 케이스 포함)
    const candidateIds = new Set([...purchased.keys(), ...activePaymentIds]);
    const unlinkedProfileIds = [...candidateIds].filter((pid) => {
      if (linkedProfileIds.has(pid)) return false;
      const purchasedH = purchased.get(pid) ?? 0;
      const refundedH = refunded.get(pid) ?? 0;
      const usedH = used.get(pid) ?? 0;
      const rawRemainingH = purchasedH - refundedH - usedH;
      // 세일즈: active payment + 잔여 마이너스 (사용 초과 또는 hours=0)
      if (rawRemainingH < 0 && activePaymentIds.has(pid)) return true;
      if (purchasedH - refundedH <= 0) return false; // 전액 환불 제외
      if (rawRemainingH > 0) return true; // 수업중/휴원/부분종료
      // 세일즈: 잔여 0h이지만 최근 90일 내 세션 완료 기록 있음
      const lastSession = lastSessionDate.get(pid);
      return !!lastSession && lastSession >= ninetyDaysAgoStr;
    });

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
      // 잔여 시간 많은 순 (수업중 우선), 동일하면 이름순
      unlinked.sort((a, b) => b.remainingHours - a.remainingHours || a.name.localeCompare(b.name));
    }

    return NextResponse.json({ linked: results, unlinked } satisfies TutoringUsersResponse);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
