import type { NextRequest } from 'next/server';
import { STAFF_SESSION_COOKIE, verifyStaffSessionToken, type StaffUser } from '@/lib/staff-session';

/** 요청 쿠키의 직원 세션. 없거나 만료·변조면 null. */
export function getStaffUser(request: NextRequest): StaffUser | null {
  return verifyStaffSessionToken(request.cookies.get(STAFF_SESSION_COOKIE)?.value);
}
