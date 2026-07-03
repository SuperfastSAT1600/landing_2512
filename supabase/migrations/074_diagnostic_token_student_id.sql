-- Migration 074: diagnostic_access_tokens에 student_id 추가 (ARGOSS Phase 1, REQ-003a)
-- CRM에서 특정 리드에게 진단 링크를 발급할 때 학생을 지정 →
-- 제출 시 결정적(deterministic) 자동 연결: students.diagnostic_result_id(비어있을 때만)
-- + diagnostic_test_results.student_id + lead_events('diagnostic_submitted') 기록.
--
-- 기존 토큰은 백필하지 않고 NULL로 둔다:
-- 대부분 이미 사용/만료됐고 결과는 수동 연결이 끝난 상태. email/phone 휴리스틱 백필은
-- 모호한 매칭(동명이인) 리스크 때문에 배제. NULL 토큰 제출은 기존 수동 연결 플로우 유지.
ALTER TABLE diagnostic_access_tokens
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES students(id) ON DELETE SET NULL;

COMMENT ON COLUMN diagnostic_access_tokens.student_id
  IS 'CRM 발급 시 지정된 리드. 제출 시 자동 연결에 사용. NULL이면 수동 연결(기존 플로우)';

-- 역방향 조회용 ("이 학생에게 발급된 진단 링크") — NULL 행(기존 토큰)은 인덱스 제외
CREATE INDEX IF NOT EXISTS idx_access_tokens_student
  ON diagnostic_access_tokens(student_id) WHERE student_id IS NOT NULL;
