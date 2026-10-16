import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { apiError, unauthorized } from '@/lib/api-response';
import { fetchCoachRosterInput } from '@/lib/coach-roster-fetch';
import { buildCoachRoster } from '@/lib/coach-roster';

// GET /api/crm/coach-roster — 코치 현황: 직접 정한 코치 순서대로 코치별 재원·온보딩·휴원 학생 명단.
export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorized();
  try {
    return NextResponse.json({ data: buildCoachRoster(await fetchCoachRosterInput()) });
  } catch (e) {
    return apiError('UPSTREAM_ERROR', e instanceof Error ? e.message : '코치 현황 조회 실패', 502);
  }
}
