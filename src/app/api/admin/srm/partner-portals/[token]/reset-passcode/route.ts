import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const { error } = await supabaseAdmin
    .from('partner_portals')
    .update({ passcode_hash: null, passcode_attempts: 0, passcode_locked_until: null })
    .eq('token', token);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
