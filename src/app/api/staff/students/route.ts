import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api-response';
import { getStaffUser } from '@/lib/staff-request';
import { searchStudents } from '@/lib/work-item-students';

const MAX_QUERY = 50;

// GET /api/staff/students?q=이름 — tutoring 학생 검색
export async function GET(request: NextRequest) {
  if (!getStaffUser(request)) return unauthorized();

  const q = (request.nextUrl.searchParams.get('q') ?? '').trim();
  if (!q) return NextResponse.json({ data: { students: [] } });
  if (q.length > MAX_QUERY) return apiError('BAD_REQUEST', '검색어가 너무 깁니다.', 400);
  try {
    return NextResponse.json({ data: { students: await searchStudents(q) } });
  } catch (error) {
    console.error('[api/staff/students GET] error:', error);
    return apiError('UPSTREAM_ERROR', '학생 검색에 실패했습니다.', 502);
  }
}
