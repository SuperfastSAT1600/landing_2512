-- Migration 004에서 생성된 글로벌 unique index 제거
-- 기존 idx_one_current_version은 test_id에 관계없이 is_current=true 행이 하나만 허용됨
-- → 형식별(v1/v2)로 각각 current 버전을 가질 수 없음

DROP INDEX IF EXISTS idx_one_current_version;

-- 형식(test_id)별로 하나의 current 버전만 허용하는 unique index 생성
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_current_version_per_format
  ON diagnostic_test_versions(test_id, is_current)
  WHERE is_current = true;
