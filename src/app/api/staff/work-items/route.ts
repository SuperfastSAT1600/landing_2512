import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiError, unauthorized } from '@/lib/api-response';
import { getStaffUser } from '@/lib/staff-request';
import { clearWorkItemStudent, findStudent, listWorkItemStudents, setWorkItemStudent } from '@/lib/work-item-students';
import { listCompletions } from '@/lib/work-item-completions';
import { fetchWorkItems } from '@/lib/work-log';

// GET /api/staff/work-items — 운영 업무 채널의 할 일(최신순)과 연결된 학생, 완료 시각
export async function GET(request: NextRequest) {
  if (!getStaffUser(request)) return unauthorized();
  try {
    const [items, students, completions] = await Promise.all([fetchWorkItems(), listWorkItemStudents(), listCompletions()]);
    return NextResponse.json({ data: { items: items.map(i => ({
      ...i,
      student: students[i.messageTs] ?? null,
      doneAt: i.done ? completions[i.messageTs] ?? null : null,
    })) } });
  } catch (error) {
    console.error('[api/staff/work-items GET] error:', error);
    return apiError('UPSTREAM_ERROR', '업무 목록 조회에 실패했습니다.', 502);
  }
}

const putSchema = z.object({
  messageTs: z.string().regex(/^\d+\.\d+$/),
  studentId: z.string().trim().min(1).max(100).nullable(),
});

// PUT /api/staff/work-items — 할 일의 학생 지정(studentId: null 이면 해제). 이름은 서버가 tutoring DB 에서 채운다.
export async function PUT(request: NextRequest) {
  const staff = getStaffUser(request);
  if (!staff) return unauthorized();

  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('BAD_REQUEST', '요청 내용이 올바르지 않습니다.', 400);

  const { messageTs, studentId } = parsed.data;
  try {
    if (studentId === null) {
      await clearWorkItemStudent(messageTs);
      return NextResponse.json({ data: { student: null } });
    }
    const student = await findStudent(studentId);
    if (!student) return apiError('BAD_REQUEST', '학생을 찾을 수 없습니다.', 400);
    await setWorkItemStudent(messageTs, student, staff.name);
    return NextResponse.json({ data: { student: { id: student.id, name: student.name } } });
  } catch (error) {
    console.error('[api/staff/work-items PUT] error:', error);
    return apiError('UPSTREAM_ERROR', '학생 저장에 실패했습니다.', 502);
  }
}
