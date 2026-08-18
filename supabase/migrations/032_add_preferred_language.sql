-- REQ: 수업 희망 언어 필드 추가 (한국어 / 영어 / 상관없음)
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS preferred_language TEXT
    CHECK (preferred_language IN ('korean', 'english', 'any'))
    DEFAULT NULL;
