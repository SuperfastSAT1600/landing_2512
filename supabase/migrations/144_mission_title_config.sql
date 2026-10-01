-- mission_config에 텍스트 값 저장을 위한 value_text 컬럼 추가
ALTER TABLE mission_config ADD COLUMN IF NOT EXISTS value_text TEXT;

-- 미션 이름 기본값 삽입 (기존에 없으면)
INSERT INTO mission_config (key, value, value_text)
VALUES ('mission_title', 0, '10월 SAT 미션')
ON CONFLICT (key) DO UPDATE SET value_text = COALESCE(mission_config.value_text, EXCLUDED.value_text);
