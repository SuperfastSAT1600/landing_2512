import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { listPlaudAccounts } from '@/lib/plaud-client';

/**
 * GET /api/crm/plaud/accounts
 * 설정된(seed env 주입된) Plaud 직원 계정 목록(key+label)을 반환한다(관리자 인증 필요).
 * 상담메모 피커의 1단계(직원 선택)에서 사용한다.
 */
export async function GET(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ data: await listPlaudAccounts() });
}
