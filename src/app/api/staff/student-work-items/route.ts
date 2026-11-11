import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api-response';
import { getStaffUser } from '@/lib/staff-request';
import { listStudentWorkItems } from '@/lib/student-work-items';

const MAX_STUDENT_IDS = 300;

// GET /api/staff/student-work-items?studentIds=a,b — 학생별로 지정된 운영 업무(최신순)
export async function GET(request: NextRequest) {
  if (!getStaffUser(request)) return unauthorized();

  const ids = [...new Set((request.nextUrl.searchParams.get('studentIds') ?? '').split(',').map(s => s.trim()).filter(Boolean))];
  if (!ids.length || ids.length > MAX_STUDENT_IDS) {
    return apiError('BAD_REQUEST', `studentIds는 1~${MAX_STUDENT_IDS}개여야 합니다.`, 400);
  }
  try {
    return NextResponse.json({ data: { byStudent: await listStudentWorkItems(ids) } });
  } catch (error) {
    console.error('[api/staff/student-work-items] error:', error);
    return apiError('UPSTREAM_ERROR', '운영 업무 조회에 실패했습니다.', 502);
  }
}
