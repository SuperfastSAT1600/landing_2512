import { NextRequest, NextResponse } from 'next/server';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { isAuthenticated } from '@/lib/server-auth';

export interface SurveyRow {
  student_id: string;
  student_name: string | null;
  survey_key: string;
  answer: string | null;
  rating: number | null;
  free_text: string | null;
  responded_at: string;
  session_starts_at: string | null;
  session_status: string | null;
  teacher_name: string | null;
  teacher_id: string | null;
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: surveys, error: sErr } = await supabaseSFv2
    .from('student_survey_response')
    .select('student_id, survey_key, answer, rating, free_text, responded_at')
    .order('responded_at', { ascending: false })
    .limit(200);

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  if (!surveys?.length) return NextResponse.json({ data: [] });

  const studentIds = [...new Set(surveys.map((s: { student_id: string }) => s.student_id))];

  // Batch: student profiles
  const { data: studentProfiles } = await supabaseSFv2
    .from('profiles')
    .select('id, full_name')
    .in('id', studentIds);

  const studentNameMap = new Map<string, string>(
    (studentProfiles ?? []).map((p: { id: string; full_name: string }) => [p.id, p.full_name])
  );

  // Batch: event participation for all students
  const { data: participants } = await supabaseSFv2
    .from('scheduled_event_participants')
    .select('event_id, user_id')
    .in('user_id', studentIds);

  const eventIds = [...new Set((participants ?? []).map((p: { event_id: string }) => p.event_id))];

  // Batch: coach_room events
  const studentEventMap = new Map<string, string[]>();
  for (const p of (participants ?? []) as { event_id: string; user_id: string }[]) {
    if (!studentEventMap.has(p.user_id)) studentEventMap.set(p.user_id, []);
    studentEventMap.get(p.user_id)!.push(p.event_id);
  }

  let events: { id: string; starts_at: string; status: string; assigned_teacher_id: string | null }[] = [];
  if (eventIds.length) {
    const { data: evData } = await supabaseSFv2
      .from('scheduled_events')
      .select('id, starts_at, status, assigned_teacher_id')
      .in('id', eventIds)
      .eq('category', 'coach_room');
    events = (evData ?? []) as typeof events;
  }

  const eventById = new Map(events.map(e => [e.id, e]));

  // Batch: teacher profiles
  const teacherIds = [...new Set(
    events.map(e => e.assigned_teacher_id).filter(Boolean) as string[]
  )];

  const teacherNameMap = new Map<string, string>();
  if (teacherIds.length) {
    const { data: teacherProfiles } = await supabaseSFv2
      .from('profiles')
      .select('id, full_name')
      .in('id', teacherIds);
    for (const p of (teacherProfiles ?? []) as { id: string; full_name: string }[]) {
      teacherNameMap.set(p.id, p.full_name);
    }
  }

  // Assemble rows: for each survey, find the most recent session before responded_at
  const rows: SurveyRow[] = surveys.map((s: {
    student_id: string;
    survey_key: string;
    answer: string | null;
    rating: number | null;
    free_text: string | null;
    responded_at: string;
  }) => {
    const respondedAt = new Date(s.responded_at).getTime();
    const studentEvIds = studentEventMap.get(s.student_id) ?? [];

    let bestEvent: typeof events[0] | null = null;
    for (const eid of studentEvIds) {
      const ev = eventById.get(eid);
      if (!ev) continue;
      const evTime = new Date(ev.starts_at).getTime();
      if (evTime > respondedAt) continue;
      if (!bestEvent || evTime > new Date(bestEvent.starts_at).getTime()) {
        bestEvent = ev;
      }
    }

    return {
      student_id: s.student_id,
      student_name: studentNameMap.get(s.student_id) ?? null,
      survey_key: s.survey_key,
      answer: s.answer,
      rating: s.rating,
      free_text: s.free_text,
      responded_at: s.responded_at,
      session_starts_at: bestEvent?.starts_at ?? null,
      session_status: bestEvent?.status ?? null,
      teacher_name: bestEvent?.assigned_teacher_id
        ? (teacherNameMap.get(bestEvent.assigned_teacher_id) ?? null)
        : null,
      teacher_id: bestEvent?.assigned_teacher_id ?? null,
    };
  });

  return NextResponse.json({ data: rows });
}
