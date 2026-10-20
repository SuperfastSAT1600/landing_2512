-- coach_prep_requests: 코치 준비 링크를 받은 코치의 수업 수락/거절 응답
-- CRM에서 코치별 개인 토큰 링크와 응답 마감 일시를 만들고, 코치가 코치 준비 페이지에서 응답한다.
-- 여러 코치가 수락해도 자동 확정하지 않고, 담당자가 selected_at으로 한 명을 선택한다.
-- (student_coach_assignments는 수락 시 다른 오퍼를 자동 종료하는 방식이라 별도 테이블로 둔다.)

CREATE TABLE IF NOT EXISTS coach_prep_requests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  coach_slug      TEXT        NOT NULL REFERENCES coaches(slug) ON DELETE RESTRICT,

  -- 코치 개인 링크 토큰 (앱에서 24바이트 랜덤 생성, base64url)
  token           TEXT        NOT NULL UNIQUE,
  deadline_at     TIMESTAMPTZ NOT NULL,

  status          TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'declined')),
  first_lesson_at TIMESTAMPTZ,
  decline_reason  TEXT,

  first_opened_at TIMESTAMPTZ,
  responded_at    TIMESTAMPTZ,
  selected_at     TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (student_id, coach_slug),
  CHECK (status <> 'accepted' OR first_lesson_at IS NOT NULL),
  CHECK (status = 'accepted' OR first_lesson_at IS NULL),
  CHECK (selected_at IS NULL OR status = 'accepted')
);

-- 학생당 선택된 코치는 1명만
CREATE UNIQUE INDEX IF NOT EXISTS uniq_coach_prep_selected_per_student
  ON coach_prep_requests (student_id)
  WHERE selected_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_coach_prep_requests_student
  ON coach_prep_requests (student_id, created_at DESC);

CREATE TRIGGER trg_coach_prep_requests_updated_at
  BEFORE UPDATE ON coach_prep_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE coach_prep_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON coach_prep_requests
  FOR ALL TO service_role USING (true) WITH CHECK (true);
