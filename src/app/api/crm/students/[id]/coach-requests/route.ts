import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/server-auth';
import { apiError, unauthorized } from '@/lib/api-response';
import { CreateRequestsSchema } from '@/lib/coach-prep-request';
import { findActiveCoaches, listRequests, studentExists, upsertRequests } from '@/lib/coach-prep-requests-db';

type Ctx = { params: Promise<{ id: string }> };

// 코치 준비 응답 요청 만들기: 코치별 개인 토큰 + 응답 마감 일시
export async function POST(request: NextRequest, { params }: Ctx) {
  if (!isAuthenticated(request)) return unauthorized();
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', '잘못된 요청입니다.', 400);
  }
  const parsed = CreateRequestsSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
  const { coach_slugs, deadline_at } = parsed.data;

  try {
    if (!(await studentExists(id))) return apiError('STUDENT_NOT_FOUND', '학생을 찾을 수 없습니다.', 404);

    const coaches = await findActiveCoaches(coach_slugs);
    const missing = coach_slugs.filter((s) => !coaches.some((c) => c.slug === s));
    if (missing.length > 0) return apiError('COACH_NOT_FOUND', `찾을 수 없거나 비활성인 코치입니다: ${missing.join(', ')}`, 400);

    const requests = await upsertRequests(id, coaches, deadline_at);
    return NextResponse.json({ data: { requests }, meta: { requestId: crypto.randomUUID() } }, { status: 201 });
  } catch (e) {
    console.error('[coach-requests POST]', e);
    return apiError('DB_ERROR', '저장 중 오류가 발생했습니다.', 500);
  }
}

export async function GET(request: NextRequest, { params }: Ctx) {
  if (!isAuthenticated(request)) return unauthorized();
  const { id } = await params;
  try {
    const requests = await listRequests(id);
    return NextResponse.json({ data: { requests }, meta: { requestId: crypto.randomUUID() } });
  } catch (e) {
    console.error('[coach-requests GET]', e);
    return apiError('DB_ERROR', '조회 중 오류가 발생했습니다.', 500);
  }
}
