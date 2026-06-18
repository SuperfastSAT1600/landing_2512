import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

export interface CopyLogEntry {
  id: string;
  event_id: string;
  event_type: 'coach_room' | 'study_hall';
  event_date: string;
  event_time: string;
  student_names: string[];
  message_preview: string | null;
  copied_by: string;
  copied_at: string;
}

interface PostBody {
  eventId: string;
  eventType: 'coach_room' | 'study_hall';
  eventDate: string;
  eventTime: string;
  studentNames: string[];
  messagePreview?: string;
  copiedBy: string;
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body: PostBody = await req.json();
    const { eventId, eventType, eventDate, eventTime, studentNames, messagePreview, copiedBy } = body;

    if (!eventId || !eventType || !eventDate || !eventTime || !copiedBy) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from('srm_copy_logs')
      .insert({
        event_id: eventId,
        event_type: eventType,
        event_date: eventDate,
        event_time: eventTime,
        student_names: studentNames,
        message_preview: messagePreview ?? null,
        copied_by: copiedBy,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: String(e) } },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const date = req.nextUrl.searchParams.get('date');
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'date param required (YYYY-MM-DD)' } },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from('srm_copy_logs')
      .select('*')
      .eq('event_date', date)
      .order('copied_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: data ?? [], meta: { requestId: crypto.randomUUID() } });
  } catch (e) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: String(e) } },
      { status: 500 },
    );
  }
}
