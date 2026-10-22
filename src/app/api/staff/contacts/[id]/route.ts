import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api-response';
import { kstDate } from '@/lib/kst-date';
import { getStaffUser } from '@/lib/staff-request';
import { deleteContact, getContact } from '@/lib/staff-contacts';

// DELETE /api/staff/contacts/:id — 잘못 누른 기록 취소. 본인이 오늘(KST) 남긴 기록만.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = getStaffUser(request);
  if (!staff) return unauthorized();

  const { id } = await params;
  try {
    const log = await getContact(id);
    if (!log) return apiError('NOT_FOUND', '연락 기록을 찾을 수 없습니다.', 404);
    if (log.staffId !== staff.id || kstDate(new Date(log.contactedAt)) !== kstDate(new Date())) {
      return apiError('FORBIDDEN', '본인이 오늘 남긴 기록만 삭제할 수 있습니다.', 403);
    }
    await deleteContact(id);
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    console.error('[api/staff/contacts DELETE] error:', error);
    return apiError('UPSTREAM_ERROR', '연락 기록 삭제에 실패했습니다.', 502);
  }
}
