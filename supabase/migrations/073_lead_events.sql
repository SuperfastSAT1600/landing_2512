-- Migration 073: lead_events — 리드 행동 이벤트 수집 (ARGOSS Phase 1)
-- 원천 데이터 층. funnel_stage(수동 세일즈 단계)와 별개 층위이며 자동 전이 없음.
-- append-only: 서버 라우트(supabaseAdmin)에서만 insert, update/delete 없음.

CREATE TABLE IF NOT EXISTS lead_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN (
    'portal_viewed',        -- 학부모 포털 데이터 열람 (GET /api/portal/[token]/data)
    'srm_report_viewed',    -- 포털 내 학습 리포트 열람 (GET /api/portal/[token]/srm-report)
    'signup_link_clicked',  -- 플랫폼 가입 링크 클릭 = 가입 페이지 로드 (GET /api/crm/signup/[token])
    'diagnostic_submitted'  -- 진단테스트 제출 + 리드 자동 연결 성공 (POST /api/diagnosis/submit)
  )),
  metadata    JSONB NOT NULL DEFAULT '{}',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE lead_events IS '리드 행동 이벤트 (ARGOSS). 세그먼트 판정의 원천 데이터. append-only';
COMMENT ON COLUMN lead_events.event_type IS 'Phase 2에서 유형 추가 시 CHECK 제약을 DROP/ADD로 확장';
COMMENT ON COLUMN lead_events.metadata IS '예: {"matched_by":"token"} — 진단 자동연결 방식 등 이벤트별 부가정보';

-- 인덱스
-- 학생별 최근 활동 조회 (dedup 체크, Phase 2 세그먼트 판정의 주 쿼리 경로)
CREATE INDEX idx_lead_events_student ON lead_events(student_id, occurred_at DESC);
-- 유형별 집계/통계
CREATE INDEX idx_lead_events_type ON lead_events(event_type, occurred_at DESC);

-- RLS (students와 동일 패턴: service_role 전체 허용, anon 차단)
ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON lead_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "anon_deny" ON lead_events
  FOR ALL TO anon USING (false);

-- 동승 정리: funnel_stage '9'(결제완료)는 '8'로 흡수·폐기됨 (현행 FunnelStage 타입에 '9' 없음).
-- 016이 만든 '9' 전제 partial 인덱스는 어떤 행도 커버하지 않는 죽은 인덱스라 제거.
DROP INDEX IF EXISTS idx_students_payment;
