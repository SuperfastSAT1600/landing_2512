import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { processCallRecording } from '@/lib/phone-call-process';

export const runtime = 'nodejs';
// 수동 재시도는 전사·요약을 인라인 수행하므로 여유를 둔다.
export const maxDuration = 300;

const err = (code: string, message: string, status: number) =>
  NextResponse.json({ error: { code, message } }, { status });

/**
 * GET /api/crm/students/[id]/phone-call/[callId]
 * 통화 세션 상태 폴링 (요약 생성 중/완료/실패).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; callId: string }> }
) {
  const { callId } = await params;
  if (!isAuthenticated(request)) return err('UNAUTHORIZED', '인증이 필요합니다.', 401);

  const { data: session } = await supabaseAdmin
    .from('call_sessions')
    .select('status, summary, error, timeline_entry_id')
    .eq('id', callId)
    .single();
  if (!session) return err('NOT_FOUND', '세션을 찾을 수 없습니다.', 404);

  return NextResponse.json({ data: session });
}

/**
 * POST /api/crm/students/[id]/phone-call/[callId]
 * 전사·요약 수동 재시도 (웹훅 실패 시 패널에서 호출).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; callId: string }> }
) {
  const { callId } = await params;
  if (!isAuthenticated(request)) return err('UNAUTHORIZED', '인증이 필요합니다.', 401);

  const { data: session } = await supabaseAdmin
    .from('call_sessions')
    .select('id, recording_id, timeline_entry_id')
    .eq('id', callId)
    .single();
  if (!session) return err('NOT_FOUND', '세션을 찾을 수 없습니다.', 404);
  if (session.timeline_entry_id) {
    return NextResponse.json({ data: { status: 'done' } });
  }
  if (!session.recording_id) {
    return err('NO_RECORDING', '아직 녹음이 준비되지 않았습니다.', 409);
  }

  await supabaseAdmin.from('call_sessions').update({ status: 'processing', error: null }).eq('id', callId);
  await processCallRecording(callId);

  const { data: updated } = await supabaseAdmin
    .from('call_sessions')
    .select('status, summary, error')
    .eq('id', callId)
    .single();
  return NextResponse.json({ data: updated });
}
