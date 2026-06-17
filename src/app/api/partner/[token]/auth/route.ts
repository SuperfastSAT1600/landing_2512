import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 30;
const SESSION_HOURS = 8;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.action !== 'string') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { action } = body as { action: string };

  const { data: portal, error } = await supabaseAdmin
    .from('partner_portals')
    .select('id, passcode_hash, passcode_attempts, passcode_locked_until')
    .eq('token', token)
    .single();

  if (error || !portal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (action === 'set') {
    const { passcode } = body as { passcode: string };
    if (!/^\d{6}$/.test(passcode)) {
      return NextResponse.json({ error: '6자리 숫자를 입력해 주세요' }, { status: 400 });
    }
    if (portal.passcode_hash) {
      return NextResponse.json({ error: '이미 비밀번호가 설정되어 있습니다' }, { status: 409 });
    }
    const hash = await bcrypt.hash(passcode, 12);
    await supabaseAdmin
      .from('partner_portals')
      .update({ passcode_hash: hash, passcode_attempts: 0, passcode_locked_until: null })
      .eq('id', portal.id);
    return issueSession(token);
  }

  if (action === 'verify') {
    const { passcode } = body as { passcode: string };
    if (!/^\d{6}$/.test(passcode)) {
      return NextResponse.json({ error: '6자리 숫자를 입력해 주세요' }, { status: 400 });
    }
    const adminPasscode = process.env.PARTNER_ADMIN_PASSCODE;
    if (adminPasscode && passcode === adminPasscode) {
      return issueSession(token);
    }
    if (!portal.passcode_hash) {
      return NextResponse.json({ error: '비밀번호가 설정되지 않았습니다' }, { status: 409 });
    }
    if (portal.passcode_locked_until && new Date(portal.passcode_locked_until) > new Date()) {
      return NextResponse.json({ error: '잠금 상태입니다. 잠시 후 다시 시도해 주세요', locked: true }, { status: 429 });
    }
    const match = await bcrypt.compare(passcode, portal.passcode_hash ?? '');
    if (!match) {
      const attempts = (portal.passcode_attempts ?? 0) + 1;
      const updates: Record<string, unknown> = { passcode_attempts: attempts };
      if (attempts >= MAX_ATTEMPTS) {
        updates.passcode_locked_until = new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString();
      }
      await supabaseAdmin.from('partner_portals').update(updates).eq('id', portal.id);
      const remaining = MAX_ATTEMPTS - attempts;
      if (remaining <= 0) {
        return NextResponse.json({ error: `${LOCK_MINUTES}분 후 다시 시도해 주세요`, locked: true }, { status: 429 });
      }
      return NextResponse.json({ error: `비밀번호가 틀렸습니다. ${remaining}회 남음`, attemptsLeft: remaining }, { status: 401 });
    }
    await supabaseAdmin
      .from('partner_portals')
      .update({ passcode_attempts: 0, passcode_locked_until: null })
      .eq('id', portal.id);
    return issueSession(token);
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

async function issueSession(partnerToken: string): Promise<NextResponse> {
  const cookieStore = await cookies();
  cookieStore.set(`partner_session_${partnerToken}`, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_HOURS * 3600,
    path: '/',
  });
  return NextResponse.json({ success: true });
}
