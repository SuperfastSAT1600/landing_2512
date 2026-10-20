import { findByToken } from '@/lib/coach-prep-requests-db';
import type { CoachRequestInfo } from '@/types/coach-prep';

/**
 * ?t=토큰으로 들어온 코치 본인의 요청 정보. 다른 학생의 토큰이거나 조회에 실패하면 null이라
 * 페이지는 토큰 없이 열린 것처럼 자료만 보여준다.  열람 기록은 서버 렌더가 아니라 브라우저에서 한다(링크 미리보기 봇 제외).
 */
export async function loadCoachRequestInfo(studentId: string, token: string | undefined): Promise<CoachRequestInfo | null> {
  if (!token) return null;
  try {
    const req = await findByToken(token);
    if (!req || req.student_id !== studentId) return null;
    return {
      token: req.token,
      coach_name: req.coach_name,
      deadline_at: req.deadline_at,
      status: req.status,
      first_lesson_at: req.first_lesson_at,
      second_lesson_at: req.second_lesson_at,
      option2_first_lesson_at: req.option2_first_lesson_at,
      option2_second_lesson_at: req.option2_second_lesson_at,
      decline_reason: req.decline_reason,
    };
  } catch (e) {
    console.error('[coach-prep] coach request lookup failed:', e);
    return null;
  }
}
