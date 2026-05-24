-- CRM: student_coach_assignments 테이블 생성
-- 코치 오퍼 발송 및 응답 관리

CREATE TYPE assignment_status_enum AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'considering',
  'closed'     -- 다른 코치 수락으로 자동 마감
);

CREATE TABLE student_coach_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  coach_slug       TEXT NOT NULL REFERENCES coaches(slug) ON DELETE RESTRICT,
  status           assignment_status_enum NOT NULL DEFAULT 'pending',
  is_confirmed     BOOLEAN NOT NULL DEFAULT FALSE,

  -- 코치 오퍼 뷰 접근 토큰 (UUID 대신 추측 불가능한 토큰)
  offer_token      TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64'),

  -- 응답 관련
  response_deadline TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  coach_timezone    TEXT,
  reject_reason     TEXT,
  closed_reason     TEXT,
  closed_at         TIMESTAMPTZ,

  assigned_by      TEXT NOT NULL DEFAULT 'manager',
  assigned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at     TIMESTAMPTZ
);

-- 한 학생에 confirmed 코치는 1명만 허용 (race condition 방지)
CREATE UNIQUE INDEX uniq_confirmed_per_student
  ON student_coach_assignments(student_id)
  WHERE is_confirmed = TRUE;

-- 인덱스
CREATE INDEX idx_assignments_student ON student_coach_assignments(student_id, status);
CREATE INDEX idx_assignments_coach ON student_coach_assignments(coach_slug, status);
CREATE INDEX idx_assignments_deadline ON student_coach_assignments(response_deadline)
  WHERE status = 'pending';
CREATE INDEX idx_assignments_token ON student_coach_assignments(offer_token);

-- RLS
ALTER TABLE student_coach_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON student_coach_assignments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 코치 오퍼 뷰: anon이 offer_token으로 SELECT만 허용
CREATE POLICY "anon_select_by_token" ON student_coach_assignments
  FOR SELECT TO anon
  USING (offer_token = current_setting('request.jwt.claims', true)::json->>'offer_token');

-- RPC: 코치 오퍼 수락 원자적 처리 (race condition 방지)
CREATE OR REPLACE FUNCTION accept_coach_offer(p_offer_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment_id UUID;
  v_student_id    UUID;
  v_already_confirmed BOOLEAN;
BEGIN
  -- 대상 오퍼 조회 + 행 잠금
  SELECT id, student_id
    INTO v_assignment_id, v_student_id
    FROM student_coach_assignments
    WHERE offer_token = p_offer_token
      AND status = 'pending'
      AND response_deadline > NOW()
    FOR UPDATE;

  IF v_assignment_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'offer_not_found_or_expired');
  END IF;

  -- 이미 확정된 코치 있는지 확인
  SELECT EXISTS (
    SELECT 1 FROM student_coach_assignments
    WHERE student_id = v_student_id AND is_confirmed = TRUE
  ) INTO v_already_confirmed;

  IF v_already_confirmed THEN
    -- 이 오퍼는 closed 처리
    UPDATE student_coach_assignments
      SET status = 'closed',
          closed_at = NOW(),
          closed_reason = 'student_already_matched',
          responded_at = NOW()
      WHERE id = v_assignment_id;
    RETURN jsonb_build_object('ok', false, 'reason', 'student_already_matched');
  END IF;

  -- 수락 처리
  UPDATE student_coach_assignments
    SET status = 'accepted',
        is_confirmed = TRUE,
        responded_at = NOW()
    WHERE id = v_assignment_id;

  -- 나머지 오퍼 자동 마감
  UPDATE student_coach_assignments
    SET status = 'closed',
        closed_at = NOW(),
        closed_reason = 'other_accepted'
    WHERE student_id = v_student_id
      AND id <> v_assignment_id
      AND status = 'pending';

  RETURN jsonb_build_object('ok', true, 'assignment_id', v_assignment_id);
END;
$$;

-- RPC: 코치 오퍼 거절
CREATE OR REPLACE FUNCTION reject_coach_offer(p_offer_token TEXT, p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_assignment_id UUID;
BEGIN
  UPDATE student_coach_assignments
    SET status = 'rejected',
        reject_reason = p_reason,
        responded_at = NOW()
    WHERE offer_token = p_offer_token
      AND status = 'pending'
    RETURNING id INTO v_assignment_id;

  IF v_assignment_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'offer_not_found');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- RPC: 고민 상태
CREATE OR REPLACE FUNCTION consider_coach_offer(p_offer_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_assignment_id UUID;
BEGIN
  UPDATE student_coach_assignments
    SET status = 'considering',
        responded_at = NOW()
    WHERE offer_token = p_offer_token
      AND status = 'pending'
    RETURNING id INTO v_assignment_id;

  IF v_assignment_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'offer_not_found');
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;
