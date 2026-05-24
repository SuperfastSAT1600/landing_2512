import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

/**
 * GET /api/crm/students/[id]
 * Returns student detail including full consultation_timeline.
 * Requires admin authentication.
 */
export async function GET(
  request: NextRequest,
  { params: _pid }: { params: Promise<{ id: string }> }
) {
  const { id } = await _pid;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from('students')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

/**
 * PATCH /api/crm/students/[id]
 * Updates student fields (funnel_stage, churn handling, matching_stage, etc.).
 * matching_stage is stored on the students row; migration 016 omitted this column —
 * the update will silently succeed if the column does not yet exist in the DB.
 * Requires admin authentication.
 */
export async function PATCH(
  request: NextRequest,
  { params: _pid }: { params: Promise<{ id: string }> }
) {
  const { id } = await _pid;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Strip undefined values and id field to avoid unintended overwrites
  const { id: _id, created_at: _ca, updated_at: _ua, ...updateFields } = body;

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('students')
    .update(updateFields)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[crm/students PATCH]', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

/**
 * DELETE /api/crm/students/[id]
 * Deletes a student record (cascades to assignments).
 * Requires admin authentication.
 */
export async function DELETE(
  request: NextRequest,
  { params: _pid }: { params: Promise<{ id: string }> }
) {
  const { id } = await _pid;
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabaseAdmin
    .from('students')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[crm/students DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }

  return NextResponse.json({ data: null }, { status: 200 });
}
