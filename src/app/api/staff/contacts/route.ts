import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, unauthorized } from '@/lib/api-response';
import { isValidDateString } from '@/lib/kst-date';
import { getStaffUser } from '@/lib/staff-request';
import { createContact, listContacts } from '@/lib/staff-contacts';

const MAX_STUDENT_IDS = 200;

// GET /api/staff/contacts?studentIds=a,b — 학생별 연락 이력(최신순)
export async function GET(request: NextRequest) {
  if (!getStaffUser(request)) return unauthorized();

  const ids = [...new Set((request.nextUrl.searchParams.get('studentIds') ?? '').split(',').map(s => s.trim()).filter(Boolean))];
  if (!ids.length || ids.length > MAX_STUDENT_IDS) {
    return apiError('BAD_REQUEST', `studentIds는 1~${MAX_STUDENT_IDS}개여야 합니다.`, 400);
  }
  try {
    return NextResponse.json({ data: { byStudent: await listContacts(ids) } });
  } catch (error) {
    console.error('[api/staff/contacts GET] error:', error);
    return apiError('UPSTREAM_ERROR', '연락 이력 조회에 실패했습니다.', 502);
  }
}

const createSchema = z.object({
  studentId: z.string().trim().min(1).max(100),
  studentName: z.string().trim().min(1).max(100),
  briefingDate: z.string().refine(isValidDateString),
  listKey: z.string().trim().max(50).nullish(),
  note: z.string().trim().max(1000).nullish(),
});

// POST /api/staff/contacts — 연락 기록. 직원·시각은 서버가 채운다.
export async function POST(request: NextRequest) {
  const staff = getStaffUser(request);
  if (!staff) return unauthorized();

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('BAD_REQUEST', '요청 내용이 올바르지 않습니다.', 400);

  try {
    const log = await createContact({
      studentId: parsed.data.studentId,
      studentName: parsed.data.studentName,
      staffId: staff.id,
      staffName: staff.name,
      briefingDate: parsed.data.briefingDate,
      listKey: parsed.data.listKey || null,
      note: parsed.data.note || null,
    });
    return NextResponse.json({ data: { log } }, { status: 201 });
  } catch (error) {
    console.error('[api/staff/contacts POST] error:', error);
    return apiError('UPSTREAM_ERROR', '연락 기록 저장에 실패했습니다.', 502);
  }
}
