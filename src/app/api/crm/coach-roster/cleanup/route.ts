import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { apiError, unauthorized } from '@/lib/api-response';
import { fetchMatchingCleanupInput } from '@/lib/matching-cleanup-fetch';
import { buildMatchingCleanup } from '@/lib/matching-cleanup';

// GET /api/crm/coach-roster/cleanup — SRM에서 Deactivate해야 할 진행 중 매칭(추천 · 확인 필요).
export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorized();
  try {
    return NextResponse.json({ data: buildMatchingCleanup(await fetchMatchingCleanupInput()) });
  } catch (e) {
    return apiError('UPSTREAM_ERROR', e instanceof Error ? e.message : '매칭 정리 목록 조회 실패', 502);
  }
}
