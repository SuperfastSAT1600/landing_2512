import { NextRequest, NextResponse } from 'next/server';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { notifyScheduleInputStatus } from '@/lib/slack-sfv2';

// 테스트 계정 — 알림 대상에서 제외
const EXCLUDED_STUDENTS = new Set(['박윤재']);

/**
 * GET /api/cron/schedule-input-status
 * Vercel Cron — 매일 23:00 UTC (= 08:00 KST)
 *
 * 재원 학생 전체를 코치룸 잔여 시간 버킷별로 분류하고,
 * 각 버킷 안에서 수업/스터디홀/보캡 있다/없다 조합으로 서브그룹화.
 * 윈도우 내 스케줄을 새로 입력한 학생은 🔔 표시.
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

    const [rawEntries, allActiveMap, scheduleStatus, coachRoomUserIds, windowCoachUserIds] = await Promise.all([
      fetchNewScheduled(windowStart, windowEnd),
      fetchAllActiveStudentsMap(),
      fetchFutureScheduleStatus(windowEnd),
      fetchFutureCoachRoomUserIds(windowEnd),
      fetchWindowCoachRoomUserIds(windowStart, windowEnd),
    ]);

    const { studyHallUsers, vocabUsers, lastDateByUser } = scheduleStatus;

    // 윈도우 내 스케줄을 새로 입력한 학생 이름 집합 (수업/스터디홀/보캡 모두 포함)
    const recentlyScheduledNames = new Set<string>(rawEntries.map(e => e.studentName));
    for (const userId of windowCoachUserIds) {
      const name = allActiveMap.get(userId);
      if (name) recentlyScheduledNames.add(name);
    }

    // 종료 임박: 미래 스터디홀/보캡이 있으나 48h 이내에 끝나는 학생
    const soonThreshold = new Date(windowEnd.getTime() + 2 * 24 * 60 * 60 * 1000);
    const endingSoon: EndingSoon[] = [];

    // 조치 필요 학생 목록 (있/있/있 제외)
    const studentsNeedingAttention: { userId: string; hasCoach: boolean; hasStudyHall: boolean; hasVocab: boolean }[] = [];

    for (const [userId, name] of allActiveMap) {
      if (EXCLUDED_STUDENTS.has(name)) continue;
      const hasCoach = coachRoomUserIds.has(userId);
      const hasStudyHall = studyHallUsers.has(userId);
      const hasVocab = vocabUsers.has(userId);

      if (hasStudyHall || hasVocab) {
        const last = lastDateByUser.get(userId);
        if (last && last < soonThreshold) {
          endingSoon.push({ studentName: name, lastDate: toKSTDisplay(last.toISOString()).slice(0, 5) });
        }
      }

      if (hasCoach && hasStudyHall && hasVocab) continue;
      studentsNeedingAttention.push({ userId, hasCoach, hasStudyHall, hasVocab });
    }
    endingSoon.sort((a, b) => a.studentName.localeCompare(b.studentName, 'ko'));

    const remainingMap = await fetchRemainingHoursMap(studentsNeedingAttention.map(s => s.userId));
    const hoursBuckets = buildHoursBuckets(studentsNeedingAttention, allActiveMap, remainingMap);

    console.log(`[cron/schedule-input-status] ending-soon=${endingSoon.length} | needs-attention=${studentsNeedingAttention.length} | recently-scheduled=${recentlyScheduledNames.size}`);

    await notifyScheduleInputStatus({ endingSoon, hoursBuckets, recentlyScheduledNames, windowLabel });

    return NextResponse.json({
      ok: true,
      endingSoon: endingSoon.length,
      studentsNeedingAttention: studentsNeedingAttention.length,
      recentlyScheduled: recentlyScheduledNames.size,
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
  const now = new Date();

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

export interface EndingSoon {
  studentName: string;
  lastDate: string;
}

export interface ScheduleStatusEntry {
  hasCoach: boolean;
  hasStudyHall: boolean;
  hasVocab: boolean;
  students: string[];
}

export interface HoursBucket {
  label: string;
  emoji: string;
  entries: ScheduleStatusEntry[];
}

// ─── 잔여 시간 버킷 정의 ─────────────────────────────────────────────────────

const HOUR_BUCKETS_DEF = [
  { label: '0시간',     emoji: '🔴', min: 0,  max: 0        },
  { label: '1~5시간',   emoji: '🟠', min: 1,  max: 5        },
  { label: '6~10시간',  emoji: '🟡', min: 6,  max: 10       },
  { label: '11~15시간', emoji: '🟢', min: 11, max: 15       },
  { label: '16~20시간', emoji: '🟢', min: 16, max: 20       },
  { label: '21시간+',   emoji: '⚪', min: 21, max: Infinity },
] as const;

// 조합 키: hasCoach|hasStudyHall|hasVocab → 우선순위 (낮을수록 urgent)
const COMBO_PRIORITY: Record<string, number> = {
  '000': 0,
  '100': 1, '010': 2, '001': 3,
  '110': 4, '101': 5, '011': 6,
};

function buildHoursBuckets(
  students: { userId: string; hasCoach: boolean; hasStudyHall: boolean; hasVocab: boolean }[],
  nameMap: Map<string, string>,
  remainingMap: Map<string, number>,
): HoursBucket[] {
  const bucketData = new Map<string, Map<string, ScheduleStatusEntry & { key: string }>>();

  for (const { userId, hasCoach, hasStudyHall, hasVocab } of students) {
    const name = nameMap.get(userId);
    if (!name) continue;
    const hours = remainingMap.get(userId) ?? 0;
    const bucketDef = HOUR_BUCKETS_DEF.find(b => hours >= b.min && hours <= b.max);
    if (!bucketDef) continue;

    const comboKey = `${hasCoach ? 1 : 0}${hasStudyHall ? 1 : 0}${hasVocab ? 1 : 0}`;
    if (!bucketData.has(bucketDef.label)) bucketData.set(bucketDef.label, new Map());
    const comboMap = bucketData.get(bucketDef.label)!;
    if (!comboMap.has(comboKey)) comboMap.set(comboKey, { hasCoach, hasStudyHall, hasVocab, students: [], key: comboKey });
    comboMap.get(comboKey)!.students.push(name);
  }

  const result: HoursBucket[] = [];
  for (const bucketDef of HOUR_BUCKETS_DEF) {
    const comboMap = bucketData.get(bucketDef.label);
    if (!comboMap?.size) continue;

    const entries = [...comboMap.values()]
      .sort((a, b) => (COMBO_PRIORITY[a.key] ?? 7) - (COMBO_PRIORITY[b.key] ?? 7))
      .map(({ hasCoach, hasStudyHall, hasVocab, students }) => {
        students.sort((a, z) => a.localeCompare(z, 'ko'));
        return { hasCoach, hasStudyHall, hasVocab, students };
      });

    result.push({ label: bucketDef.label, emoji: bucketDef.emoji, entries });
  }
  return result;
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
  // 완료된 이벤트 전체를 먼저 조회 후 참여자 필터 (유저별 조회 시 1000행 제한 우회)
  const used = new Map<string, number>();
  const userIdSet = new Set(userIds);
  const PAGE_SIZE = 1000;

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

// ─── 윈도우 내 신규 스케줄 입력자 이름 추출 ─────────────────────────────────────

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
    const { data: page } = await supabaseSFv2
      .from('scheduled_event_participants')
      .select('event_id, user_id')
      .in('event_id', eventIds.slice(i, i + 100));
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

// ─── 미래 스터디홀/보캡 현황 (스터디홀/보캡 분리 추적) ─────────────────────────

async function fetchFutureScheduleStatus(now: Date): Promise<{
  studyHallUsers: Set<string>;
  vocabUsers: Set<string>;
  lastDateByUser: Map<string, Date>;
}> {
  const studyHallUsers = new Set<string>();
  const vocabUsers = new Set<string>();
  const lastDateByUser = new Map<string, Date>();
  const PAGE_SIZE = 1000;

  const futureEvents: { id: string; category: string; starts_at: string }[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: page, error } = await supabaseSFv2
      .from('scheduled_events')
      .select('id, category, starts_at')
      .in('category', ['study_hall', 'vocab'])
      .neq('status', 'cancelled')
      .gte('starts_at', now.toISOString())
      .range(offset, offset + PAGE_SIZE - 1);
    if (error || !page?.length) break;
    futureEvents.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  if (futureEvents.length) {
    const catById = new Map(futureEvents.map(e => [e.id, e.category]));
    const startsAtById = new Map(futureEvents.map(e => [e.id, new Date(e.starts_at)]));
    const ids = futureEvents.map(e => e.id);
    for (let i = 0; i < ids.length; i += 100) {
      const { data } = await supabaseSFv2
        .from('scheduled_event_participants')
        .select('event_id, user_id')
        .in('event_id', ids.slice(i, i + 100));
      for (const p of data ?? []) {
        if (!p.user_id) continue;
        const cat = catById.get(p.event_id);
        if (cat === 'study_hall') studyHallUsers.add(p.user_id);
        else if (cat === 'vocab') vocabUsers.add(p.user_id);
        const t = startsAtById.get(p.event_id);
        if (t) {
          const cur = lastDateByUser.get(p.user_id);
          if (!cur || t > cur) lastDateByUser.set(p.user_id, t);
        }
      }
    }
  }

  // test_center도 lastDate에 포함 (종료 임박 판단용)
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

  return { studyHallUsers, vocabUsers, lastDateByUser };
}

// ─── 미래 코치룸 예약 학생 ID 집합 ────────────────────────────────────────────

async function fetchFutureCoachRoomUserIds(now: Date): Promise<Set<string>> {
  const hasCoachRoom = new Set<string>();
  const PAGE_SIZE = 1000;

  const futureEventIds: string[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: page, error } = await supabaseSFv2
      .from('scheduled_events')
      .select('id')
      .eq('category', 'coach_room')
      .neq('status', 'cancelled')
      .gte('starts_at', now.toISOString())
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) { console.error('[schedule-input-status] coach_room events error:', error.message); break; }
    if (!page?.length) break;
    futureEventIds.push(...page.map(e => e.id));
    if (page.length < PAGE_SIZE) break;
  }

  for (let i = 0; i < futureEventIds.length; i += 100) {
    const { data } = await supabaseSFv2
      .from('scheduled_event_participants')
      .select('user_id')
      .in('event_id', futureEventIds.slice(i, i + 100));
    for (const p of data ?? []) if (p.user_id) hasCoachRoom.add(p.user_id);
  }

  return hasCoachRoom;
}

// ─── 윈도우 내 코치룸 스케줄을 신규 입력한 학생 ID ───────────────────────────────

async function fetchWindowCoachRoomUserIds(windowStart: Date, windowEnd: Date): Promise<Set<string>> {
  const userIds = new Set<string>();
  const PAGE_SIZE = 1000;

  const eventIds: string[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: page } = await supabaseSFv2
      .from('scheduled_events')
      .select('id')
      .eq('category', 'coach_room')
      .neq('status', 'cancelled')
      .gte('created_at', windowStart.toISOString())
      .lt('created_at', windowEnd.toISOString())
      .range(offset, offset + PAGE_SIZE - 1);
    if (!page?.length) break;
    eventIds.push(...page.map(e => e.id));
    if (page.length < PAGE_SIZE) break;
  }

  for (let i = 0; i < eventIds.length; i += 100) {
    const { data } = await supabaseSFv2
      .from('scheduled_event_participants')
      .select('user_id')
      .in('event_id', eventIds.slice(i, i + 100));
    for (const p of data ?? []) if (p.user_id) userIds.add(p.user_id);
  }
  return userIds;
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
