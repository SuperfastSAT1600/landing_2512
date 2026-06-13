import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export interface CommEntry {
  id: string;
  student_id: string | null;
  student_name: string | null;
  target: 'student' | 'parent' | 'coach';
  channel: 'kakao' | 'call' | 'sms' | 'email' | 'other';
  content: string;
  author: string | null;
  trigger_type: 'no_show' | 'late' | 'no_class' | 'no_study_hall' | 'manual';
  auto_count: number;
  reason: string | null;
  resolution: string | null;
  lifecycle_stage: string | null;
  created_at: string;
  event_id: string | null;
  coach_id: string | null;
}

export async function GET(req: NextRequest) {
  const studentId = req.nextUrl.searchParams.get('studentId');
  const coachId = req.nextUrl.searchParams.get('coachId');
  const date = req.nextUrl.searchParams.get('date');

  // Date-based query: all comms for a KST date (for OpsTaskList activity log)
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'invalid date format' }, { status: 400 });
    }
    const kstStart = new Date(`${date}T00:00:00+09:00`).toISOString();
    const kstEnd = new Date(`${date}T23:59:59.999+09:00`).toISOString();

    const { data, error } = await supabaseAdmin
      .from('srm_communications')
      .select('*')
      .gte('created_at', kstStart)
      .lte('created_at', kstEnd)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json((data ?? []) as CommEntry[]);
  }

  // Coach-based query
  if (coachId) {
    const { data, error } = await supabaseAdmin
      .from('srm_communications')
      .select('*')
      .eq('coach_id', coachId)
      .is('student_id', null)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json((data ?? []) as CommEntry[]);
  }

  if (!studentId) return NextResponse.json({ error: 'studentId, coachId, or date required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('srm_communications')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []) as CommEntry[]);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    studentId,
    studentName,
    target,
    channel,
    content,
    author,
    triggerType,
    autoCount,
    reason,
    resolution,
    lifecycleStage,
    eventId,
    coachId,
  } = body;

  if (!target || !channel || !content) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
  }

  if (!studentId && !coachId) {
    return NextResponse.json({ error: 'studentId or coachId required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('srm_communications')
    .insert({
      student_id: studentId ?? null,
      student_name: studentName ?? null,
      target,
      channel,
      content,
      author: author ?? null,
      trigger_type: triggerType ?? 'manual',
      auto_count: autoCount ?? 0,
      reason: reason ?? null,
      resolution: resolution ?? null,
      lifecycle_stage: lifecycleStage ?? null,
      event_id: eventId ?? null,
      coach_id: coachId ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
