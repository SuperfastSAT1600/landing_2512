import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

/**
 * GET /api/crm/assignments
 * Returns all assignments for a given student.
 * Query: ?student_id=uuid
 * Requires admin authentication.
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('student_id');

  let query = supabaseAdmin
    .from('student_coach_assignments')
    .select('*')
    .order('assigned_at', { ascending: false });

  if (studentId) {
    query = query.eq('student_id', studentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[crm/assignments GET]', error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }

  return NextResponse.json({ data });
}

/**
 * POST /api/crm/assignments
 * Sends coach offer(s) to one or more coaches for a student.
 * Creates one assignment record per coach_slug.
 * Updates student's matching_stage to 'offer_sent'.
 * Body: { student_id: string, coach_slugs: string[], deadline_hours?: number }
 * Requires admin authentication.
 */
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { student_id: string; coach_slugs: string[]; deadline_hours?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { student_id, coach_slugs, deadline_hours } = body;

  if (!student_id || !Array.isArray(coach_slugs) || coach_slugs.length === 0) {
    return NextResponse.json(
      { error: 'student_id and at least one coach_slug are required' },
      { status: 400 }
    );
  }

  // Build assignment rows — offer_token and response_deadline use DB defaults
  // unless deadline_hours is provided
  const now = new Date();
  const rows = coach_slugs.map((slug) => {
    const row: Record<string, unknown> = {
      student_id,
      coach_slug: slug,
      status: 'pending',
      assigned_by: 'manager',
    };
    if (deadline_hours != null && typeof deadline_hours === 'number') {
      const deadline = new Date(now.getTime() + deadline_hours * 60 * 60 * 1000);
      row.response_deadline = deadline.toISOString();
    }
    return row;
  });

  const { data: assignments, error: insertError } = await supabaseAdmin
    .from('student_coach_assignments')
    .insert(rows)
    .select();

  if (insertError) {
    console.error('[crm/assignments POST]', insertError);
    return NextResponse.json({ error: 'Failed to create assignments' }, { status: 500 });
  }

  // Update student matching_stage to 'offer_sent'
  // NOTE: matching_stage column was omitted from migration 016.
  // This update will fail silently if the column does not exist in the DB yet.
  const { error: stageError } = await supabaseAdmin
    .from('students')
    .update({ matching_stage: 'offer_sent' })
    .eq('id', student_id);

  if (stageError) {
    // Non-fatal: assignments already created. Log and continue.
    console.warn('[crm/assignments POST] matching_stage update failed:', stageError.message);
  }

  return NextResponse.json({ data: assignments }, { status: 201 });
}
