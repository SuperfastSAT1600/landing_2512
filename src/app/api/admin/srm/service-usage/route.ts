import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { kstDayRange, fetchCoachRoomBatch, fetchStudyHallBatch, fetchTestCenterBatch, fetchVocabBatch } from '@/lib/learning-data';
import type { TutoringUsersResponse } from '@/app/api/admin/srm/tutoring-users/route';

export interface ServiceUsageStudent {
  name: string;
  sfv2ProfileId: string | null;
  tutoringStatus: 'active' | 'paused';
  schedule: {
    coachRoom: boolean;
    studyHall: boolean;
    vocab: boolean;
  };
  coachRoom: { sessionCount: number; durationMinutes: number } | null;
  studyHall: { totalProblems: number } | null;
  vocab: { gradedCount: number } | null;
  testCenter: { totalProblems: number } | null;
}

export interface ServiceUsageResponse {
  date: string;
  students: ServiceUsageStudent[];
}

async function fetchScheduleBatch(
  profileIds: string[],
  start: string,
  end: string,
): Promise<Map<string, { coachRoom: boolean; studyHall: boolean; vocab: boolean }>> {
  const empty = { coachRoom: false, studyHall: false, vocab: false };
  if (!profileIds.length) return new Map();

  const PAGE_SIZE = 1000;

  // Step 1: get event_ids for these users
  const allParticipants: { event_id: string; user_id: string }[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: page } = await supabaseSFv2
      .from('scheduled_event_participants')
      .select('event_id, user_id')
      .in('user_id', profileIds)
      .range(offset, offset + PAGE_SIZE - 1);
    if (!page?.length) break;
    allParticipants.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  if (!allParticipants.length) return new Map(profileIds.map(id => [id, { ...empty }]));

  const allEventIds = [...new Set(allParticipants.map(p => p.event_id))];

  // Step 2: fetch scheduled_events for coach_room / study_hall / vocab in date range, non-cancelled
  const allEvents: { id: string; category: string }[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data: page } = await supabaseSFv2
      .from('scheduled_events')
      .select('id, category')
      .in('id', allEventIds)
      .in('category', ['coach_room', 'study_hall', 'vocab'])
      .neq('status', 'cancelled')
      .gte('starts_at', start)
      .lte('starts_at', end)
      .range(offset, offset + PAGE_SIZE - 1);
    if (!page?.length) break;
    allEvents.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  if (!allEvents.length) return new Map(profileIds.map(id => [id, { ...empty }]));

  const validEventIds = new Set(allEvents.map(e => e.id));
  const categoryById = new Map(allEvents.map(e => [e.id, e.category as string]));

  // Group by user
  const byUser = new Map<string, { coachRoom: boolean; studyHall: boolean; vocab: boolean }>();
  for (const p of allParticipants) {
    if (!validEventIds.has(p.event_id)) continue;
    if (!byUser.has(p.user_id)) byUser.set(p.user_id, { ...empty });
    const entry = byUser.get(p.user_id)!;
    const cat = categoryById.get(p.event_id);
    if (cat === 'coach_room') entry.coachRoom = true;
    else if (cat === 'study_hall') entry.studyHall = true;
    else if (cat === 'vocab') entry.vocab = true;
  }

  return new Map(profileIds.map(id => [id, byUser.get(id) ?? { ...empty }]));
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);

  try {
    const usersUrl = new URL('/api/admin/srm/tutoring-users', req.url);
    const adminKey = req.headers.get('x-admin-key') ?? '';
    const usersRes = await fetch(usersUrl.toString(), {
      headers: { 'x-admin-key': adminKey },
    });
    if (!usersRes.ok) throw new Error(`tutoring-users fetch failed: ${usersRes.status}`);
    const usersData: TutoringUsersResponse = await usersRes.json();

    const activeAndPaused = usersData.linked.filter(
      u => u.status === 'active' || u.status === 'paused'
    );

    const profileIds = activeAndPaused
      .map(u => u.sfv2ProfileId)
      .filter((id): id is string => Boolean(id));

    const { start, end } = kstDayRange(date);

    const [coachRoomMap, studyHallMap, testCenterMap, vocabMap, scheduleMap] = await Promise.all([
      fetchCoachRoomBatch(profileIds, start, end),
      fetchStudyHallBatch(profileIds, start, end),
      fetchTestCenterBatch(profileIds, start, end),
      fetchVocabBatch(profileIds, start, end),
      fetchScheduleBatch(profileIds, start, end),
    ]);

    const students: ServiceUsageStudent[] = activeAndPaused.map(u => {
      const pid = u.sfv2ProfileId;
      const sh = pid ? studyHallMap.get(pid) ?? null : null;
      const tc = pid ? testCenterMap.get(pid) ?? [] : [];
      const tcTotal = tc.reduce((sum, t) => sum + t.totalProblems, 0);
      const vc = pid ? vocabMap.get(pid) ?? null : null;
      const cr = pid ? coachRoomMap.get(pid) ?? null : null;
      const sched = pid
        ? scheduleMap.get(pid) ?? { coachRoom: false, studyHall: false, vocab: false }
        : { coachRoom: false, studyHall: false, vocab: false };

      return {
        name: u.name,
        sfv2ProfileId: pid ?? null,
        tutoringStatus: u.status as 'active' | 'paused',
        schedule: sched,
        coachRoom: cr,
        studyHall: sh ? { totalProblems: sh.totalProblems } : null,
        vocab: vc ? { gradedCount: vc.gradedCount } : null,
        testCenter: tcTotal > 0 ? { totalProblems: tcTotal } : null,
      };
    });

    students.sort((a, b) => {
      if (a.tutoringStatus !== b.tutoringStatus) {
        return a.tutoringStatus === 'active' ? -1 : 1;
      }
      return a.name.localeCompare(b.name, 'ko');
    });

    return NextResponse.json({ date, students } satisfies ServiceUsageResponse);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}
