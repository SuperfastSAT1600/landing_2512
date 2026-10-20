export type CoachPrepStatus = 'pending' | 'accepted' | 'declined';

export interface CoachPrepRequestRow {
  id: string;
  student_id: string;
  coach_slug: string;
  token: string;
  deadline_at: string;
  status: CoachPrepStatus;
  first_lesson_at: string | null;
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
export interface CoachRequestInfo {
  token: string;
  coach_name: string;
  deadline_at: string;
  status: CoachPrepStatus;
  first_lesson_at: string | null;
  decline_reason: string | null;
}
