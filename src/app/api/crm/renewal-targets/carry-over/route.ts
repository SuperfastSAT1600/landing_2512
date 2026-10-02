import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { carryOverRenewalTargets } from '@/lib/renewal-carry-over';
import { apiError, unauthorized } from '@/lib/api-response';

/** 지난 주차의 미결 대상을 현재 주차로 이월한다. 멱등 — 보드 진입 시마다 불려도 안전하다. */
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) return unauthorized();

  const result = await carryOverRenewalTargets();

  if (!result.ok) {
    return apiError(result.code, result.message, 500);
  }

  return NextResponse.json({ data: result.data });
}
