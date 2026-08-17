-- Migration 110: 재결제 세일즈 대상 관리 테이블
-- 선례: 107_winback_plays(winback_targets)
--
-- 재결제는 학생 생애주기 동안 반복되므로 students 컬럼을 덮어쓰지 않고
-- 별도 테이블에 주차별 파이프라인 상태를 저장한다.

CREATE TABLE renewal_targets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  week_start            DATE NOT NULL,
  stage                 TEXT NOT NULL DEFAULT '1'
                          CHECK (stage IN ('1','2','3','4')),
  stage_updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_payment_id  UUID REFERENCES payments(id) ON DELETE SET NULL,
  created_by            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, week_start)
);

CREATE INDEX idx_renewal_targets_stage   ON renewal_targets(stage);
CREATE INDEX idx_renewal_targets_week    ON renewal_targets(week_start DESC);
CREATE INDEX idx_renewal_targets_student ON renewal_targets(student_id);

ALTER TABLE renewal_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON renewal_targets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "anon_deny" ON renewal_targets
  FOR ALL TO anon USING (false);
