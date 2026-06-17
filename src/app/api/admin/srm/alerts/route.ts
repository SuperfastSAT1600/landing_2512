import { NextResponse } from 'next/server';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { supabaseAdmin } from '@/lib/supabase-admin';

export interface NoClassAlert {
  matchingId: string;
  students: string[];
  studentIds: string[];
  coaches: string[];
  lastClassDate: string;
}

export interface NoStudyHallAlert {
  studentId: string;
  studentName: string;
}

export interface AlertsResponse {
  noUpcomingClass: NoClassAlert[];
  noStudyHall: NoStudyHallAlert[];
}

function weeksAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n * 7);
  return d.toISOString();
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

export async function GET() {
  try {
  const now = new Date().toISOString();
  const past4w = weeksAgo(4);
  const future2w = daysFromNow(14);
  const future7d = daysFromNow(7);

  // 최근 4주 coach_room 이벤트
  const { data: recentEvents } = await supabaseSFv2
    .from('scheduled_events')
    .select('id, matching_id, starts_at')
    .eq('category', 'coach_room')
    .gte('starts_at', past4w)
    .lt('starts_at', now)
    .neq('status', 'cancelled');

  // 향후 2주 coach_room 이벤트
  const { data: futureEvents } = await supabaseSFv2
    .from('scheduled_events')
    .select('matching_id')
    .eq('category', 'coach_room')
    .gte('starts_at', now)
    .lte('starts_at', future2w)
    .neq('status', 'cancelled');

  const futureMatchingIds = new Set(
    (futureEvents ?? []).map((e) => e.matching_id).filter(Boolean)
  );

  // 최근 수업 있었지만 향후 수업 없는 매칭
  const recentByMatching = new Map<string, string>(); // matchingId → lastClassDate
  for (const ev of recentEvents ?? []) {
    if (!ev.matching_id) continue;
    const cur = recentByMatching.get(ev.matching_id);
    if (!cur || ev.starts_at > cur) recentByMatching.set(ev.matching_id, ev.starts_at);
  }

  const atRiskMatchingIds = [...recentByMatching.keys()].filter(
    (id) => !futureMatchingIds.has(id)
  );

  // 위험 매칭의 학생/코치 조회
  let noUpcomingClass: NoClassAlert[] = [];
  if (atRiskMatchingIds.length > 0) {
    const [{ data: mStudents }, { data: mTeachers }] = await Promise.all([
      supabaseSFv2.from('matching_students').select('matching_id, student_id').in('matching_id', atRiskMatchingIds),
      supabaseSFv2.from('matching_teachers').select('matching_id, teacher_id').in('matching_id', atRiskMatchingIds),
    ]);

    const allUserIds = [
      ...new Set([
        ...(mStudents ?? []).map((s) => s.student_id),
        ...(mTeachers ?? []).map((t) => t.teacher_id),
      ]),
    ];

    const { data: profiles } = await supabaseSFv2
      .from('profiles')
      .select('id, full_name')
      .in('id', allUserIds);

    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    const studentsByMatching = new Map<string, string[]>();
    const studentIdsByMatching = new Map<string, string[]>();
    const teachersByMatching = new Map<string, string[]>();

    for (const s of mStudents ?? []) {
      if (!studentsByMatching.has(s.matching_id)) {
        studentsByMatching.set(s.matching_id, []);
        studentIdsByMatching.set(s.matching_id, []);
      }
      studentsByMatching.get(s.matching_id)!.push(nameMap.get(s.student_id) ?? '?');
      studentIdsByMatching.get(s.matching_id)!.push(s.student_id);
    }
    for (const t of mTeachers ?? []) {
      if (!teachersByMatching.has(t.matching_id)) teachersByMatching.set(t.matching_id, []);
      teachersByMatching.get(t.matching_id)!.push(nameMap.get(t.teacher_id) ?? '?');
    }

    noUpcomingClass = atRiskMatchingIds.map((id) => ({
      matchingId: id,
      students: studentsByMatching.get(id) ?? [],
      studentIds: studentIdsByMatching.get(id) ?? [],
      coaches: teachersByMatching.get(id) ?? [],
      lastClassDate: recentByMatching.get(id) ?? '',
    }));
  }

  // 스터디홀 미세팅: 최근 4주 수업 있던 학생 중 다음 7일 스터디홀 없는 학생
  const { data: recentCoachEvents } = await supabaseSFv2
    .from('scheduled_events')
    .select('id')
    .eq('category', 'coach_room')
    .gte('starts_at', past4w)
    .lt('starts_at', now)
    .neq('status', 'cancelled');

  const recentCoachIds = (recentCoachEvents ?? []).map((e) => e.id);

  const { data: recentStudents } = recentCoachIds.length
    ? await supabaseSFv2
        .from('scheduled_event_participants')
        .select('user_id')
        .in('event_id', recentCoachIds)
    : { data: [] };

  const activeStudentIds = [...new Set((recentStudents ?? []).map((p) => p.user_id))];

  // 다음 7일 스터디홀 있는 학생
  const { data: futureSHEvents } = await supabaseSFv2
    .from('scheduled_events')
    .select('id')
    .eq('category', 'study_hall')
    .gte('starts_at', now)
    .lte('starts_at', future7d)
    .neq('status', 'cancelled');

  const futureSHIds = (futureSHEvents ?? []).map((e) => e.id);

  const { data: futureSHStudents } = futureSHIds.length
    ? await supabaseSFv2
        .from('scheduled_event_participants')
        .select('user_id')
        .in('event_id', futureSHIds)
    : { data: [] };

  const hasSHStudentIds = new Set((futureSHStudents ?? []).map((p) => p.user_id));

  // 활성 휴원 학생 제외
  const today = new Date().toISOString().slice(0, 10);
  const { data: pauseRows } = await supabaseAdmin
    .from('student_pauses')
    .select('sfv2_profile_id')
    .is('ended_at', null)
    .lte('pause_start', today)
    .or(`pause_until.is.null,pause_until.gte.${today}`)
    .not('sfv2_profile_id', 'is', null);

  const pausedProfileIds = new Set((pauseRows ?? []).map((p) => p.sfv2_profile_id as string));

  const noSHStudentIds = activeStudentIds.filter(
    (id) => !hasSHStudentIds.has(id) && !pausedProfileIds.has(id)
  );

  const { data: noSHProfiles } = noSHStudentIds.length
    ? await supabaseSFv2.from('profiles').select('id, full_name').in('id', noSHStudentIds)
    : { data: [] };

  const noStudyHall: NoStudyHallAlert[] = (noSHProfiles ?? []).map((p) => ({
    studentId: p.id,
    studentName: p.full_name,
  }));

  return NextResponse.json({ noUpcomingClass, noStudyHall } satisfies AlertsResponse);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
