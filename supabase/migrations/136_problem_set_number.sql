-- REQ-001: 문제 세트 전역 set_number 추가 및 제약 변경
-- diagnostic_test_versions (버전 테이블) = 문제 세트 개념으로 전환
-- test_id와 무관한 전역 순번(set_number)으로 정렬/식별

-- 1. set_number 컬럼 추가 (nullable로 먼저 추가 후 데이터 채움)
ALTER TABLE diagnostic_test_versions
  ADD COLUMN IF NOT EXISTS set_number INT;

-- 2. 기존 행에 set_number 할당: test_id 기준
UPDATE diagnostic_test_versions
  SET set_number = 1
  WHERE test_id = 'diagnostic-test-1';

UPDATE diagnostic_test_versions
  SET set_number = 2
  WHERE test_id = 'diagnostic-test-2';

-- 3. 기존 유니크 제약 제거 (test_id + is_current 복합 인덱스)
DROP INDEX IF EXISTS idx_one_current_version_per_format;

-- 4. set_number NOT NULL 및 UNIQUE 제약 추가
ALTER TABLE diagnostic_test_versions
  ALTER COLUMN set_number SET NOT NULL;

ALTER TABLE diagnostic_test_versions
  DROP CONSTRAINT IF EXISTS diagnostic_test_versions_set_number_key;

ALTER TABLE diagnostic_test_versions
  ADD CONSTRAINT diagnostic_test_versions_set_number_key UNIQUE (set_number);

-- 5. is_current를 전역 단일값으로 정리: set_number=1만 true
UPDATE diagnostic_test_versions SET is_current = false;
UPDATE diagnostic_test_versions SET is_current = true WHERE set_number = 1;

-- 6. test_id 컬럼은 nullable로 유지 (하위 호환 — 신규 생성 시 NULL)
ALTER TABLE diagnostic_test_versions
  ALTER COLUMN test_id DROP NOT NULL;
