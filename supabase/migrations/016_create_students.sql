-- CRM: students 테이블 생성
-- school_type, desired_subjects, funnel_stage, previous_score_status, churn_type enum 포함

CREATE TYPE school_type_enum AS ENUM (
  'domestic_us',
  'korean_special',
  'international',
  'other'
);

CREATE TYPE desired_subjects_enum AS ENUM ('RW', 'Math', 'Both');

CREATE TYPE previous_score_status_enum AS ENUM (
  'scored',
  'never_taken',
  'dont_remember'
);

CREATE TYPE churn_type_enum AS ENUM ('potential', 'closed');

-- funnel_stage 값:
--   1  첫 메시지 발송
--   2  세일즈 콜 예약 확정 후 대기
--   3a 세일즈 콜 전 진단테스트 대기      (문자열 '3a')
--   3b 세일즈 콜 전 진단테스트 제출 완료 (문자열 '3b')
--   4  세일즈 콜 완료
--   5a 세일즈 콜 후 진단테스트 대기      (문자열 '5a')
--   5b 세일즈 콜 후 진단테스트 제출 완료 (문자열 '5b')
--   6  진단 Report 세일즈 콜 예약 확정 후 대기
--   7  진단 Report 세일즈 콜 완료
--   8  세일즈 진행 중
--   9  결제 완료
--   'churned' 이탈

CREATE TABLE students (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 매니저 입력 필드 (등록 시점)
  name                  TEXT NOT NULL,
  grade                 TEXT NOT NULL,
  school_type           school_type_enum NOT NULL,
  parent_phone          TEXT NOT NULL,
  previous_rw_score     INTEGER,
  previous_math_score   INTEGER,
  previous_score_status previous_score_status_enum NOT NULL DEFAULT 'never_taken',
  target_score          INTEGER,
  target_test_date      DATE NOT NULL,
  desired_subjects      desired_subjects_enum NOT NULL,

  -- 학부모 마이페이지 입력 필드
  passcode_hash         TEXT,
  passcode_attempts     INTEGER NOT NULL DEFAULT 0,
  passcode_locked_until TIMESTAMPTZ,
  parent_timezone       TEXT,
  ot_datetime           TIMESTAMPTZ,
  weekly_schedule       JSONB,           -- { day_of_week, hour, minute, timezone }[]

  -- 매니저 누적 운영 필드
  funnel_stage          TEXT NOT NULL DEFAULT '1',
  churn_tag             TEXT,
  churn_type            churn_type_enum,
  diagnostic_result_id  UUID REFERENCES diagnostic_test_results(id) ON DELETE SET NULL,
  consultation_timeline JSONB NOT NULL DEFAULT '[]'::JSONB,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 인덱스
CREATE INDEX idx_students_funnel_stage ON students(funnel_stage) WHERE churn_type IS NULL;
CREATE INDEX idx_students_churn ON students(churn_type, created_at DESC) WHERE churn_type IS NOT NULL;
CREATE INDEX idx_students_payment ON students(funnel_stage) WHERE funnel_stage = '9';
CREATE INDEX idx_students_created ON students(created_at DESC);

-- RLS
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- service_role(매니저 admin): 전체 접근
CREATE POLICY "service_role_all" ON students
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- anon(학부모 마이페이지): id 일치 + passcode 인증은 API 레이어에서 처리
-- 학부모는 API를 통해서만 접근하므로 anon RLS는 차단
CREATE POLICY "anon_deny" ON students
  FOR ALL TO anon USING (false);
