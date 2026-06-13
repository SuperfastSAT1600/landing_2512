import { NextRequest, NextResponse } from 'next/server';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';

export interface ScheduleEvent {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  students: string[];
  studentIds: string[];
  studentTimezones: (string | null)[];
  coaches: string[];
  coachIds: string[];
}

export interface ScheduleResponse {
  today: { coachRoom: ScheduleEvent[]; studyHall: ScheduleEvent[] };
  tomorrow: { coachRoom: ScheduleEvent[]; studyHall: ScheduleEvent[] };
}

function kstDateToUtcRange(dateStr: string): { from: string; to: string } {
  const from = new Date(`${dateStr}T00:00:00+09:00`).toISOString();
  const to = new Date(`${dateStr}T23:59:59+09:00`).toISOString();
  return { from, to };
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function fetchEventsForDate(dateStr: string): Promise<{ coachRoom: ScheduleEvent[]; studyHall: ScheduleEvent[] }> {
  const { from, to } = kstDateToUtcRange(dateStr);

  const { data: events, error } = await supabaseSFv2
    .from('scheduled_events')
    .select('id, category, starts_at, ends_at, status')
    .in('category', ['coach_room', 'study_hall'])
    .gte('starts_at', from)
    .lte('starts_at', to)
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: true });

  if (error) throw new Error(error.message);
  if (!events?.length) return { coachRoom: [], studyHall: [] };

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

  const evMap = new Map<string, {
    students: string[];
    studentIds: string[];
    studentTimezones: (string | null)[];
    coaches: string[];
    coachIds: string[];
  }>();

  for (const p of participants ?? []) {
    if (!evMap.has(p.event_id)) {
      evMap.set(p.event_id, { students: [], studentIds: [], studentTimezones: [], coaches: [], coachIds: [] });
    }
    const profile = profileMap.get(p.user_id);
    if (!profile) continue;
    const entry = evMap.get(p.event_id)!;
    if (profile.role === 'student') {
      entry.students.push(profile.full_name);
      entry.studentIds.push(profile.id);
      entry.studentTimezones.push(timezoneMap.get(profile.id) ?? null);
    } else if (profile.role === 'teacher') {
      entry.coaches.push(profile.full_name);
      entry.coachIds.push(profile.id);
    }
  }

  const coachRoom: ScheduleEvent[] = [];
  const studyHall: ScheduleEvent[] = [];

  for (const ev of events) {
    const users = evMap.get(ev.id) ?? { students: [], studentIds: [], studentTimezones: [], coaches: [], coachIds: [] };
    const item: ScheduleEvent = {
      id: ev.id,
      startsAt: ev.starts_at,
      endsAt: ev.ends_at,
      status: ev.status,
      students: users.students,
      studentIds: users.studentIds,
      studentTimezones: users.studentTimezones,
      coaches: users.coaches,
      coachIds: users.coachIds,
    };
    if (ev.category === 'coach_room') coachRoom.push(item);
    else studyHall.push(item);
  }

  return { coachRoom, studyHall };
}

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get('date');
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date param required (YYYY-MM-DD)' }, { status: 400 });
    }

    const tomorrowDate = addDays(date, 1);

    const [today, tomorrow] = await Promise.all([
      fetchEventsForDate(date),
      fetchEventsForDate(tomorrowDate),
    ]);

    return NextResponse.json({ today, tomorrow } satisfies ScheduleResponse);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
