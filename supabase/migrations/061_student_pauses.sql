-- Migration 061: student_pauses 테이블
-- SRM에서 입력한 휴원 기록. CRM과 SRM 양쪽에서 참조.

CREATE TABLE student_pauses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- CRM student ID (students 테이블 연결 학생)
  student_id      UUID REFERENCES students(id) ON DELETE CASCADE,
  -- sfv2 profile ID (CRM 미연결 학생 대비)
  sfv2_profile_id TEXT,
  pause_start     DATE NOT NULL DEFAULT CURRENT_DATE,
  pause_until     DATE,          -- NULL = 재개일 미정
  reason          TEXT,
  created_by      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at        TIMESTAMPTZ,   -- 조기 해제 시 기록 (NULL = 아직 진행 중)
  CONSTRAINT chk_has_identifier CHECK (student_id IS NOT NULL OR sfv2_profile_id IS NOT NULL)
);

CREATE INDEX idx_student_pauses_student    ON student_pauses(student_id) WHERE ended_at IS NULL;
CREATE INDEX idx_student_pauses_sfv2       ON student_pauses(sfv2_profile_id) WHERE ended_at IS NULL;

-- RLS
ALTER TABLE student_pauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON student_pauses
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "anon_deny" ON student_pauses
  FOR ALL TO anon USING (false);
