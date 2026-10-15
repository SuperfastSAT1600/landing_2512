import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/server-auth';
import { apiError, unauthorized } from '@/lib/api-response';
import { fetchCoachRoomLedgerInput } from '@/lib/coach-room-fetch';
import { buildCoachRoomLedger } from '@/lib/coach-room-ledger';

// GET /api/crm/students/[id]/coach-room
// 연결된 SFv2 프로필의 코치룸 수업 내역 + 과목별 시간 장부(구매·완료·잔여·예약). SRM Payment 상세와 같은 계산.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthenticated(req)) return unauthorized();
  const { id } = await params;

  const { data: student, error } = await supabaseAdmin.from('students').select('sfv2_profile_id').eq('id', id).maybeSingle();
  if (error) return apiError('INTERNAL_ERROR', error.message, 500);
  const profileId = (student as { sfv2_profile_id?: string | null } | null)?.sfv2_profile_id;
  if (!profileId) return apiError('no_v2_profile', 'SRM 프로필이 연결되지 않았습니다.', 404);

  try {
    const input = await fetchCoachRoomLedgerInput(profileId);
    const subjects = buildCoachRoomLedger({ ...input, now: new Date().toISOString() });
    return NextResponse.json({ data: { subjects } });
  } catch (e) {
    return apiError('UPSTREAM_ERROR', e instanceof Error ? e.message : 'SFv2 조회 실패', 502);
  }
}
