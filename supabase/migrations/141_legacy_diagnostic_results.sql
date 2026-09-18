-- 2025년 구 진단테스트 시스템(MJ-sat-diagnostic-test) 응시 기록 보존용 테이블.
--
-- 현행 diagnostic_test_results 와 스키마가 전혀 다르다(토큰·문항ID 체계가 없고,
-- 수집 필드가 이름·학년·답안·확신도뿐). 섞으면 양쪽 집계가 모두 깨지므로 별도 테이블로 둔다.
--
-- 원본: Firebase RTDB sfs-diagnostictest-default-rtdb → /diagnostic_results
--       + 저장소에 커밋되어 있던 database.json (Firebase 이전 시기 53건)
-- 매칭 키가 이름뿐이라(전화·이메일 미수집) student_id 는 nullable 이고,
-- 어떻게 이어졌는지를 match_method/match_confidence 로 남겨 통계에서 신뢰도를 구분한다.

CREATE TABLE IF NOT EXISTS legacy_diagnostic_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('firebase', 'database_json')),
  firebase_key TEXT,
  original_id TEXT,
  code TEXT,
  student_name TEXT NOT NULL,
  student_grade TEXT,
  score INTEGER,
  rw_score INTEGER,
  math_score INTEGER,
  answers JSONB,
  confidence JSONB,
  taken_at TIMESTAMPTZ,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  internal_reason TEXT,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  match_method TEXT CHECK (match_method IN ('auto_exact', 'auto_grade_window', 'manual')),
  match_confidence TEXT CHECK (match_confidence IN ('high', 'medium', 'low')),
  match_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 재실행 멱등성: 같은 응시가 두 번 적재되지 않도록 소스별 자연키에 부분 유니크.
CREATE UNIQUE INDEX IF NOT EXISTS idx_legacy_diag_firebase_key
  ON legacy_diagnostic_results(firebase_key) WHERE firebase_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_legacy_diag_original_id
  ON legacy_diagnostic_results(original_id) WHERE original_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_legacy_diag_student
  ON legacy_diagnostic_results(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_legacy_diag_taken_at
  ON legacy_diagnostic_results(taken_at);

-- 정책을 만들지 않는다 = service_role(서버) 전용. 브라우저에서 학생 실명이 새지 않게 한다.
ALTER TABLE legacy_diagnostic_results ENABLE ROW LEVEL SECURITY;
