-- diagnostic_test_versions에 test_id 추가
-- 형식(v1/v2)마다 독립적인 버전 계보를 갖도록 함

ALTER TABLE diagnostic_test_versions
  ADD COLUMN IF NOT EXISTS test_id VARCHAR(100) NOT NULL DEFAULT 'diagnostic-test-1';

CREATE INDEX IF NOT EXISTS idx_test_versions_test_id ON diagnostic_test_versions(test_id);

-- 기존 버전은 v1 소속으로 유지 (DEFAULT 'diagnostic-test-1'으로 이미 설정됨)
