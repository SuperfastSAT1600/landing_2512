import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 30;
const SESSION_HOURS = 1;

/**
 * POST /api/portal/[token]/auth
 * action=set    — first-time passcode setup
 * action=verify — login with existing passcode
 * action=change — change passcode (requires currentPasscode + newPasscode)
 */
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

  const { data: student, error } = await supabaseAdmin
    .from('students')
    .select('id, passcode_hash, passcode_attempts, passcode_locked_until')
    .eq('portal_token', token)
    .single();

  if (error || !student) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // ── SET (최초 설정) ───────────────────────────────────────────────────────────
  if (action === 'set') {
    const { passcode } = body as { passcode: string };
    if (!/^\d{6}$/.test(passcode)) {
      return NextResponse.json({ error: '6자리 숫자를 입력해 주세요' }, { status: 400 });
    }
    if (student.passcode_hash) {
      return NextResponse.json({ error: '이미 비밀번호가 설정되어 있습니다' }, { status: 409 });
    }
    const hash = await bcrypt.hash(passcode, 12);
    await supabaseAdmin
      .from('students')
      .update({ passcode_hash: hash, passcode_attempts: 0 })
      .eq('id', student.id);
    return issueSession(token);
  }

  // ── VERIFY (로그인) ───────────────────────────────────────────────────────────
  if (action === 'verify') {
    const { passcode } = body as { passcode: string };
    if (!/^\d{6}$/.test(passcode)) {
      return NextResponse.json({ error: '6자리 숫자를 입력해 주세요' }, { status: 400 });
    }
    if (student.passcode_locked_until && new Date(student.passcode_locked_until) > new Date()) {
      return NextResponse.json({ error: '잠금 상태입니다. 잠시 후 다시 시도해 주세요', locked: true }, { status: 429 });
    }
    const match = await bcrypt.compare(passcode, student.passcode_hash ?? '');
    if (!match) {
      const attempts = (student.passcode_attempts ?? 0) + 1;
      const updates: Record<string, unknown> = { passcode_attempts: attempts };
      if (attempts >= MAX_ATTEMPTS) {
        updates.passcode_locked_until = new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString();
      }
      await supabaseAdmin.from('students').update(updates).eq('id', student.id);
      const remaining = MAX_ATTEMPTS - attempts;
      if (remaining <= 0) {
        return NextResponse.json({ error: `${LOCK_MINUTES}분 후 다시 시도해 주세요`, locked: true }, { status: 429 });
      }
      return NextResponse.json({ error: `비밀번호가 틀렸습니다. ${remaining}회 남음`, attemptsLeft: remaining }, { status: 401 });
    }
    await supabaseAdmin
      .from('students')
      .update({ passcode_attempts: 0, passcode_locked_until: null })
      .eq('id', student.id);
    return issueSession(token);
  }

  // ── CHANGE (비밀번호 변경) ────────────────────────────────────────────────────
  if (action === 'change') {
    const { currentPasscode, newPasscode } = body as { currentPasscode: string; newPasscode: string };
    if (!/^\d{6}$/.test(currentPasscode) || !/^\d{6}$/.test(newPasscode)) {
      return NextResponse.json({ error: '6자리 숫자를 입력해 주세요' }, { status: 400 });
    }
    if (!student.passcode_hash) {
      return NextResponse.json({ error: '설정된 비밀번호가 없습니다' }, { status: 409 });
    }
    if (student.passcode_locked_until && new Date(student.passcode_locked_until) > new Date()) {
      return NextResponse.json({ error: '잠금 상태입니다. 잠시 후 다시 시도해 주세요', locked: true }, { status: 429 });
    }
    const match = await bcrypt.compare(currentPasscode, student.passcode_hash);
    if (!match) {
      const attempts = (student.passcode_attempts ?? 0) + 1;
      const updates: Record<string, unknown> = { passcode_attempts: attempts };
      if (attempts >= MAX_ATTEMPTS) {
        updates.passcode_locked_until = new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString();
      }
      await supabaseAdmin.from('students').update(updates).eq('id', student.id);
      const remaining = MAX_ATTEMPTS - attempts;
      if (remaining <= 0) {
        return NextResponse.json({ error: `${LOCK_MINUTES}분 후 다시 시도해 주세요`, locked: true }, { status: 429 });
      }
      return NextResponse.json({ error: `현재 비밀번호가 틀렸습니다. ${remaining}회 남음`, attemptsLeft: remaining }, { status: 401 });
    }
    const newHash = await bcrypt.hash(newPasscode, 12);
    await supabaseAdmin
      .from('students')
      .update({ passcode_hash: newHash, passcode_attempts: 0, passcode_locked_until: null })
      .eq('id', student.id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

async function issueSession(portalToken: string): Promise<NextResponse> {
  const cookieStore = await cookies();
  cookieStore.set(`portal_session_${portalToken}`, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_HOURS * 3600,
    path: '/',
  });
  return NextResponse.json({ success: true });
}
