import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createMeetingToken, isExpired } from '@/lib/phone-call';

export const runtime = 'nodejs';

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

/**
 * GET /api/call/[token]  (공개 — 인증 없음)
 * 고객 링크 토큰으로 통화방 정보와 고객용 Daily 토큰을 발급한다.
 * 만료/종료된 세션은 거부한다.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const { data: session } = await supabaseAdmin
    .from('call_sessions')
    .select('id, room_name, room_url, status, expires_at')
    .eq('public_token', token)
    .single();

  if (!session) return err('NOT_FOUND', '유효하지 않은 통화 링크입니다.', 404);
  if (session.status === 'purged' || isExpired(session.expires_at, Date.now())) {
    return err('EXPIRED', '이 통화 링크는 만료되었습니다.', 410);
  }
  if (['ended', 'processing', 'done', 'failed'].includes(session.status)) {
    return err('ENDED', '이미 종료된 통화입니다.', 410);
  }

  let customerToken: string;
  try {
    customerToken = await createMeetingToken({
      roomName: session.room_name,
      isOwner: false,
      userName: '고객',
    });
  } catch (e) {
    console.error('[call token] Daily error:', e);
    return err('DAILY_ERROR', '통화 연결에 실패했습니다.', 502);
  }

  // 고객이 입장 시도 → active로 표시 (created일 때만)
  if (session.status === 'created') {
    await supabaseAdmin.from('call_sessions').update({ status: 'active' }).eq('id', session.id);
  }

  return NextResponse.json({ data: { roomUrl: session.room_url, customerToken } });
}
