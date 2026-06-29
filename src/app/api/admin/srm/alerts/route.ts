import { NextRequest, NextResponse } from 'next/server';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export interface NoClassAlert {
  matchingId: string;
  students: string[];
  studentIds: string[];
  coaches: string[];
  coachIds: string[];
  lastClassDate: string;
}

export interface NoStudyHallAlert {
  studentId: string;
  studentName: string;
  coaches: string[];
  coachIds: string[];
  matchingId: string;
}

export interface NoVocabAlert {
  studentId: string;
  studentName: string;
  coaches: string[];
  coachIds: string[];
  matchingId: string;
}

export interface AlertsResponse {
  noUpcomingClass: NoClassAlert[];
  noStudyHall: NoStudyHallAlert[];
  noVocab: NoVocabAlert[];
}

// 이번 주 월요일(KST 기준) UTC 경계를 계산
function getKSTWeekBoundaries() {
  const kstOffset = 9 * 60 * 60 * 1000;
  const nowKST = new Date(Date.now() + kstOffset);
  const dayOfWeek = nowKST.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const thisMondayKST = new Date(nowKST);
  thisMondayKST.setUTCDate(nowKST.getUTCDate() - daysToMonday);
  thisMondayKST.setUTCHours(0, 0, 0, 0);

  const thisWeekStart = new Date(thisMondayKST.getTime() - kstOffset);
  const thisWeekEnd = new Date(thisWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const activeStart = new Date(thisWeekStart.getTime() - 3 * 7 * 24 * 60 * 60 * 1000);

  return {
    activeStart: activeStart.toISOString(),
    thisWeekStart: thisWeekStart.toISOString(),
    thisWeekEnd: thisWeekEnd.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { activeStart, thisWeekStart, thisWeekEnd } = getKSTWeekBoundaries();
    const today = new Date().toISOString().slice(0, 10);

    // 수업 중(enrolled + 비휴원) 학생 — 모든 알림 공용
    const [{ data: enrolledStudents }, { data: pauseRows }] = await Promise.all([
      supabaseAdmin
        .from('students')
        .select('id, sfv2_profile_id')
        .eq('lead_status', 'enrolled')
        .not('sfv2_profile_id', 'is', null),
      supabaseAdmin
        .from('student_pauses')
        .select('student_id, sfv2_profile_id')
        .is('ended_at', null)
        .lte('pause_start', today)
        .or(`pause_until.is.null,pause_until.gte.${today}`),
    ]);

    const pausedByStudentId = new Set(
      (pauseRows ?? []).map((p) => p.student_id).filter(Boolean) as string[]
    );
    const pausedByProfileId = new Set(
      (pauseRows ?? []).map((p) => p.sfv2_profile_id).filter(Boolean) as string[]
    );

    const activeEnrolledProfileIds = new Set(
      (enrolledStudents ?? [])
        .filter(
          (s) =>
            !pausedByStudentId.has(s.id) &&
            !(s.sfv2_profile_id && pausedByProfileId.has(s.sfv2_profile_id))
        )
        .map((s) => s.sfv2_profile_id as string)
    );

    // ── 수업 미잡힌 조합 ──────────────────────────────────────────
    const [{ data: recentEvents }, { data: thisWeekClassEvents }] = await Promise.all([
      supabaseSFv2
        .from('scheduled_events')
        .select('matching_id, starts_at')
        .eq('category', 'coach_room')
        .gte('starts_at', activeStart)
        .lt('starts_at', thisWeekStart)
        .neq('status', 'cancelled'),
      supabaseSFv2
        .from('scheduled_events')
        .select('matching_id')
        .eq('category', 'coach_room')
        .gte('starts_at', thisWeekStart)
        .lt('starts_at', thisWeekEnd)
        .neq('status', 'cancelled'),
    ]);

    const thisWeekMatchingIds = new Set(
      (thisWeekClassEvents ?? []).map((e) => e.matching_id).filter(Boolean)
    );

    const recentByMatching = new Map<string, string>();
    for (const ev of recentEvents ?? []) {
      if (!ev.matching_id) continue;
      const cur = recentByMatching.get(ev.matching_id);
      if (!cur || ev.starts_at > cur) recentByMatching.set(ev.matching_id, ev.starts_at);
    }

    const atRiskMatchingIds = [...recentByMatching.keys()].filter(
      (id) => !thisWeekMatchingIds.has(id)
    );

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
      const teacherIdsByMatching = new Map<string, string[]>();

      for (const s of mStudents ?? []) {
        if (!studentsByMatching.has(s.matching_id)) {
          studentsByMatching.set(s.matching_id, []);
          studentIdsByMatching.set(s.matching_id, []);
        }
        studentsByMatching.get(s.matching_id)!.push(nameMap.get(s.student_id) ?? '?');
        studentIdsByMatching.get(s.matching_id)!.push(s.student_id);
      }
      for (const t of mTeachers ?? []) {
        if (!teachersByMatching.has(t.matching_id)) {
          teachersByMatching.set(t.matching_id, []);
          teacherIdsByMatching.set(t.matching_id, []);
        }
        teachersByMatching.get(t.matching_id)!.push(nameMap.get(t.teacher_id) ?? '?');
        teacherIdsByMatching.get(t.matching_id)!.push(t.teacher_id);
      }

      noUpcomingClass = atRiskMatchingIds
        .filter((id) => {
          const sids = studentIdsByMatching.get(id) ?? [];
          return sids.some((sid) => activeEnrolledProfileIds.has(sid));
        })
        .map((id) => ({
          matchingId: id,
          students: studentsByMatching.get(id) ?? [],
          studentIds: studentIdsByMatching.get(id) ?? [],
          coaches: teachersByMatching.get(id) ?? [],
          coachIds: teacherIdsByMatching.get(id) ?? [],
          lastClassDate: recentByMatching.get(id) ?? '',
        }));
    }

    // ── 이번 주 스터디홀·vocab 있는 학생 파악 ────────────────────
    const [
      { data: recentCoachEvents },
      { data: thisSHEvents },
      { data: thisVocabEvents },
    ] = await Promise.all([
      supabaseSFv2
        .from('scheduled_events')
        .select('id')
        .eq('category', 'coach_room')
        .gte('starts_at', activeStart)
        .lt('starts_at', thisWeekStart)
        .neq('status', 'cancelled'),
      supabaseSFv2
        .from('scheduled_events')
        .select('id')
        .eq('category', 'study_hall')
        .gte('starts_at', thisWeekStart)
        .lt('starts_at', thisWeekEnd)
        .neq('status', 'cancelled'),
      supabaseSFv2
        .from('scheduled_events')
        .select('id')
        .eq('category', 'vocab')
        .gte('starts_at', thisWeekStart)
        .lt('starts_at', thisWeekEnd)
        .neq('status', 'cancelled'),
    ]);

    const recentCoachIds = (recentCoachEvents ?? []).map((e) => e.id);
    const thisSHIds = (thisSHEvents ?? []).map((e) => e.id);
    const thisVocabIds = (thisVocabEvents ?? []).map((e) => e.id);

    const [
      { data: recentParticipants },
      { data: thisSHParticipants },
      { data: thisVocabParticipants },
    ] = await Promise.all([
      recentCoachIds.length
        ? supabaseSFv2.from('scheduled_event_participants').select('user_id').in('event_id', recentCoachIds)
        : { data: [] },
      thisSHIds.length
        ? supabaseSFv2.from('scheduled_event_participants').select('user_id').in('event_id', thisSHIds)
        : { data: [] },
      thisVocabIds.length
        ? supabaseSFv2.from('scheduled_event_participants').select('user_id').in('event_id', thisVocabIds)
        : { data: [] },
    ]);

    const activeStudentIds = [...new Set((recentParticipants ?? []).map((p) => p.user_id))];
    const hasSHThisWeek = new Set((thisSHParticipants ?? []).map((p) => p.user_id));
    const hasVocabThisWeek = new Set((thisVocabParticipants ?? []).map((p) => p.user_id));

    // 수업 중 + 지난 3주 수업 있음 + 이번 주 스터디홀/vocab 없음
    const noSHStudentIds = activeStudentIds.filter(
      (id) => activeEnrolledProfileIds.has(id) && !hasSHThisWeek.has(id)
    );
    const noVocabStudentIds = activeStudentIds.filter(
      (id) => activeEnrolledProfileIds.has(id) && !hasVocabThisWeek.has(id)
    );

    // ── 학생-코치 매핑 (스터디홀·vocab 공용) ─────────────────────
    const allAlertStudentIds = [...new Set([...noSHStudentIds, ...noVocabStudentIds])];

    const [{ data: alertProfiles }, { data: alertStudentMatchings }] = await Promise.all([
      allAlertStudentIds.length
        ? supabaseSFv2.from('profiles').select('id, full_name').in('id', allAlertStudentIds)
        : { data: [] },
      allAlertStudentIds.length
        ? supabaseSFv2.from('matching_students').select('matching_id, student_id').in('student_id', allAlertStudentIds)
        : { data: [] },
    ]);

    const alertMatchingIds = [...new Set((alertStudentMatchings ?? []).map((m) => m.matching_id))];

    const { data: alertMatchingTeachers } = alertMatchingIds.length
      ? await supabaseSFv2.from('matching_teachers').select('matching_id, teacher_id').in('matching_id', alertMatchingIds)
      : { data: [] };

    const alertTeacherIds = [...new Set((alertMatchingTeachers ?? []).map((t) => t.teacher_id))];

    const { data: alertTeacherProfiles } = alertTeacherIds.length
      ? await supabaseSFv2.from('profiles').select('id, full_name').in('id', alertTeacherIds)
      : { data: [] };

    const alertTeacherNameMap = new Map((alertTeacherProfiles ?? []).map((p) => [p.id, p.full_name]));
    const alertProfileMap = new Map((alertProfiles ?? []).map((p) => [p.id, p.full_name]));

    const matchingToCoaches = new Map<string, { coaches: string[]; coachIds: string[] }>();
    for (const t of alertMatchingTeachers ?? []) {
      if (!matchingToCoaches.has(t.matching_id)) {
        matchingToCoaches.set(t.matching_id, { coaches: [], coachIds: [] });
      }
      const entry = matchingToCoaches.get(t.matching_id)!;
      entry.coaches.push(alertTeacherNameMap.get(t.teacher_id) ?? '?');
      entry.coachIds.push(t.teacher_id);
    }

    const studentToCoachInfo = new Map<string, { coaches: string[]; coachIds: string[]; matchingId: string }>();
    for (const sm of alertStudentMatchings ?? []) {
      if (!studentToCoachInfo.has(sm.student_id)) {
        const coachInfo = matchingToCoaches.get(sm.matching_id) ?? { coaches: [], coachIds: [] };
        studentToCoachInfo.set(sm.student_id, {
          coaches: coachInfo.coaches,
          coachIds: coachInfo.coachIds,
          matchingId: sm.matching_id,
        });
      }
    }

    const noStudyHall: NoStudyHallAlert[] = noSHStudentIds.map((id) => {
      const coachInfo = studentToCoachInfo.get(id) ?? { coaches: [], coachIds: [], matchingId: '' };
      return {
        studentId: id,
        studentName: alertProfileMap.get(id) ?? '?',
        coaches: coachInfo.coaches,
        coachIds: coachInfo.coachIds,
        matchingId: coachInfo.matchingId,
      };
    });

    const noVocab: NoVocabAlert[] = noVocabStudentIds.map((id) => {
      const coachInfo = studentToCoachInfo.get(id) ?? { coaches: [], coachIds: [], matchingId: '' };
      return {
        studentId: id,
        studentName: alertProfileMap.get(id) ?? '?',
        coaches: coachInfo.coaches,
        coachIds: coachInfo.coachIds,
        matchingId: coachInfo.matchingId,
      };
    });

    return NextResponse.json({ noUpcomingClass, noStudyHall, noVocab } satisfies AlertsResponse);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
