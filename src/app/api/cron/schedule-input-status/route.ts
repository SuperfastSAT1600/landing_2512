import { NextRequest, NextResponse } from 'next/server';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { notifyScheduleInputStatus } from '@/lib/slack-sfv2';

/**
 * GET /api/cron/schedule-input-status
 * Vercel Cron — 매일 00:00 UTC (= 09:00 KST)
 *
 * - 신규 입력: 전날 00:00 KST ~ 당일 09:00 KST 사이에 추가된 스케줄 (칭찬용)
 * - 종료 임박: 미래 일정이 있으나 내일(+48h)까지 끝나는 학생 (선제 관리용)
 * - 예정 없음: 지금 이후 예정된 스케줄이 하나도 없는 학생 (관리용)
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

    // 종료 임박: 미래 일정 있으나 48h 이내에 끝남
    const soonThreshold = new Date(windowEnd.getTime() + 2 * 24 * 60 * 60 * 1000);
    const endingSoon: EndingSoon[] = [];
    const noSchedule: string[] = [];

    for (const [userId, name] of allActiveMap) {
      const last = futureInfo.get(userId);
      if (!last) {
        noSchedule.push(name);
      } else if (last < soonThreshold) {
        endingSoon.push({ studentName: name, lastDate: toKSTDisplay(last.toISOString()).slice(0, 5) });
      }
    }
    noSchedule.sort((a, b) => a.localeCompare(b, 'ko'));
    endingSoon.sort((a, b) => a.studentName.localeCompare(b.studentName, 'ko'));

    console.log(`[cron/schedule-input-status] new=${summaries.length} | ending-soon=${endingSoon.length} | no-schedule=${noSchedule.length}`);

    await notifyScheduleInputStatus({ summaries, endingSoon, noSchedule, windowLabel });

    return NextResponse.json({
      ok: true,
      newStudents: summaries.length,
      endingSoon: endingSoon.length,
      noSchedule: noSchedule.length,
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

  // Study Hall / Vocab
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

  // Test Center
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
