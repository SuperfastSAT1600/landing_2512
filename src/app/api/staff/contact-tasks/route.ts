import { NextRequest, NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api-response';
import { buildContactTasks } from '@/lib/contact-tasks';
import { getStaffUser } from '@/lib/staff-request';
import { buildBriefingPayload } from '@/app/api/cron/schedule-input-status/briefing-payload';
import { computeScheduleBriefing } from '@/app/api/cron/schedule-input-status/compute';

// 일일 브리핑 cron 과 같은 계산을 요청마다 다시 한다
export const maxDuration = 60;

// GET /api/staff/contact-tasks — 지금 시각 기준 알바생 연락 업무(tutoring 데이터로 매번 계산)
export async function GET(request: NextRequest) {
  if (!getStaffUser(request)) return unauthorized();
  try {
    const now = new Date();
    const { briefing, coachRatios } = await computeScheduleBriefing(now);
    const payload = buildBriefingPayload(briefing, coachRatios, now);
    return NextResponse.json({ data: { generatedAt: payload.generatedAt, groups: buildContactTasks(payload) } });
  } catch (error) {
    console.error('[api/staff/contact-tasks] error:', error);
    return apiError('UPSTREAM_ERROR', '연락 업무 조회에 실패했습니다.', 502);
  }
}
