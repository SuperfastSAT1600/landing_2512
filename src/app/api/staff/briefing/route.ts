import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api-response';
import { isValidDateString } from '@/lib/kst-date';
import { getStaffUser } from '@/lib/staff-request';
import { listBriefingDates, loadBriefing } from '@/app/api/cron/schedule-input-status/briefing-store';

// GET /api/staff/briefing?date=YYYY-MM-DD — 저장된 일별 브리핑. date가 없으면 가장 최근 날짜.
export async function GET(request: NextRequest) {
  if (!getStaffUser(request)) return unauthorized();

  const requested = request.nextUrl.searchParams.get('date');
  if (requested !== null && !isValidDateString(requested)) {
    return apiError('BAD_REQUEST', 'date는 YYYY-MM-DD 형식이어야 합니다.', 400);
  }

  try {
    const availableDates = await listBriefingDates();
    const date = requested ?? availableDates[0];
    const payload = date ? await loadBriefing(date) : null;
    if (!date || !payload) return apiError('NOT_FOUND', '해당 날짜의 브리핑이 없습니다.', 404, { data: { availableDates } });
    return NextResponse.json({ data: { date, payload, availableDates } });
  } catch (error) {
    console.error('[api/staff/briefing] error:', error);
    return apiError('UPSTREAM_ERROR', '브리핑 조회에 실패했습니다.', 502);
  }
}
