-- 직원용 일일 브리핑 페이지: 일별 브리핑 저장본 + 학생별 연락 기록

-- schedule_briefing_snapshots: 08:00 스케줄 브리핑 내용을 KST 날짜별로 저장 (같은 날 재발송은 덮어씀)
CREATE TABLE IF NOT EXISTS schedule_briefing_snapshots (
  briefing_date  DATE        PRIMARY KEY,
  payload        JSONB       NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE schedule_briefing_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON schedule_briefing_snapshots
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- student_contact_logs: 직원이 학생에게 연락할 때마다 남기는 기록 (학생은 SFv2 profile id)
CREATE TABLE IF NOT EXISTS student_contact_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     TEXT        NOT NULL,
  student_name   TEXT        NOT NULL,
  contacted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  staff_id       TEXT        NOT NULL,
  staff_name     TEXT        NOT NULL,
  briefing_date  DATE        NOT NULL,
  list_key       TEXT,
  note           TEXT
);

CREATE INDEX IF NOT EXISTS idx_student_contact_logs_student
  ON student_contact_logs (student_id, contacted_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_contact_logs_date
  ON student_contact_logs (briefing_date);

ALTER TABLE student_contact_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON student_contact_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
