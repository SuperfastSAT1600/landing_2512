import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import {
  createRoom,
  createMeetingToken,
  generatePublicToken,
  computeExpiresAt,
} from '@/lib/phone-call';

export const runtime = 'nodejs';

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

function appOrigin(request: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_ORIGIN;
  if (env) return env.replace(/\/$/, '');
  return new URL(request.url).origin;
}

/**
 * POST /api/crm/students/[id]/phone-call
 * Daily 방·토큰을 생성하고 call_sessions 세션을 만든다.
 * 세일즈 담당자는 repRoomUrl로 입장(녹음 자동 시작), 고객에겐 customerLink를 복사해 전달.
 * Body: { repName?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isAuthenticated(request)) return err('UNAUTHORIZED', '인증이 필요합니다.', 401);

  let repName = '세일즈 담당자';
  try {
    const body = await request.json();
    if (typeof body?.repName === 'string' && body.repName.trim()) repName = body.repName.trim();
  } catch {
    /* 빈 바디 허용 */
  }

  const { data: student, error: studentErr } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('id', id)
    .single();
  if (studentErr || !student) return err('STUDENT_NOT_FOUND', '학생을 찾을 수 없습니다.', 404);

  // 고객 토큰은 고객이 실제 입장할 때 GET /api/call/[token]에서 on-demand 발급한다.
  let room, repToken;
  try {
    room = await createRoom();
    repToken = await createMeetingToken({ roomName: room.name, isOwner: true, userName: repName });
  } catch (e) {
    console.error('[phone-call create] Daily error:', e);
    return err('DAILY_ERROR', '통화방 생성에 실패했습니다.', 502);
  }

  const publicToken = generatePublicToken();
  const { data: session, error: insErr } = await supabaseAdmin
    .from('call_sessions')
    .insert({
      student_id: id,
      public_token: publicToken,
      room_name: room.name,
      room_url: room.url,
      daily_room_id: room.id,
      status: 'created',
      expires_at: computeExpiresAt(Date.now()),
    })
    .select('id')
    .single();

  if (insErr || !session) {
    console.error('[phone-call create] insert failed:', insErr);
    return err('DB_ERROR', '세션 저장에 실패했습니다.', 500);
  }

  return NextResponse.json(
    {
      data: {
        callId: session.id,
        repRoomUrl: `${room.url}?t=${repToken}`,
        customerLink: `${appOrigin(request)}/call/${publicToken}`,
        publicToken,
      },
    },
    { status: 201 }
  );
}
