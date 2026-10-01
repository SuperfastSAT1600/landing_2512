import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { kstDayRange, fetchCoachRoomBatch, fetchStudyHallBatch, fetchTestCenterBatch, fetchVocabBatch, fetchScheduleBatch } from '@/lib/learning-data';
import type { TutoringUsersResponse } from '@/app/api/admin/srm/tutoring-users/route';

export interface ServiceUsageStudent {
  name: string;
  sfv2ProfileId: string | null;
  tutoringStatus: string;
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
  fromCache?: boolean;
}

function kstToday(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
}


// ── Cache helpers ─────────────────────────────────────────────────────────────

type CacheRow = {
  sfv2_profile_id: string;
  name: string;
  tutoring_status: string;
  schedule: { coachRoom: boolean; studyHall: boolean; vocab: boolean };
  coach_room: { sessionCount: number; durationMinutes: number } | null;
  study_hall: { totalProblems: number } | null;
  vocab: { gradedCount: number } | null;
  test_center: { totalProblems: number } | null;
};

function cacheRowToStudent(row: CacheRow): ServiceUsageStudent {
  return {
    name: row.name,
    sfv2ProfileId: row.sfv2_profile_id,
    tutoringStatus: row.tutoring_status,
    schedule: row.schedule,
    coachRoom: row.coach_room,
    studyHall: row.study_hall,
    vocab: row.vocab,
    testCenter: row.test_center,
  };
}

async function readCache(date: string, profileIds: string[]): Promise<Map<string, CacheRow>> {
  if (!profileIds.length) return new Map();
  const { data } = await supabaseAdmin
    .from('srm_service_usage_cache')
    .select('sfv2_profile_id, name, tutoring_status, schedule, coach_room, study_hall, vocab, test_center')
    .eq('date', date)
    .in('sfv2_profile_id', profileIds);
  const map = new Map<string, CacheRow>();
  for (const row of data ?? []) map.set(row.sfv2_profile_id as string, row as CacheRow);
  return map;
}

async function writeCache(date: string, students: ServiceUsageStudent[]): Promise<void> {
  const rows = students
    .filter(s => s.sfv2ProfileId)
    .map(s => ({
      date,
      sfv2_profile_id: s.sfv2ProfileId!,
      name: s.name,
      tutoring_status: s.tutoringStatus,
      schedule: s.schedule,
      coach_room: s.coachRoom,
      study_hall: s.studyHall,
      vocab: s.vocab,
      test_center: s.testCenter,
      cached_at: new Date().toISOString(),
    }));
  if (!rows.length) return;
  await supabaseAdmin.from('srm_service_usage_cache').upsert(rows, { onConflict: 'date,sfv2_profile_id' });
}

// ── Live fetch for a set of profileIds ────────────────────────────────────────

async function fetchLiveForProfiles(
  profileIds: string[],
  start: string,
  end: string,
  usersByProfileId: Map<string, { name: string; status: string }>,
): Promise<ServiceUsageStudent[]> {
  if (!profileIds.length) return [];

  const [coachRoomMap, studyHallMap, testCenterMap, vocabMap, scheduleMap] = await Promise.all([
    fetchCoachRoomBatch(profileIds, start, end),
    fetchStudyHallBatch(profileIds, start, end),
    fetchTestCenterBatch(profileIds, start, end),
    fetchVocabBatch(profileIds, start, end),
    fetchScheduleBatch(profileIds, start, end),
  ]);

  return profileIds.map(pid => {
    const user = usersByProfileId.get(pid)!;
    const sh = studyHallMap.get(pid) ?? null;
    const tc = testCenterMap.get(pid) ?? [];
    const tcTotal = tc.reduce((sum, t) => sum + t.totalProblems, 0);
    const vc = vocabMap.get(pid) ?? null;
    const cr = coachRoomMap.get(pid) ?? null;
    const sched = scheduleMap.get(pid) ?? { coachRoom: false, studyHall: false, vocab: false };

    return {
      name: user.name,
      sfv2ProfileId: pid,
      tutoringStatus: user.status,
      schedule: sched,
      coachRoom: cr,
      studyHall: sh ? { totalProblems: sh.totalProblems } : null,
      vocab: vc ? { gradedCount: vc.gradedCount } : null,
      testCenter: tcTotal > 0 ? { totalProblems: tcTotal } : null,
    };
  });
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') ?? kstToday();
  const forceRefresh = searchParams.get('refresh') === 'true';

  try {
    const usersUrl = new URL('/api/admin/srm/tutoring-users', req.url);
    const adminKey = req.headers.get('x-admin-key') ?? '';
    const usersRes = await fetch(usersUrl.toString(), { headers: { 'x-admin-key': adminKey } });
    if (!usersRes.ok) throw new Error(`tutoring-users fetch failed: ${usersRes.status}`);
    const usersData: TutoringUsersResponse = await usersRes.json();

    const isPast = date < kstToday();
    const { start, end } = kstDayRange(date);

    // 오늘: 재원/휴원만 실시간 표시
    // 과거: 전체 linked 학생 캐싱 — 이탈 전 재원생 이력 보존
    const activeAndPaused = usersData.linked.filter(
      u => u.status === 'active' || u.status === 'paused'
    );
    const studentsPool = isPast ? usersData.linked : activeAndPaused;

    const profileIds = studentsPool
      .map(u => u.sfv2ProfileId)
      .filter((id): id is string => Boolean(id));

    const usersByProfileId = new Map(
      studentsPool
        .filter(u => u.sfv2ProfileId)
        .map(u => [u.sfv2ProfileId!, { name: u.name, status: u.status }])
    );

    // profileId 없는 학생은 오늘 재원/휴원만 표시 (활동 데이터 조회 불가)
    const noProfileStudents: ServiceUsageStudent[] = activeAndPaused
      .filter(u => !u.sfv2ProfileId)
      .map(u => ({
        name: u.name,
        sfv2ProfileId: null,
        tutoringStatus: u.status,
        schedule: { coachRoom: false, studyHall: false, vocab: false },
        coachRoom: null, studyHall: null, vocab: null, testCenter: null,
      }));

    let students: ServiceUsageStudent[];
    let fromCache = false;

    if (isPast) {
      // forceRefresh: delete stale cache rows first
      if (forceRefresh && profileIds.length) {
        await supabaseAdmin
          .from('srm_service_usage_cache')
          .delete()
          .eq('date', date)
          .in('sfv2_profile_id', profileIds);
      }

      // Try cache first
      const cached = forceRefresh ? new Map() : await readCache(date, profileIds);
      const missedIds = profileIds.filter(id => !cached.has(id));

      if (missedIds.length === 0) {
        // Full cache hit
        students = profileIds.map(id => cacheRowToStudent(cached.get(id)!));
        fromCache = true;
      } else {
        // Partial or full miss — fetch live for missed IDs, write to cache
        const freshStudents = await fetchLiveForProfiles(missedIds, start, end, usersByProfileId);
        await writeCache(date, freshStudents);

        // Merge cached + fresh
        const freshById = new Map(freshStudents.map(s => [s.sfv2ProfileId!, s]));
        students = profileIds.map(id =>
          cached.has(id) ? cacheRowToStudent(cached.get(id)!) : freshById.get(id)!
        ).filter(Boolean);

        fromCache = cached.size > 0;
      }
    } else {
      // Today (or future) — always live, active/paused only
      students = await fetchLiveForProfiles(profileIds, start, end, usersByProfileId);
    }

    const allStudents = [...students, ...noProfileStudents];

    allStudents.sort((a, b) => {
      if (a.tutoringStatus !== b.tutoringStatus) return a.tutoringStatus === 'active' ? -1 : 1;
      return a.name.localeCompare(b.name, 'ko');
    });

    return NextResponse.json({ date, students: allStudents, fromCache } satisfies ServiceUsageResponse);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}
