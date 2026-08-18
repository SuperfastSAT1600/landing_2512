import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';
import type { WeeklySlot } from '@/types/crm';

/**
 * POST /api/mypage/[studentId]/schedule
 * Saves parent-submitted schedule (OT datetime, weekly slots, timezone).
 * Also advances matching_stage to 'schedule_done'.
 * Authentication: x-passcode header (bcrypt compared to stored hash).
 * Body: { parent_timezone: string, ot_datetime: string (ISO UTC), weekly_schedule: WeeklySlot[] }
 */
export async function POST(
  request: NextRequest,
  { params: _pstudentId }: { params: Promise<{ studentId: string }> }
) {
  const { studentId } = await _pstudentId;
  // Auth check
  const passcode = request.headers.get('x-passcode');
  if (!passcode) {
    return NextResponse.json({ error: 'x-passcode header required' }, { status: 401 });
  }

  type PasscodeRow = {
    id: string;
    passcode_hash: string | null;
    passcode_locked_until: string | null;
    passcode_attempts: number;
  };

  const { data: studentRaw, error: fetchError } = await supabaseAdmin
    .from('students')
    .select('id, passcode_hash, passcode_locked_until, passcode_attempts')
    .eq('id', studentId)
    .single();

  if (fetchError || !studentRaw) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  const student = studentRaw as unknown as PasscodeRow;

  if (!student.passcode_hash) {
    return NextResponse.json({ error: 'Passcode not configured' }, { status: 403 });
  }

  if (
    student.passcode_locked_until &&
    new Date(student.passcode_locked_until) > new Date()
  ) {
    return NextResponse.json({ error: 'Passcode locked. Try again later.' }, { status: 423 });
  }

  const match = await bcrypt.compare(passcode, student.passcode_hash);
  if (!match) {
    const newAttempts = (student.passcode_attempts ?? 0) + 1;
    const lockUntil =
      newAttempts >= 5
        ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
        : null;

    await supabaseAdmin
      .from('students')
      .update({
        passcode_attempts: newAttempts,
        ...(lockUntil ? { passcode_locked_until: lockUntil } : {}),
      })
      .eq('id', studentId);

    return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 });
  }

  // Parse body
  let body: { parent_timezone: string; ot_datetime: string; weekly_schedule: WeeklySlot[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { parent_timezone, ot_datetime, weekly_schedule } = body;

  if (!parent_timezone || !ot_datetime || !Array.isArray(weekly_schedule)) {
    return NextResponse.json(
      { error: 'parent_timezone, ot_datetime, and weekly_schedule are required' },
      { status: 400 }
    );
  }

  // Validate ot_datetime is a valid ISO timestamp
  if (isNaN(Date.parse(ot_datetime))) {
    return NextResponse.json({ error: 'ot_datetime must be a valid ISO timestamp' }, { status: 400 });
  }

  const { data, error: updateError } = await supabaseAdmin
    .from('students')
    .update({
      parent_timezone,
      ot_datetime,
      weekly_schedule,
      matching_stage: 'schedule_done',
    })
    .eq('id', studentId)
    .select('id, parent_timezone, ot_datetime, weekly_schedule, matching_stage')
    .single();

  if (updateError) {
    console.error('[mypage/schedule POST]', updateError);
    return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 });
  }

  return NextResponse.json({ data });
}
