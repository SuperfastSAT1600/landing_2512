import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * GET /api/portal/[token]
 * Returns whether the student portal exists and if a passcode has been set.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const { data, error } = await supabaseAdmin
    .from('students')
    .select('id, name, portal_name, passcode_hash, passcode_locked_until')
    .eq('portal_token', token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isLocked =
    data.passcode_locked_until != null &&
    new Date(data.passcode_locked_until) > new Date();

  return NextResponse.json({
    exists: true,
    hasPasscode: data.passcode_hash != null,
    studentName: data.portal_name || data.name,
    isLocked,
    lockedUntil: isLocked ? data.passcode_locked_until : null,
  });
}
