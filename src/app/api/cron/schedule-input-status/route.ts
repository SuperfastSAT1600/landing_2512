import { NextRequest, NextResponse } from 'next/server';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { notifyScheduleInputStatus } from '@/lib/slack-sfv2';

/**
 * GET /api/cron/schedule-input-status
 * Vercel Cron — 매일 00:00 UTC (= 09:00 KST)
 *
 * 전날 00:00 KST ~ 당일 09:00 KST 사이에 새로 생성된
 * Study Hall / Vocab / Test Center 스케줄을 집계하여
 * #006_학습현황_출석률 (C0BNF23DQ5R)에 발송한다.
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

    const [scheduled, allActive] = await Promise.all([
      fetchNewScheduled(windowStart, windowEnd),
      fetchAllActiveStudents(),
    ]);

    const scheduledNames = new Set(scheduled.map(e => e.studentName));
    const unscheduled = allActive
      .filter(n => !scheduledNames.has(n))
      .sort((a, b) => a.localeCompare(b, 'ko'));

    console.log(`[cron/schedule-input-status] scheduled=${scheduled.length} entries, ${scheduledNames.size} students | unscheduled=${unscheduled.length}`);

    await notifyScheduleInputStatus({ scheduled, unscheduled, windowLabel });

    return NextResponse.json({
      ok: true,
      scheduledStudents: scheduledNames.size,
      scheduledEntries: scheduled.length,
      unscheduledStudents: unscheduled.length,
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

// ─── 신규 스케줄 조회 ─────────────────────────────────────────────────────────

export interface ScheduleEntry {
  studentName: string;
  activityType: 'Study Hall' | 'Vocab' | 'Test Center';
  scheduledTime: string; // KST display string
}

async function fetchNewScheduled(windowStart: Date, windowEnd: Date): Promise<ScheduleEntry[]> {
  const [shVocab, testCenter] = await Promise.all([
    fetchStudyHallVocab(windowStart, windowEnd),
    fetchTestCenter(windowStart, windowEnd),
  ]);
  return [...shVocab, ...testCenter].sort((a, b) =>
    a.studentName.localeCompare(b.studentName, 'ko') || a.scheduledTime.localeCompare(b.scheduledTime),
  );
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

  // participants: event_id → user_id
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

  // user_id → student name
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
      scheduledTime: toKSTDisplay(startsAtById.get(p.event_id) ?? ''),
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
      scheduledTime: toKSTDisplay(s.started_at),
    }))
    .filter(e => e.studentName);
}

// ─── 전체 활성 학생 ───────────────────────────────────────────────────────────

async function fetchAllActiveStudents(): Promise<string[]> {
  const PAGE_SIZE = 1000;
  const studentIds = new Set<string>();

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: page, error } = await supabaseSFv2
      .from('payments')
      .select('student_id')
      .in('management_status', ['active', 'onboarding', 'paused'])
      .not('student_id', 'is', null)
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) { console.error('[schedule-input-status] payments error:', error.message); break; }
    if (!page?.length) break;
    for (const row of page) if (row.student_id) studentIds.add(row.student_id as string);
    if (page.length < PAGE_SIZE) break;
  }

  if (!studentIds.size) return [];

  const nameMap = await fetchStudentNames([...studentIds]);
  return [...nameMap.values()];
}

// ─── 공통: student 이름 조회 ──────────────────────────────────────────────────

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
