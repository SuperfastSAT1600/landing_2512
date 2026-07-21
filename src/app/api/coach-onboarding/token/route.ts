import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET /api/coach-onboarding/token?t=[token]
// Public: validate token and return invite info
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t');
  if (!token) {
    return NextResponse.json({ error: 'token required' }, { status: 400 });
  }

  const { data: invite, error } = await supabaseAdmin
    .from('coach_onboarding_invites')
    .select('id, token, coach_name, expires_at, used_at')
    .eq('token', token)
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (invite.used_at) {
    return NextResponse.json({ error: 'already_used' }, { status: 409 });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'expired' }, { status: 410 });
  }

  return NextResponse.json({ data: { id: invite.id, coach_name: invite.coach_name } });
}
