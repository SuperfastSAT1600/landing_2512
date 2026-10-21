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
 * 윈도우 내 스터디홀/보캡을 새로 입력한 학생은 🔔, 코치룸을 새로 입력한 학생은 🆕 표시.
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
      fetchStudyHallVocab(windowStart, windowEnd),
      fetchAllActiveStudentsMap(),
      fetchFutureScheduleStatus(windowEnd),
      fetchFutureCoachRoomUserIds(windowEnd),
      fetchWindowCoachRoomUserIds(windowStart, windowEnd),
    ]);

    const { studyHallUsers, vocabUsers, lastDateByUser, studyHallMinutes, vocabMinutes } = scheduleStatus;

    // 이름 → 등록된 미래 스터디홀/보캡 분(minutes)
    const scheduledMinutesByName = new Map<string, { studyHall: number; vocab: number }>();
    for (const [userId, name] of allActiveMap) {
      const studyHall = studyHallMinutes.get(userId) ?? 0;
      const vocab = vocabMinutes.get(userId) ?? 0;
      if (studyHall || vocab) scheduledMinutesByName.set(name, { studyHall, vocab });
    }

    // 윈도우 내 스케줄을 새로 입력한 학생 이름 집합 (스터디홀/보캡 vs 코치룸 구분)
    const recentStudyHallVocabNames = new Set<string>(rawEntries.map(e => e.studentName));
    const recentCoachRoomNames = new Set<string>();
    for (const userId of windowCoachUserIds) {
      const name = allActiveMap.get(userId);
      if (name) recentCoachRoomNames.add(name);
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

    console.log(`[cron/schedule-input-status] ending-soon=${endingSoon.length} | needs-attention=${studentsNeedingAttention.length} | recently-scheduled(sh/vocab)=${recentStudyHallVocabNames.size} | recently-scheduled(coach)=${recentCoachRoomNames.size}`);

    await notifyScheduleInputStatus({ endingSoon, hoursBuckets, recentStudyHallVocabNames, recentCoachRoomNames, scheduledMinutesByName, windowLabel });

    return NextResponse.json({
      ok: true,
      endingSoon: endingSoon.length,
      studentsNeedingAttention: studentsNeedingAttention.length,
      recentlyScheduledStudyHallVocab: recentStudyHallVocabNames.size,
      recentlyScheduledCoachRoom: recentCoachRoomNames.size,
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
  const ydKSTMidnightUTC = Date.UTC(nowKST.getUTCFullYear(), nowKST.getUTCMonth(), nowKST.getUTCDate() - 1);

  const windowStart = new Date(ydKSTMidnightUTC - KST_MS);
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
  activityType: 'Study Hall' | 'Vocab';
  scheduledTimeISO: string;
}

export interface EndingSoon {
  studentName: string;
  lastDate: string;
}

export interface ScheduleStatusEntry {
  hasStudyHall: boolean;
  hasVocab: boolean;
  students: string[];
}

export interface HoursBucket {
  label: string;
  emoji: string;
  noCoach: ScheduleStatusEntry[];
  hasCoach: ScheduleStatusEntry[];
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

// SH/보캡 조합 → 서브 정렬 순서 (낮을수록 urgent)
const SH_VOCAB_PRIORITY: Record<string, number> = {
  '00': 0, '01': 1, '10': 2, '11': 3,
};

function buildHoursBuckets(
  students: { userId: string; hasCoach: boolean; hasStudyHall: boolean; hasVocab: boolean }[],
  nameMap: Map<string, string>,
  remainingMap: Map<string, number>,
): HoursBucket[] {
  type EntryMap = Map<string, ScheduleStatusEntry & { key: string }>;
  const bucketData = new Map<string, { noCoach: EntryMap; hasCoach: EntryMap }>();

  for (const { userId, hasCoach, hasStudyHall, hasVocab } of students) {
    const name = nameMap.get(userId);
    if (!name) continue;
    const hours = remainingMap.get(userId) ?? 0;
    const bucketDef = HOUR_BUCKETS_DEF.find(b => hours >= b.min && hours <= b.max);
    if (!bucketDef) continue;

    if (!bucketData.has(bucketDef.label)) {
      bucketData.set(bucketDef.label, { noCoach: new Map(), hasCoach: new Map() });
    }
    const { noCoach, hasCoach: hasCoachMap } = bucketData.get(bucketDef.label)!;
    const subKey = `${hasStudyHall ? 1 : 0}${hasVocab ? 1 : 0}`;
    const target = hasCoach ? hasCoachMap : noCoach;
    if (!target.has(subKey)) target.set(subKey, { hasStudyHall, hasVocab, students: [], key: subKey });
    target.get(subKey)!.students.push(name);
  }

  function sortEntries(map: EntryMap): ScheduleStatusEntry[] {
    return [...map.values()]
      .sort((a, b) => (SH_VOCAB_PRIORITY[a.key] ?? 9) - (SH_VOCAB_PRIORITY[b.key] ?? 9))
      .map(({ hasStudyHall, hasVocab, students }) => {
        students.sort((a, z) => a.localeCompare(z, 'ko'));
        return { hasStudyHall, hasVocab, students };
      });
  }

  const result: HoursBucket[] = [];
  for (const bucketDef of HOUR_BUCKETS_DEF) {
    const data = bucketData.get(bucketDef.label);
    if (!data) continue;
    const noCoach = sortEntries(data.noCoach);
    const hasCoach = sortEntries(data.hasCoach);
    if (!noCoach.length && !hasCoach.length) continue;
    result.push({ label: bucketDef.label, emoji: bucketDef.emoji, noCoach, hasCoach });
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

// ─── 미래 스터디홀/보캡 현황 (스터디홀/보캡 분리 추적) ─────────────────────────

async function fetchFutureScheduleStatus(now: Date): Promise<{
  studyHallUsers: Set<string>;
  vocabUsers: Set<string>;
  lastDateByUser: Map<string, Date>;
  studyHallMinutes: Map<string, number>;
  vocabMinutes: Map<string, number>;
}> {
  const studyHallUsers = new Set<string>();
  const vocabUsers = new Set<string>();
  const studyHallMinutes = new Map<string, number>();
  const vocabMinutes = new Map<string, number>();
  const lastDateByUser = new Map<string, Date>();
  const PAGE_SIZE = 1000;

  const futureEvents: { id: string; category: string; starts_at: string; ends_at: string | null }[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: page, error } = await supabaseSFv2
      .from('scheduled_events')
      .select('id, category, starts_at, ends_at')
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
    const minutesById = new Map(futureEvents.map(e => [
      e.id,
      e.ends_at ? Math.round((new Date(e.ends_at).getTime() - new Date(e.starts_at).getTime()) / 60000) : 0,
    ]));
    const ids = futureEvents.map(e => e.id);
    for (let i = 0; i < ids.length; i += 100) {
      const { data } = await supabaseSFv2
        .from('scheduled_event_participants')
        .select('event_id, user_id')
        .in('event_id', ids.slice(i, i + 100));
      for (const p of data ?? []) {
        if (!p.user_id) continue;
        const cat = catById.get(p.event_id);
        const minutes = minutesById.get(p.event_id) ?? 0;
        if (cat === 'study_hall') {
          studyHallUsers.add(p.user_id);
          studyHallMinutes.set(p.user_id, (studyHallMinutes.get(p.user_id) ?? 0) + minutes);
        } else if (cat === 'vocab') {
          vocabUsers.add(p.user_id);
          vocabMinutes.set(p.user_id, (vocabMinutes.get(p.user_id) ?? 0) + minutes);
        }
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

  return { studyHallUsers, vocabUsers, lastDateByUser, studyHallMinutes, vocabMinutes };
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
