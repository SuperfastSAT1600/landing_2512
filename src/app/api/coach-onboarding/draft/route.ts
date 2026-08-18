import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// PUT /api/coach-onboarding/draft
// Public (token-authenticated): save draft progress
export async function PUT(request: NextRequest) {
  let body: { token: string; data: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { token, data } = body;
  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 });
  }

  const { data: invite, error } = await supabaseAdmin
    .from('coach_onboarding_invites')
    .select('id, expires_at, used_at')
    .eq('token', token)
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (invite.used_at) {
    return NextResponse.json({ error: 'already_submitted' }, { status: 409 });
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }

  const { error: updateError } = await supabaseAdmin
    .from('coach_onboarding_invites')
    .update({ draft_data: data, draft_saved_at: new Date().toISOString() })
    .eq('id', invite.id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
  }

  return NextResponse.json({ data: { saved_at: new Date().toISOString() } });
}
