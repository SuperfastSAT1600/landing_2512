import { NextRequest, NextResponse } from 'next/server';
import { supabaseSFv2 } from '@/lib/supabase-sfv2';
import { notifyClassReminder, ClassReminderEvent } from '@/lib/slack';

// GET /api/cron/class-reminders
// Vercel Cron: every 15 minutes
// 45min window: [now+40, now+55) | 15min window: [now+10, now+25)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();

    const w45from = new Date(now.getTime() + 40 * 60 * 1000).toISOString();
    const w45to   = new Date(now.getTime() + 55 * 60 * 1000).toISOString();
    const w15from = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
    const w15to   = new Date(now.getTime() + 25 * 60 * 1000).toISOString();

    console.log(`[cron/class-reminders] now=${now.toISOString()} 45min=[${w45from},${w45to}) 15min=[${w15from},${w15to})`);

    const [events45, events15] = await Promise.all([
      fetchEventsInWindow(w45from, w45to),
      fetchEventsInWindow(w15from, w15to),
    ]);

    console.log(`[cron/class-reminders] 45min:${events45.length} 15min:${events15.length}`);

    await Promise.all([
      notifyClassReminder('45분 전', events45),
      notifyClassReminder('15분 전', events15),
    ]);

    return NextResponse.json({
      notified: events45.length + events15.length,
      window45: events45.length,
      window15: events15.length,
    });
  } catch (error) {
    console.error('[cron/class-reminders] unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error', detail: String(error) }, { status: 500 });
  }
}

async function fetchEventsInWindow(from: string, to: string): Promise<ClassReminderEvent[]> {
  const { data: events, error } = await supabaseSFv2
    .from('scheduled_events')
    .select('id, category, starts_at')
    .in('category', ['coach_room', 'study_hall'])
    .gte('starts_at', from)
    .lt('starts_at', to)
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: true });

  if (error) throw new Error(error.message);
  if (!events?.length) return [];

  const eventIds = events.map((e) => e.id);

  const { data: participants } = await supabaseSFv2
    .from('scheduled_event_participants')
    .select('event_id, user_id')
    .in('event_id', eventIds);

  const userIds = [...new Set((participants ?? []).map((p) => p.user_id))];
  if (userIds.length === 0) {
    return events.map((ev) => ({
      id: ev.id,
      type: ev.category as 'coach_room' | 'study_hall',
      startsAt: ev.starts_at,
      students: [],
      coaches: [],
    }));
  }

  const { data: profiles } = await supabaseSFv2
    .from('profiles')
    .select('id, full_name, role')
    .in('id', userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const participantsByEvent = new Map<string, { students: string[]; coaches: string[] }>();
  for (const p of participants ?? []) {
    if (!participantsByEvent.has(p.event_id)) {
      participantsByEvent.set(p.event_id, { students: [], coaches: [] });
    }
    const profile = profileMap.get(p.user_id);
    if (!profile) continue;
    const entry = participantsByEvent.get(p.event_id)!;
    if (profile.role === 'student') entry.students.push(profile.full_name);
    else if (profile.role === 'teacher') entry.coaches.push(profile.full_name);
  }

  return events.map((ev) => {
    const parts = participantsByEvent.get(ev.id) ?? { students: [], coaches: [] };
    return {
      id: ev.id,
      type: ev.category as 'coach_room' | 'study_hall',
      startsAt: ev.starts_at,
      students: parts.students,
      coaches: parts.coaches,
    };
  });
}
