-- "오늘 할 일" 액션 완료 체크 영구 저장 (localStorage 대체, 팀 공유)
-- 완료 판정은 애플리케이션에서 KST 당일 기준으로 한다 (isActionDoneToday).
ALTER TABLE students ADD COLUMN IF NOT EXISTS daily_action_done_at TIMESTAMPTZ;

COMMENT ON COLUMN students.daily_action_done_at IS '오늘 할 일 액션 완료 체크 시각 (KST 당일 기준 판정)';
