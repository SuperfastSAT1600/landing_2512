export type CoachPrepStatus = 'pending' | 'accepted' | 'declined';

/**
 * 코치가 제안한 수업 조합. 옵션 1 = 첫 수업 + 두 번째 수업(수락이면 필수), 옵션 2는 선택(둘 다 있거나 둘 다 없음).
 * 옵션 1의 첫 수업은 기존 `first_lesson_at` 컬럼을 그대로 쓴다.
 */
export interface LessonTimes {
  first_lesson_at: string | null;
  second_lesson_at: string | null;
  option2_first_lesson_at: string | null;
  option2_second_lesson_at: string | null;
}

export interface CoachPrepRequestRow extends LessonTimes {
  id: string;
  student_id: string;
  coach_slug: string;
  token: string;
  deadline_at: string;
  status: CoachPrepStatus;
  decline_reason: string | null;
  first_opened_at: string | null;
  responded_at: string | null;
  selected_at: string | null;
  created_at: string;
}

/** CRM 응답 현황용 — 코치 이름을 붙인 행. */
export interface CoachPrepRequestView extends CoachPrepRequestRow {
  coach_name: string;
}

/** 코치 준비 페이지에 전달하는, 이 코치 본인의 요청 정보 (토큰은 본인 링크의 것). */
export interface CoachRequestInfo extends LessonTimes {
  token: string;
  coach_name: string;
  deadline_at: string;
  status: CoachPrepStatus;
  decline_reason: string | null;
}
