-- Migration 067: growth_experiments 테이블
-- 전략/실행/회고 — 가설→실행→측정→결과(성공/실패)→회고 사이클을 기록하는 성장 실험 로그.
-- 지표는 기존 /api/crm/stats(유입경로별 컨택성공률·전환율·평균첫응답시간)에서 자동 측정하거나 수동 입력.

CREATE TABLE growth_experiments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  hypothesis          TEXT,                 -- 가설
  execution_plan      TEXT,                 -- 실행 내용 (무엇을 바꾸는지)
  segment_source      TEXT,                 -- 유입경로(traffic_source 값). NULL = 전체
  metric_key          TEXT NOT NULL,        -- contact_rate | conversion_rate | avg_first_response_seconds | custom
  custom_metric_label TEXT,                 -- metric_key='custom'일 때 지표명
  baseline_from       DATE,
  baseline_to         DATE,
  baseline_value      NUMERIC,              -- 기준선 값 (자동/수동)
  test_from           DATE,
  test_to             DATE,
  result_value        NUMERIC,              -- 결과 값 (자동/수동)
  target_value        NUMERIC,              -- 목표값 (선택)
  status              TEXT NOT NULL DEFAULT 'planned'
                        CHECK (status IN ('planned', 'running', 'done')),
  verdict             TEXT CHECK (verdict IN ('success', 'fail', 'inconclusive')),
  retrospective       TEXT,                 -- 회고
  created_by          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_growth_experiments_status_created
  ON growth_experiments(status, created_at DESC);

-- RLS
ALTER TABLE growth_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON growth_experiments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "anon_deny" ON growth_experiments
  FOR ALL TO anon USING (false);
