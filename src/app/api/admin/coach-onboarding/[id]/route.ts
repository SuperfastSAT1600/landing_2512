import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/coach-onboarding/[id] — full submission detail
export async function GET(request: NextRequest, { params }: Params) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from('coach_onboarding_submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

// DELETE /api/admin/coach-onboarding/[id] — delete submission and reset invite
export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // fetch invite_id before deleting
  const { data: submission } = await supabaseAdmin
    .from('coach_onboarding_submissions')
    .select('invite_id')
    .eq('id', id)
    .single();

  const { error } = await supabaseAdmin
    .from('coach_onboarding_submissions')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }

  // reset invite so coach can re-submit
  if (submission?.invite_id) {
    await supabaseAdmin
      .from('coach_onboarding_invites')
      .update({ used_at: null })
      .eq('id', submission.invite_id);
  }

  return NextResponse.json({ data: { ok: true } });
}

// PATCH /api/admin/coach-onboarding/[id] — update status
export async function PATCH(request: NextRequest, { params }: Params) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  let body: { status: 'reviewed' | 'approved' | 'rejected'; reviewed_by?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const allowed = ['reviewed', 'approved', 'rejected'];
  if (!allowed.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('coach_onboarding_submissions')
    .update({
      status: body.status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: body.reviewed_by ?? null,
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  return NextResponse.json({ data: { ok: true } });
}
