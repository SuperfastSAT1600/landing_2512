import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const { data, error } = await supabaseAdmin
    .from('partner_portals')
    .select('id, name, passcode_hash, passcode_locked_until')
    .eq('token', token)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const isLocked =
    data.passcode_locked_until != null &&
    new Date(data.passcode_locked_until) > new Date();

  return NextResponse.json({
    exists: true,
    partnerName: data.name as string,
    hasPasscode: data.passcode_hash != null,
    isLocked,
    lockedUntil: isLocked ? data.passcode_locked_until : null,
  });
}
