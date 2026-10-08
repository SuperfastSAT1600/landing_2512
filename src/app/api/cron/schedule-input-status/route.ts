import { NextRequest, NextResponse } from 'next/server';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { notifyScheduleInputStatus } from '@/lib/slack-sfv2';

// 테스트 계정 — 알림 대상에서 제외
const EXCLUDED_STUDENTS = new Set(['박윤재']);

/**
 * GET /api/cron/schedule-input-status
 * Vercel Cron — 매일 00:00 UTC (= 09:00 KST)
 *
 * - 신규 입력: 전날 00:00 KST ~ 당일 09:00 KST 사이에 추가된 스케줄 (칭찬용)
 * - 종료 임박: 미래 일정이 있으나 내일(+48h)까지 끝나는 학생 (선제 관리용)
 * - 예정 없음: 지금 이후 예정된 스케줄이 없는 학생 → 잔여 시간별 그룹핑 (관리용)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { windowStart, windowEnd, windowLabel } = getWindow();
    console.log(`[cron/schedule-input-status] window: [${windowStart.toISOString()}, ${windowEnd.toISOString()}]`);

    const [rawEntries, allActiveMap, futureInfo] = await Promise.all([
      fetchNewScheduled(windowStart, windowEnd),
      fetchAllActiveStudentsMap(),
      fetchFutureScheduleInfo(windowEnd),
    ]);

    const summaries = aggregateByStudent(rawEntries);

    const soonThreshold = new Date(windowEnd.getTime() + 2 * 24 * 60 * 60 * 1000);
    const endingSoon: EndingSoon[] = [];
    const noScheduleIds: string[] = [];

    for (const [userId, name] of allActiveMap) {
      if (EXCLUDED_STUDENTS.has(name)) continue;
      const last = futureInfo.get(userId);
      if (!last) {
        noScheduleIds.push(userId);
      } else if (last < soonThreshold) {
        endingSoon.push({ studentName: name, lastDate: toKSTDisplay(last.toISOString()).slice(0, 5) });
      }
    }
    endingSoon.sort((a, b) => a.studentName.localeCompare(b.studentName, 'ko'));

    // 잔여 시간 조회 후 그룹핑
    const remainingMap = await fetchRemainingHoursMap(noScheduleIds);
    const noScheduleGroups = groupByRemainingHours(noScheduleIds, allActiveMap, remainingMap);

    console.log(`[cron/schedule-input-status] new=${summaries.length} | ending-soon=${endingSoon.length} | no-schedule=${noScheduleIds.length}`);

    await notifyScheduleInputStatus({ summaries, endingSoon, noScheduleGroups, windowLabel });

    return NextResponse.json({
      ok: true,
      newStudents: summaries.length,
      endingSoon: endingSoon.length,
      noSchedule: noScheduleIds.length,
      window: { start: windowStart.toISOString(), end: windowEnd.toISOString() },
    });
  } catch (error) {
    console.error('[cron/schedule-input-status] error:', error);
    return NextResponse.json({ error: 'Internal server error', detail: String(error) }, { status: 500 });
  }
}

// ─── 시간 범위 ────────────────────────────────────────────────────────────────

export function getWindow(): { windowStart: Date; windowEnd: Date; windowLabel: string } {
  const KST_MS = 9 * 60 * 60 * 1000;
  const now = new Date(); // 00:00 UTC = 09:00 KST

  const nowKST = new Date(now.getTime() + KST_MS);
  const ydKST = new Date(nowKST);
  ydKST.setDate(nowKST.getDate() - 1);
  ydKST.setHours(0, 0, 0, 0);

  const windowStart = new Date(ydKST.getTime() - KST_MS);
  const windowEnd = now;

  const fmt = (d: Date) =>
    new Date(d.getTime() + KST_MS).toISOString().slice(5, 16).replace('T', ' ');

  return {
    windowStart,
    windowEnd,
    windowLabel: `${fmt(windowStart)} ~ ${fmt(windowEnd)} KST`,
  };
}

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface ScheduleEntry {
  studentName: string;
  activityType: 'Study Hall' | 'Vocab' | 'Test Center';
  scheduledTimeISO: string;
}

export interface StudentSummary {
  studentName: string;
  studyHall: number;
  vocab: number;
  testCenter: number;
  firstDate: string; // KST "MM/DD"
  lastDate: string;
}

export interface EndingSoon {
  studentName: string;
  lastDate: string; // KST "MM/DD" — 마지막 예정 일정
}

export interface NoScheduleGroup {
  label: string;   // e.g. "0시간", "1~10시간"
  students: string[];
}

// ─── 잔여 시간 그룹핑 ─────────────────────────────────────────────────────────

function groupByRemainingHours(
  userIds: string[],
  nameMap: Map<string, string>,
  remainingMap: Map<string, number>,
): NoScheduleGroup[] {
  const buckets: { label: string; min: number; max: number; students: string[] }[] = [
    { label: '0시간',      min: 0,  max: 0,   students: [] },
    { label: '1~10시간',   min: 1,  max: 10,  students: [] },
    { label: '11~20시간',  min: 11, max: 20,  students: [] },
    { label: '21시간+',    min: 21, max: Infinity, students: [] },
  ];

  for (const userId of userIds) {
    const name = nameMap.get(userId);
    if (!name) continue;
    const hours = remainingMap.get(userId) ?? 0;
    const bucket = buckets.find(b => hours >= b.min && hours <= b.max);
    if (bucket) bucket.students.push(name);
  }

  for (const b of buckets) b.students.sort((a, z) => a.localeCompare(z, 'ko'));

  return buckets
    .filter(b => b.students.length > 0)
    .map(({ label, students }) => ({ label, students }));
}

// ─── 잔여 수업 시간 계산 (구매 − 환불 − 완료) ─────────────────────────────────

async function fetchRemainingHoursMap(userIds: string[]): Promise<Map<string, number>> {
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
  const used = new Map<string, number>();
  const participantPairs: { event_id: string; user_id: string }[] = [];
  for (let i = 0; i < userIds.length; i += 100) {
    const { data } = await supabaseSFv2
      .from('scheduled_event_participants')
      .select('event_id, user_id')
      .in('user_id', userIds.slice(i, i + 100));
    if (data?.length) participantPairs.push(...data);
  }
  const allEventIds = [...new Set(participantPairs.map(p => p.event_id))];
  const completedMeta = new Map<string, { starts_at: string; ends_at: string }>();
  for (let i = 0; i < allEventIds.length; i += 100) {
    const { data } = await supabaseSFv2
      .from('scheduled_events')
      .select('id, starts_at, ends_at')
      .in('id', allEventIds.slice(i, i + 100))
      .eq('category', 'coach_room')
      .eq('status', 'completed');
    for (const e of data ?? []) completedMeta.set(e.id, { starts_at: e.starts_at, ends_at: e.ends_at });
  }
  for (const p of participantPairs) {
    const meta = completedMeta.get(p.event_id);
    if (!meta) continue;
    const dur = (new Date(meta.ends_at).getTime() - new Date(meta.starts_at).getTime()) / (1000 * 60 * 60);
    if (dur > 0) used.set(p.user_id, (used.get(p.user_id) ?? 0) + dur);
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

// ─── 신규 스케줄 집계 ─────────────────────────────────────────────────────────

function aggregateByStudent(entries: ScheduleEntry[]): StudentSummary[] {
  const map = new Map<string, { sh: number; v: number; tc: number; isos: string[] }>();
  for (const e of entries) {
    const s = map.get(e.studentName) ?? { sh: 0, v: 0, tc: 0, isos: [] };
    if (e.activityType === 'Study Hall') s.sh++;
    else if (e.activityType === 'Vocab') s.v++;
    else s.tc++;
    s.isos.push(e.scheduledTimeISO);
    map.set(e.studentName, s);
  }
  const fmtDate = (iso: string) => toKSTDisplay(iso).slice(0, 5);
  return [...map.entries()]
    .map(([name, s]) => {
      s.isos.sort();
      return {
        studentName: name,
        studyHall: s.sh,
        vocab: s.v,
        testCenter: s.tc,
        firstDate: fmtDate(s.isos[0]),
        lastDate: fmtDate(s.isos[s.isos.length - 1]),
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName, 'ko'));
}

async function fetchNewScheduled(windowStart: Date, windowEnd: Date): Promise<ScheduleEntry[]> {
  const [shVocab, testCenter] = await Promise.all([
    fetchStudyHallVocab(windowStart, windowEnd),
    fetchTestCenter(windowStart, windowEnd),
  ]);
  return [...shVocab, ...testCenter];
}

async function fetchStudyHallVocab(windowStart: Date, windowEnd: Date): Promise<ScheduleEntry[]> {
  const PAGE_SIZE = 1000;
  const allEvents: { id: string; category: string; starts_at: string }[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: page, error } = await supabaseSFv2
      .from('scheduled_events')
      .select('id, category, starts_at')
      .in('category', ['study_hall', 'vocab'])
      .neq('status', 'cancelled')
      .gte('created_at', windowStart.toISOString())
      .lt('created_at', windowEnd.toISOString())
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) { console.error('[schedule-input-status] scheduled_events error:', error.message); break; }
    if (!page?.length) break;
    allEvents.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  if (!allEvents.length) return [];

  const eventIds = allEvents.map(e => e.id);
  const categoryById = new Map(allEvents.map(e => [e.id, e.category]));
  const startsAtById = new Map(allEvents.map(e => [e.id, e.starts_at]));

  const allParticipants: { event_id: string; user_id: string }[] = [];
  for (let i = 0; i < eventIds.length; i += 100) {
    const chunk = eventIds.slice(i, i + 100);
    const { data: page } = await supabaseSFv2
      .from('scheduled_event_participants')
      .select('event_id, user_id')
      .in('event_id', chunk);
    if (page?.length) allParticipants.push(...page);
  }

  if (!allParticipants.length) return [];

  const userIds = [...new Set(allParticipants.map(p => p.user_id))];
  const nameMap = await fetchStudentNames(userIds);

  const entries: ScheduleEntry[] = [];
  for (const p of allParticipants) {
    const name = nameMap.get(p.user_id);
    if (!name) continue;
    const cat = categoryById.get(p.event_id);
    entries.push({
      studentName: name,
      activityType: cat === 'study_hall' ? 'Study Hall' : 'Vocab',
      scheduledTimeISO: startsAtById.get(p.event_id) ?? '',
    });
  }
  return entries;
}

async function fetchTestCenter(windowStart: Date, windowEnd: Date): Promise<ScheduleEntry[]> {
  const PAGE_SIZE = 1000;
  const allSessions: { user_id: string; started_at: string }[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: page, error } = await supabaseSFv2
      .from('test_center_session')
      .select('user_id, started_at')
      .gte('started_at', windowStart.toISOString())
      .lt('started_at', windowEnd.toISOString())
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) { console.error('[schedule-input-status] test_center_session error:', error.message); break; }
    if (!page?.length) break;
    allSessions.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  if (!allSessions.length) return [];

  const userIds = [...new Set(allSessions.map(s => s.user_id))];
  const nameMap = await fetchStudentNames(userIds);

  return allSessions
    .map(s => ({
      studentName: nameMap.get(s.user_id) ?? '',
      activityType: 'Test Center' as const,
      scheduledTimeISO: s.started_at,
    }))
    .filter(e => e.studentName);
}

// ─── 미래 일정 최종 날짜 조회 (userId → 마지막 예정 시각) ────────────────────

async function fetchFutureScheduleInfo(now: Date): Promise<Map<string, Date>> {
  const lastDateByUser = new Map<string, Date>();
  const PAGE_SIZE = 1000;

  const futureEvents: { id: string; starts_at: string }[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: page, error } = await supabaseSFv2
      .from('scheduled_events')
      .select('id, starts_at')
      .in('category', ['study_hall', 'vocab'])
      .neq('status', 'cancelled')
      .gte('starts_at', now.toISOString())
      .range(offset, offset + PAGE_SIZE - 1);
    if (error || !page?.length) break;
    futureEvents.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  if (futureEvents.length) {
    const startsAtById = new Map(futureEvents.map(e => [e.id, new Date(e.starts_at)]));
    const ids = futureEvents.map(e => e.id);
    for (let i = 0; i < ids.length; i += 100) {
      const { data } = await supabaseSFv2
        .from('scheduled_event_participants')
        .select('event_id, user_id')
        .in('event_id', ids.slice(i, i + 100));
      for (const p of data ?? []) {
        if (!p.user_id) continue;
        const t = startsAtById.get(p.event_id);
        if (!t) continue;
        const cur = lastDateByUser.get(p.user_id);
        if (!cur || t > cur) lastDateByUser.set(p.user_id, t);
      }
    }
  }

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: page, error } = await supabaseSFv2
      .from('test_center_session')
      .select('user_id, started_at')
      .gte('started_at', now.toISOString())
      .range(offset, offset + PAGE_SIZE - 1);
    if (error || !page?.length) break;
    for (const s of page) {
      if (!s.user_id) continue;
      const t = new Date(s.started_at);
      const cur = lastDateByUser.get(s.user_id);
      if (!cur || t > cur) lastDateByUser.set(s.user_id, t);
    }
    if (page.length < PAGE_SIZE) break;
  }

  return lastDateByUser;
}

// ─── 전체 활성 학생 (userId → name) ──────────────────────────────────────────

async function fetchAllActiveStudentsMap(): Promise<Map<string, string>> {
  const PAGE_SIZE = 1000;
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

// ─── KST 시간 포맷 ────────────────────────────────────────────────────────────

function toKSTDisplay(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso)
      .toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      .replace(/\. /g, '/').replace('.', '');
  } catch {
    return iso.slice(0, 16);
  }
}
