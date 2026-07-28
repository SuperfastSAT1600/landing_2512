import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export type SessionStatus =
  | 'on_time' | 'late' | 'late_present' | 'late_absent' | 'absent'
  | 'disconnected' | 'disconnected_end' | 'returned' | 'completed';

export interface SessionStatusLog {
  id: string;
  event_id: string;
  event_type: 'study_hall' | 'vocab';
  event_date: string;
  student_id: string | null;
  student_name: string;
  status: SessionStatus;
  logged_by: string;
  created_at: string;
}

interface PostBody {
  eventId: string;
  eventType: 'study_hall' | 'vocab';
  eventDate: string;
  studentId?: string;
  studentName: string;
  status: SessionStatus;
  loggedBy: string;
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const eventIds = req.nextUrl.searchParams.get('eventIds');
    const date = req.nextUrl.searchParams.get('date');

    if (!eventIds && !date) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'eventIds or date param required' } },
        { status: 400 },
      );
    }

    let query = supabaseAdmin
      .from('srm_session_status_logs')
      .select('*')
      .order('created_at', { ascending: true });

    if (eventIds) {
      query = query.in('event_id', eventIds.split(',').filter(Boolean));
    } else if (date) {
      query = query.eq('event_date', date);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });

    return NextResponse.json({ data: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: String(e) } }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body: PostBody = await req.json();
    const { eventId, eventType, eventDate, studentId, studentName, status, loggedBy } = body;

    if (!eventId || !eventType || !eventDate || !studentName || !status || !loggedBy) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from('srm_session_status_logs')
      .insert({
        event_id: eventId,
        event_type: eventType,
        event_date: eventDate,
        student_id: studentId ?? null,
        student_name: studentName,
        status,
        logged_by: loggedBy,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 });

    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: String(e) } }, { status: 500 });
  }
}
