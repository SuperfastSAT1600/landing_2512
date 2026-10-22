import { supabaseSFv2 } from '@/lib/supabase-sfv2';

const PAGE_SIZE = 1000;

export interface ScheduleSummary {
  /** 스터디홀/보캡 일정(취소 제외)이 과거·미래 통틀어 한 번이라도 있었던 학생 */
  everScheduled: Set<string>;
  /** 기준 시각 이후 스터디홀/보캡 남은 분 */
  studyHallMinutes: Map<string, number>;
  vocabMinutes: Map<string, number>;
  /** 기준 시각 이후 마지막 스터디홀/보캡 시작 시각 */
  lastDateByUser: Map<string, Date>;
}

// ─── 스터디홀/보캡 일정 요약 (과거 포함 전체 1회 조회) ─────────────────────────

export async function fetchScheduleSummary(now: Date): Promise<ScheduleSummary> {
  const events: { id: string; category: string; starts_at: string; ends_at: string | null }[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: page, error } = await supabaseSFv2
      .from('scheduled_events')
      .select('id, category, starts_at, ends_at')
      .in('category', ['study_hall', 'vocab'])
      .neq('status', 'cancelled')
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`scheduled_events: ${error.message}`);
    if (!page?.length) break;
    events.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  const eventById = new Map(events.map(e => [e.id, e]));
  const summary: ScheduleSummary = {
    everScheduled: new Set(),
    studyHallMinutes: new Map(),
    vocabMinutes: new Map(),
    lastDateByUser: new Map(),
  };

  const ids = events.map(e => e.id);
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabaseSFv2
      .from('scheduled_event_participants')
      .select('event_id, user_id')
      .in('event_id', ids.slice(i, i + 100));
    if (error) throw new Error(`scheduled_event_participants: ${error.message}`);
    for (const p of data ?? []) {
      const ev = eventById.get(p.event_id);
      if (!p.user_id || !ev) continue;
      summary.everScheduled.add(p.user_id);

      const startsAt = new Date(ev.starts_at);
      if (startsAt < now) continue;
      const minutes = ev.ends_at ? Math.round((new Date(ev.ends_at).getTime() - startsAt.getTime()) / 60000) : 0;
      const target = ev.category === 'study_hall' ? summary.studyHallMinutes : summary.vocabMinutes;
      target.set(p.user_id, (target.get(p.user_id) ?? 0) + minutes);
      const cur = summary.lastDateByUser.get(p.user_id);
      if (!cur || startsAt > cur) summary.lastDateByUser.set(p.user_id, startsAt);
    }
  }
  return summary;
}

// ─── 코치룸 수업을 한 번이라도 받은 학생 (시작 시각이 지난 비취소 코치룸 일정) ─────

export async function fetchHadLessonUserIds(now: Date): Promise<Set<string>> {
  const eventIds: string[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: page, error } = await supabaseSFv2
      .from('scheduled_events')
      .select('id')
      .eq('category', 'coach_room')
      .neq('status', 'cancelled')
      .lt('starts_at', now.toISOString())
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`coach_room events: ${error.message}`);
    if (!page?.length) break;
    eventIds.push(...page.map(e => e.id));
    if (page.length < PAGE_SIZE) break;
  }

  const hadLesson = new Set<string>();
  for (let i = 0; i < eventIds.length; i += 100) {
    const { data, error } = await supabaseSFv2
      .from('scheduled_event_participants')
      .select('user_id')
      .in('event_id', eventIds.slice(i, i + 100));
    if (error) throw new Error(`coach_room participants: ${error.message}`);
    for (const p of data ?? []) if (p.user_id) hadLesson.add(p.user_id);
  }
  return hadLesson;
}

// ─── 지금 이후 예약된 코치룸 시간 (학생별 분) ───────────────────────────────────

export async function fetchFutureCoachRoomMinutes(now: Date): Promise<Map<string, number>> {
  const events: { id: string; starts_at: string; ends_at: string | null }[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: page, error } = await supabaseSFv2
      .from('scheduled_events')
      .select('id, starts_at, ends_at')
      .eq('category', 'coach_room')
      .neq('status', 'cancelled')
      .gte('starts_at', now.toISOString())
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`future coach_room events: ${error.message}`);
    if (!page?.length) break;
    events.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  const minutesById = new Map(events.map(e => [
    e.id,
    e.ends_at ? Math.round((new Date(e.ends_at).getTime() - new Date(e.starts_at).getTime()) / 60000) : 0,
  ]));
  const minutesByUser = new Map<string, number>();
  const ids = events.map(e => e.id);
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabaseSFv2
      .from('scheduled_event_participants')
      .select('event_id, user_id')
      .in('event_id', ids.slice(i, i + 100));
    if (error) throw new Error(`future coach_room participants: ${error.message}`);
    for (const p of data ?? []) {
      if (!p.user_id) continue;
      minutesByUser.set(p.user_id, (minutesByUser.get(p.user_id) ?? 0) + (minutesById.get(p.event_id) ?? 0));
    }
  }
  return minutesByUser;
}

// ─── 잔여 수업 시간 계산 (구매 − 환불 − 완료) ─────────────────────────────────

export async function fetchRemainingHoursMap(userIds: string[]): Promise<Map<string, number>> {
  const remaining = new Map<string, number>();
  if (!userIds.length) return remaining;

  // 1. 구매 시간
  const purchased = new Map<string, number>();
  for (let i = 0; i < userIds.length; i += 100) {
    const { data } = await supabaseSFv2
      .from('payment_transactions')
      .select('student_id, hours')
      .in('student_id', userIds.slice(i, i + 100))
      .gt('hours', 0);
    for (const r of data ?? [])
      if (r.student_id) purchased.set(r.student_id, (purchased.get(r.student_id) ?? 0) + (r.hours ?? 0));
  }

  // 2. 환불 시간
  const refunded = new Map<string, number>();
  const paymentIds: string[] = [];
  const payToStudent = new Map<string, string>();
  for (let i = 0; i < userIds.length; i += 100) {
    const { data } = await supabaseSFv2
      .from('payments')
      .select('id, student_id')
      .in('student_id', userIds.slice(i, i + 100));
    for (const r of data ?? [])
      if (r.id && r.student_id) { paymentIds.push(r.id); payToStudent.set(r.id, r.student_id); }
  }
  for (let i = 0; i < paymentIds.length; i += 100) {
    const { data } = await supabaseSFv2
      .from('payment_refunds')
      .select('payment_id, hours_refunded')
      .in('payment_id', paymentIds.slice(i, i + 100));
    for (const r of data ?? []) {
      const sid = payToStudent.get(r.payment_id);
      if (sid) refunded.set(sid, (refunded.get(sid) ?? 0) + (r.hours_refunded ?? 0));
    }
  }

  // 3. 완료된 coach_room 시간
  // 완료된 이벤트 전체를 먼저 조회 후 참여자 필터 (유저별 조회 시 1000행 제한 우회)
  const used = new Map<string, number>();
  const userIdSet = new Set(userIds);

  const completedEvents: { id: string; starts_at: string; ends_at: string }[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: page } = await supabaseSFv2
      .from('scheduled_events')
      .select('id, starts_at, ends_at')
      .eq('category', 'coach_room')
      .eq('status', 'completed')
      .range(offset, offset + PAGE_SIZE - 1);
    if (!page?.length) break;
    completedEvents.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  const completedMeta = new Map(completedEvents.map(e => [e.id, { starts_at: e.starts_at, ends_at: e.ends_at }]));
  const completedEventIds = completedEvents.map(e => e.id);

  for (let i = 0; i < completedEventIds.length; i += 100) {
    const { data } = await supabaseSFv2
      .from('scheduled_event_participants')
      .select('event_id, user_id')
      .in('event_id', completedEventIds.slice(i, i + 100));
    for (const p of data ?? []) {
      if (!p.user_id || !userIdSet.has(p.user_id)) continue;
      const meta = completedMeta.get(p.event_id);
      if (!meta) continue;
      const dur = (new Date(meta.ends_at).getTime() - new Date(meta.starts_at).getTime()) / (1000 * 60 * 60);
      if (dur > 0) used.set(p.user_id, (used.get(p.user_id) ?? 0) + dur);
    }
  }

  // 4. 잔여 = max(0, 구매 − 환불 − 완료)
  for (const userId of userIds) {
    const p = purchased.get(userId) ?? 0;
    const r = refunded.get(userId) ?? 0;
    const u = used.get(userId) ?? 0;
    remaining.set(userId, Math.round(Math.max(0, p - r - u) * 10) / 10);
  }
  return remaining;
}

// ─── 전체 활성 학생 (userId → name) ──────────────────────────────────────────

export async function fetchAllActiveStudentsMap(): Promise<Map<string, string>> {
  const studentIds = new Set<string>();

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: page, error } = await supabaseSFv2
      .from('payments')
      .select('student_id')
      .in('management_status', ['active', 'onboarding'])
      .not('student_id', 'is', null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) { console.error('[schedule-input-status] payments error:', error.message); break; }
    if (!page?.length) break;
    for (const row of page) if (row.student_id) studentIds.add(row.student_id as string);
    if (page.length < PAGE_SIZE) break;
  }

  if (!studentIds.size) return new Map();
  return fetchStudentNames([...studentIds]);
}

// ─── 공통: 이름 조회 ──────────────────────────────────────────────────────────

async function fetchStudentNames(userIds: string[]): Promise<Map<string, string>> {
  const nameMap = new Map<string, string>();
  if (!userIds.length) return nameMap;

  for (let i = 0; i < userIds.length; i += 100) {
    const chunk = userIds.slice(i, i + 100);
    const { data } = await supabaseSFv2
      .from('profiles')
      .select('id, full_name')
      .in('id', chunk);
    for (const row of data ?? []) {
      if (row.id && row.full_name) nameMap.set(row.id as string, row.full_name as string);
    }
  }
  return nameMap;
}

