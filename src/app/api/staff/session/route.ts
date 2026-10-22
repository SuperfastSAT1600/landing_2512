import { NextRequest, NextResponse } from 'next/server';
import { unauthorized } from '@/lib/api-response';
import { getStaffUser } from '@/lib/staff-request';

// GET /api/staff/session — 현재 로그인한 직원 (페이지가 로그인 화면을 띄울지 판단)
export async function GET(request: NextRequest) {
  const user = getStaffUser(request);
  return user ? NextResponse.json({ data: { user } }) : unauthorized();
}
