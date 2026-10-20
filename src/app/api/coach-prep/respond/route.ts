import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-response';
import { EMPTY_LESSON_TIMES, RespondSchema, isClosed, isSameResponse } from '@/lib/coach-prep-request';
import { findByToken, getStudentName, saveResponse } from '@/lib/coach-prep-requests-db';
import { notifyCoachResponseToSlack } from '@/lib/slack-coach-response';

// 코치 응답(수업 수락/어려움) — 코치별 토큰이 자격이다. 마감 전에는 수정할 수 있다.
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('INVALID_JSON', '잘못된 요청입니다.', 400);
  }
  const parsed = RespondSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION_ERROR', parsed.error.issues[0].message, 400);
  const { token, action, reason } = parsed.data;

  try {
    const req = await findByToken(token);
    if (!req) return apiError('INVALID_TOKEN', '유효하지 않은 링크입니다.', 404);
    if (isClosed(req.deadline_at)) return apiError('DEADLINE_PASSED', '응답이 마감되었습니다.', 409);

    const accepted = action === 'accept';
    const lessons = accepted
      ? {
          first_lesson_at: parsed.data.first_lesson_at!,
          second_lesson_at: parsed.data.second_lesson_at!,
          option2_first_lesson_at: parsed.data.option2_first_lesson_at ?? null,
          option2_second_lesson_at: parsed.data.option2_second_lesson_at ?? null,
        }
      : EMPTY_LESSON_TIMES;
    const declineReason = accepted ? null : reason?.trim() || null;
    const status = accepted ? 'accepted' : 'declined';
    const unchanged = isSameResponse(req, status, lessons, declineReason);

    const saved = await saveResponse(req.id, { status, ...lessons, decline_reason: declineReason });
    if (saved === 'closed') return apiError('DEADLINE_PASSED', '응답이 마감되었습니다.', 409);

    // 같은 내용을 다시 보낸 경우(재시도·더블클릭)는 채널에 중복 알림을 올리지 않는다
    if (!unchanged) {
      await notifyCoachResponseToSlack({
        studentName: await getStudentName(req.student_id),
        coachName: req.coach_name,
        action,
        lessons: accepted ? lessons : null,
        reason: declineReason,
        deadlineAt: req.deadline_at,
      });
    }

    return NextResponse.json({
      data: {
        status: saved.status,
        first_lesson_at: saved.first_lesson_at,
        second_lesson_at: saved.second_lesson_at,
        option2_first_lesson_at: saved.option2_first_lesson_at,
        option2_second_lesson_at: saved.option2_second_lesson_at,
        decline_reason: saved.decline_reason,
        responded_at: saved.responded_at,
      },
      meta: { requestId: crypto.randomUUID() },
    });
  } catch (e) {
    console.error('[coach-prep/respond]', e);
    return apiError('DB_ERROR', '저장 중 오류가 발생했습니다.', 500);
  }
}
