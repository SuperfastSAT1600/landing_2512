CREATE TABLE srm_copy_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       TEXT NOT NULL,
  event_type     TEXT NOT NULL CHECK (event_type IN ('coach_room', 'study_hall')),
  event_date     DATE NOT NULL,
  event_time     TEXT NOT NULL,
  student_names  TEXT[] NOT NULL,
  message_preview TEXT,
  copied_by      TEXT NOT NULL,
  copied_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_srm_copy_logs_date ON srm_copy_logs(event_date, copied_at DESC);
