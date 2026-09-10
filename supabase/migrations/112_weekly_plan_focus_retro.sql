-- Migration 112: 주차 계획에 집중 전략·회고·보완 기록 추가
-- 선례: 093_weekly_plans.sql (targets/actions jsonb 패턴)
--
-- 배경: 주차 계획·이행 탭이 목표 수치 + 할 일 체크리스트만 담아서, 팀이 실제로 하는 일
--       (이름 붙은 세일즈 전략을 특정 리드에게 적용)과 끊겨 있었다. 주 단위 운영 루프
--       (계획 → 실행 → 결과 → 회고 → 다음 주 계획)를 한 화면에서 굴리기 위한 저장소 확장.
-- 정책: 새 테이블 없이 weekly_plans 확장 — 키가 동일(segment, week_start)하고 항상 함께
--       읽고 쓰며, 세그먼트당 연 ~52행 규모다. "어떤 리드에게 했는지"는 저장하지 않는다
--       (students.strategy_history.applied_at 을 주 범위로 집계 → 이중 입력 방지).
-- 사용자가 Supabase에서 직접 실행한다.

ALTER TABLE weekly_plans
  ADD COLUMN IF NOT EXISTS focus_strategies jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS retrospective    jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS execution_notes  jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN weekly_plans.focus_strategies IS
  '이번 주 집중 전략 [{id,strategy_id,strategy_name,type,goal,memo,carried_from_week}] — 전략명은 스냅샷(전략 삭제·개명 후에도 과거 주차 보존)';
COMMENT ON COLUMN weekly_plans.retrospective IS
  '주간 회고 {went_well,went_wrong,next_actions:[{id,text,carried_to}],updated_at}';
COMMENT ON COLUMN weekly_plans.execution_notes IS
  '자동 집계 밖 활동 기록 [{id,text,created_at}] — 인스타 DM 대량발송 등';
