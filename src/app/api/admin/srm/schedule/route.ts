import { NextRequest, NextResponse } from 'next/server';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';

export interface ScheduleEvent {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  students: string[];
  studentIds: string[];
  studentTimezones: (string | null)[]; // 학생별 parent_timezone (IANA)
  coaches: string[];
}

export interface ScheduleResponse {
  coachRoom: ScheduleEvent[];
  studyHall: ScheduleEvent[];
}

function kstDateToUtcRange(dateStr: string): { from: string; to: string } {
  const from = new Date(`${dateStr}T00:00:00+09:00`).toISOString();
  const to = new Date(`${dateStr}T23:59:59+09:00`).toISOString();
  return { from, to };
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date param required (YYYY-MM-DD)' }, { status: 400 });
  }

  const { from, to } = kstDateToUtcRange(date);

  const { data: events, error } = await supabaseSFv2
    .from('scheduled_events')
    .select('id, category, starts_at, ends_at, status')
    .in('category', ['coach_room', 'study_hall'])
    .gte('starts_at', from)
    .lte('starts_at', to)
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!events?.length) return NextResponse.json({ coachRoom: [], studyHall: [] });

  const eventIds = events.map((e) => e.id);

  const { data: participants } = await supabaseSFv2
    .from('scheduled_event_participants')
    .select('event_id, user_id')
    .in('event_id', eventIds);

  const userIds = [...new Set((participants ?? []).map((p) => p.user_id))];

  const { data: profiles } = await supabaseSFv2
    .from('profiles')
    .select('id, full_name, role, timezone')
    .in('id', userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const timezoneMap = new Map((profiles ?? []).map((p) => [p.id, p.timezone ?? null]));

  const evMap = new Map<string, { students: string[]; studentIds: string[]; studentTimezones: (string | null)[]; coaches: string[] }>();
  for (const p of participants ?? []) {
    if (!evMap.has(p.event_id)) evMap.set(p.event_id, { students: [], studentIds: [], studentTimezones: [], coaches: [] });
    const profile = profileMap.get(p.user_id);
    if (!profile) continue;
    const entry = evMap.get(p.event_id)!;
    if (profile.role === 'student') {
      entry.students.push(profile.full_name);
      entry.studentIds.push(profile.id);
      entry.studentTimezones.push(timezoneMap.get(profile.id) ?? null);
    } else if (profile.role === 'teacher') {
      entry.coaches.push(profile.full_name);
    }
  }

  const coachRoom: ScheduleEvent[] = [];
  const studyHall: ScheduleEvent[] = [];

  for (const ev of events) {
    const users = evMap.get(ev.id) ?? { students: [], studentIds: [], studentTimezones: [], coaches: [] };
    const item: ScheduleEvent = {
      id: ev.id,
      startsAt: ev.starts_at,
      endsAt: ev.ends_at,
      status: ev.status,
      students: users.students,
      studentIds: users.studentIds,
      studentTimezones: users.studentTimezones,
      coaches: users.coaches,
    };
    if (ev.category === 'coach_room') coachRoom.push(item);
    else studyHall.push(item);
  }

  return NextResponse.json({ coachRoom, studyHall } satisfies ScheduleResponse);
}
