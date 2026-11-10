import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api-response';
import { buildContactTasks } from '@/lib/contact-tasks';
import { getStaffUser } from '@/lib/staff-request';
import { listBriefingDates, loadBriefing } from '@/app/api/cron/schedule-input-status/briefing-store';

// GET /api/staff/contact-tasks — 가장 최근 일일 브리핑에서 뽑은 알바생 연락 업무
export async function GET(request: NextRequest) {
  if (!getStaffUser(request)) return unauthorized();
  try {
    const [date] = await listBriefingDates(1);
    const payload = date ? await loadBriefing(date) : null;
    if (!date || !payload) return apiError('NOT_FOUND', '저장된 브리핑이 없습니다.', 404);
    return NextResponse.json({ data: { date, generatedAt: payload.generatedAt, groups: buildContactTasks(payload) } });
  } catch (error) {
    console.error('[api/staff/contact-tasks] error:', error);
    return apiError('UPSTREAM_ERROR', '연락 업무 조회에 실패했습니다.', 502);
  }
}
