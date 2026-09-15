import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { notifyPortalPageView } from '@/lib/slack';

/**
 * GET /api/portal/[token]
 * Returns whether the student portal exists and if a passcode has been set.
 */
export async function GET(
  request: NextRequest,
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

  // 학부모 포털 열람 알림 (fire-and-forget, 어드민 preview 제외)
  const isAdminPreview = request.nextUrl.searchParams.get('preview') === 'admin';
  if (!isAdminPreview) {
    notifyPortalPageView({
      studentName: data.portal_name || data.name,
      studentId: data.id,
    }).catch((err) => console.error('[portal] Slack notify failed:', err));
  }

  return NextResponse.json({
    exists: true,
    hasPasscode: data.passcode_hash != null,
    studentName: data.portal_name || data.name,
    isLocked,
    lockedUntil: isLocked ? data.passcode_locked_until : null,
  });
}
