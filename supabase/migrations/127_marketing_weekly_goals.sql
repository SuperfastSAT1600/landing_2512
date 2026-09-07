-- Migration 127: 마케팅 주차별 리드 목표(총합) — 마케팅 > 목표 화면 + 월요일 슬랙 리포트용
--
-- 배경: /admin/marketing 의 주간 리드 목표가 소스코드 상수(WEEKLY_TARGET = 35)였다.
--       매주 월요일에 "그 주차 전체 리드 목표" 하나를 설정·수정하고, 월요일 04:00 KST
--       슬랙 리포트가 직전 완료 주차의 목표 대비 실적을 발송한다.
--       유입 소스별 목표는 두지 않는다 — 소스 구성은 목표가 아니라 자동 집계 현황이며
--       Business 한국비즈니스(computeCrmStats segment='all')와 같은 리드 정의를 쓴다.
-- 주의: 행이 없으면 "목표 미설정", target_count = 0 은 "의도한 0개 목표"로 서로 다른 상태다.
--       그래서 CHECK 는 >= 0 이고 초기 시드 데이터를 넣지 않는다(빈 값으로 시작).
--       실적(actuals)은 저장하지 않고 조회 시 students.inquiry_date 에서 계산한다.
--       week_start 는 항상 해당 주 월요일(ISO 주 시작)이며 API 경계에서 검증한다.
--       개발 중에는 소스별 스키마(118) → '소개' 제외(119) → 총합 전환(120) 순서로 적용했고,
--       이 파일이 그 최종 상태다. 다른 환경에는 이 파일만 실행하면 된다.
-- 선례: 114_business_monthly_targets.sql (목표 upsert + RLS 패턴), 093_weekly_plans.sql (주차 키)
-- 사용자가 Supabase에서 직접 실행한다.

CREATE TABLE marketing_weekly_goals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start    DATE NOT NULL UNIQUE,   -- 해당 주 월요일 (예: 2026-09-07)
  target_count  INTEGER NOT NULL CHECK (target_count >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_marketing_weekly_goals_week ON marketing_weekly_goals(week_start DESC);

ALTER TABLE marketing_weekly_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON marketing_weekly_goals
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_deny" ON marketing_weekly_goals
  FOR ALL TO anon USING (false);

COMMENT ON TABLE marketing_weekly_goals IS
  '마케팅 주차별 리드 인입 목표(총합). 행 없음 = 목표 미설정, target_count 0 = 의도한 0개 목표.';
COMMENT ON COLUMN marketing_weekly_goals.week_start IS
  '해당 주 월요일 (ISO 주 시작, KST 기준). src/lib/marketing-week.ts mondayOf 와 일치해야 한다.';
