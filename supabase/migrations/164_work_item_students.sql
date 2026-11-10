-- work_item_students: 운영 업무 채널 글(할 일)에 연결한 학생. 한 글에 학생 한 명 (학생은 SFv2 profile id)
CREATE TABLE IF NOT EXISTS work_item_students (
  channel      TEXT        NOT NULL,
  message_ts   TEXT        NOT NULL,
  student_id   TEXT        NOT NULL,
  student_name TEXT        NOT NULL,
  assigned_by  TEXT        NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (channel, message_ts)
);

CREATE INDEX IF NOT EXISTS idx_work_item_students_student ON work_item_students (student_id);

ALTER TABLE work_item_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON work_item_students
  FOR ALL TO service_role USING (true) WITH CHECK (true);
