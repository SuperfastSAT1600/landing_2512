-- 078_weekly_plans.sql
-- 주차별 계획(팀 공용). (segment, week_start)당 1행.
-- targets = 주간 목표 수치, actions = 실행 체크리스트. 실제치(actuals)는 저장하지 않고
-- /api/crm/weekly-plan 이 조회 시 stats에서 계산한다.
-- 사용자가 Supabase에서 직접 실행한다.

CREATE TABLE IF NOT EXISTS weekly_plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment     text NOT NULL CHECK (segment IN ('b2c', 'b2b')),
  week_start  date NOT NULL,                          -- WEEK_DEFINITIONS[].start 와 정확히 일치
  targets     jsonb NOT NULL DEFAULT '[]'::jsonb,     -- [{key,label,target_value}]
  actions     jsonb NOT NULL DEFAULT '[]'::jsonb,     -- [{id,text,done,done_at,owner}]
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (segment, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_plans_segment_week ON weekly_plans(segment, week_start DESC);

ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON weekly_plans
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_deny" ON weekly_plans
  FOR ALL TO anon USING (false);
