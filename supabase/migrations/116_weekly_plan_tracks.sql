-- Migration 116: 주차 계획을 '트랙'(목표 하나 + 그 목표를 위한 실행 항목들) 단위로 재구성
-- 선례: 093_weekly_plans.sql (targets/actions jsonb), 112_weekly_plan_focus_retro.sql (focus/retro/notes jsonb)
--
-- 배경: 112로 만든 화면은 한 주 계획을 다섯 섹션(집중 전략 / 실행·결과 / 목표 vs 실적 / 할 일 / 보완 기록)에
--       쪼개서 입력하게 만들어서, 목표가 두 곳·실행이 세 곳에 흩어졌다. 실제 주차 계획 문서의 위계는
--       "세그먼트 → 목표를 가진 트랙 → 실행 항목 a·b·c" 한 갈래다. 그 위계를 그대로 저장한다.
-- 정책: 새 테이블 없이 weekly_plans 확장 — 키가 동일(segment, week_start)하고 항상 함께 읽고 쓴다.
--       "어떤 리드에게 했는지"는 여기 저장하지 않는다(students.strategy_history 주 범위 집계 — 112와 동일).
--
-- DEFAULT 를 일부러 두지 않는다:
--   NULL = 트랙 체제 이전 주차 → 읽을 때 focus_strategies + actions 에서 트랙을 파생해 보여준다
--   []   = 사용자가 트랙을 명시적으로 모두 비운 상태 → 파생하지 않는다
-- 이 구분이 없으면 "지운 트랙이 새로고침하면 되살아나는" 버그가 난다.
--
-- targets / actions / focus_strategies 컬럼은 드롭하지 않는다(파생 소스 + 과거 주차 보존).
-- 사용자가 Supabase에서 직접 실행한다. 112 를 먼저 실행할 것(ADD COLUMN IF NOT EXISTS 라 재실행 안전).

ALTER TABLE weekly_plans
  ADD COLUMN IF NOT EXISTS tracks jsonb;

COMMENT ON COLUMN weekly_plans.tracks IS
  '주간 실행 트랙 [{id,name,goal_text,metric,target_value,achieved,items:[{id,text,done,done_at,strategy_id,strategy_name,strategy_type}],carried_from_week}] — 전략명·타입은 스냅샷(전략 삭제·개명 후에도 과거 주차 보존). NULL은 트랙 체제 이전 주차(읽을 때 focus_strategies+actions에서 파생), []는 사용자가 비운 상태.';
