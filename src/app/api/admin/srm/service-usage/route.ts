import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { kstDayRange, fetchCoachRoomBatch, fetchStudyHallBatch, fetchTestCenterBatch, fetchVocabBatch } from '@/lib/learning-data';
import type { TutoringUsersResponse } from '@/app/api/admin/srm/tutoring-users/route';

export interface ServiceUsageStudent {
  name: string;
  sfv2ProfileId: string | null;
  tutoringStatus: 'active' | 'paused';
  coachRoom: { sessionCount: number; durationMinutes: number } | null;
  studyHall: { totalProblems: number } | null;
  vocab: { gradedCount: number } | null;
  testCenter: { totalProblems: number } | null;
}

export interface ServiceUsageResponse {
  date: string;
  students: ServiceUsageStudent[];
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);

  try {
    // Fetch tutoring users and filter to active/paused
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

    const [coachRoomMap, studyHallMap, testCenterMap, vocabMap] = await Promise.all([
      fetchCoachRoomBatch(profileIds, start, end),
      fetchStudyHallBatch(profileIds, start, end),
      fetchTestCenterBatch(profileIds, start, end),
      fetchVocabBatch(profileIds, start, end),
    ]);

    const students: ServiceUsageStudent[] = activeAndPaused.map(u => {
      const pid = u.sfv2ProfileId;
      const sh = pid ? studyHallMap.get(pid) ?? null : null;
      const tc = pid ? testCenterMap.get(pid) ?? [] : [];
      const tcTotal = tc.reduce((sum, t) => sum + t.totalProblems, 0);
      const vc = pid ? vocabMap.get(pid) ?? null : null;
      const cr = pid ? coachRoomMap.get(pid) ?? null : null;

      return {
        name: u.name,
        sfv2ProfileId: pid ?? null,
        tutoringStatus: u.status as 'active' | 'paused',
        coachRoom: cr,
        studyHall: sh ? { totalProblems: sh.totalProblems } : null,
        vocab: vc ? { gradedCount: vc.gradedCount } : null,
        testCenter: tcTotal > 0 ? { totalProblems: tcTotal } : null,
      };
    });

    // Sort: active first, then paused; within each group alphabetically
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
