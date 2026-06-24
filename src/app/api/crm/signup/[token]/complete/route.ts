import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isBridgeAuthenticated } from '@/lib/signup-bridge';

/**
 * POST /api/crm/signup/[token]/complete
 * Called by the platform after a tutoring student finishes signing up. Stamps
 * students.signup_done_at (closing the "결제완료·가입대기" kanban column) and
 * thereby consumes the token. Idempotent. Gated by SIGNUP_BRIDGE_SECRET.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!isBridgeAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Optional body: the platform user id to link back to this student.
  let platformUserId: string | null = null;
  try {
    const body = await request.json();
    if (body && typeof body.platformUserId === 'string') platformUserId = body.platformUserId;
  } catch {
    // No/invalid body — completion still proceeds (platform_user_id stays null).
  }

  const { data: student, error } = await supabaseAdmin
    .from('students')
    .select('id, signup_done_at')
    .eq('signup_token', token)
    .maybeSingle();

  if (error) {
    console.error('[signup complete]', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  if (!student) {
    return NextResponse.json({ status: 'invalid' }, { status: 404 });
  }
  if (student.signup_done_at) {
    // Already consumed — idempotent success.
    return NextResponse.json({ status: 'already_done' });
  }

  const { error: updateError } = await supabaseAdmin
    .from('students')
    .update({
      signup_done_at: new Date().toISOString(),
      ...(platformUserId ? { platform_user_id: platformUserId } : {}),
    })
    .eq('id', student.id);

  if (updateError) {
    console.error('[signup complete]', updateError);
    return NextResponse.json({ error: 'Failed to complete signup' }, { status: 500 });
  }

  return NextResponse.json({ status: 'done' });
}
