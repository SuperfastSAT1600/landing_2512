-- 심화 인사이트(메모+구루+웹) 하루 1회 서버 캐시.
-- insight-brief/deep 라우트가 무겁고 느려서(웹 검색 포함) 세션·유저 무관하게 1일 mode당 1회만 생성하고 재사용한다.
CREATE TABLE IF NOT EXISTS crm_insight_cache (
  date_kst      DATE NOT NULL,                       -- KST 기준 생성일
  mode          TEXT NOT NULL CHECK (mode IN ('diagnosis','weekly')),
  payload       JSONB NOT NULL,                       -- { areas: InsightBriefArea[] }
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (date_kst, mode)
);

COMMENT ON TABLE crm_insight_cache IS '선제 진단 심화 인사이트 일별 캐시 (insight-brief/deep)';

-- 서버(service_role)에서만 접근한다. RLS 활성화 + 정책 없음 = anon/authenticated 차단, service_role 우회.
ALTER TABLE crm_insight_cache ENABLE ROW LEVEL SECURITY;
