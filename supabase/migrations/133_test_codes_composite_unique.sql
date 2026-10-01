-- code 단일 unique → (code, test_id) 복합 unique로 변경
-- 동일 코드를 여러 테스트에 재사용 가능하게
ALTER TABLE test_codes DROP CONSTRAINT IF EXISTS test_codes_code_key;
ALTER TABLE test_codes ADD CONSTRAINT test_codes_code_test_id_key UNIQUE (code, test_id);
