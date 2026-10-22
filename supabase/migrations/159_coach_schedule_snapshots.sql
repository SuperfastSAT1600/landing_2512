-- coach_schedule_snapshots: 08:00 스케줄 브리핑의 코치별 "예약 ÷ 잔여 수업권" 일별 스냅샷 (전일 대비 변동 계산용)
CREATE TABLE IF NOT EXISTS coach_schedule_snapshots (
  snapshot_date    DATE          NOT NULL,
  coach_key        TEXT          NOT NULL,
  coach_name       TEXT          NOT NULL,
  student_count    INTEGER       NOT NULL,
  scheduled_hours  NUMERIC(8, 2) NOT NULL,
  remaining_hours  NUMERIC(8, 2) NOT NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  PRIMARY KEY (snapshot_date, coach_key)
);

COMMENT ON TABLE coach_schedule_snapshots IS '스냅샷 날짜는 KST 기준. 같은 날 재발송하면 덮어쓴다.';

ALTER TABLE coach_schedule_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON coach_schedule_snapshots
  FOR ALL TO service_role USING (true) WITH CHECK (true);
