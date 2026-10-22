import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError } from '@/lib/api-response';
import { clearLoginFailures, isLoginBlocked, recordLoginFailure } from '@/lib/login-rate-limit';
import { authenticateStaff } from '@/lib/staff-auth';
import { createStaffSessionToken, STAFF_SESSION_COOKIE, STAFF_SESSION_TTL_SECONDS } from '@/lib/staff-session';

const bodySchema = z.object({ email: z.string().trim().min(1).max(200), password: z.string().min(1).max(200) });

// POST /api/staff/login — SFv2 staff·admin 계정 로그인. 실패 사유(없는 계정·틀린 비밀번호·권한 없음)는 같은 응답.
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('BAD_REQUEST', '이메일과 비밀번호를 입력해 주세요.', 400);

  const { email, password } = parsed.data;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const limitKey = `${ip}|${email.toLowerCase()}`;
  if (isLoginBlocked(limitKey)) return apiError('RATE_LIMITED', '로그인 시도가 너무 많습니다. 15분 뒤에 다시 시도해 주세요.', 429);

  try {
    const user = await authenticateStaff(email, password);
    if (!user) {
      recordLoginFailure(limitKey);
      return apiError('UNAUTHORIZED', '이메일 또는 비밀번호가 올바르지 않습니다.', 401);
    }
    clearLoginFailures(limitKey);

    const response = NextResponse.json({ data: { user } });
    response.cookies.set(STAFF_SESSION_COOKIE, createStaffSessionToken(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: STAFF_SESSION_TTL_SECONDS,
    });
    return response;
  } catch (error) {
    console.error('[api/staff/login] error:', error);
    return apiError('INTERNAL_ERROR', '로그인 처리 중 오류가 발생했습니다.', 500);
  }
}
