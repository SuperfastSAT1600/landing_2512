-- 학생 인입 정보 필드 추가
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS inquiry_date   DATE,
  ADD COLUMN IF NOT EXISTS lead_source    TEXT,
  ADD COLUMN IF NOT EXISTS contact_type   TEXT;

COMMENT ON COLUMN students.inquiry_date  IS '문의가 들어온 날짜';
COMMENT ON COLUMN students.lead_source   IS '인입 루트: kakao_channel | instagram | referral | naver_blog | other';
COMMENT ON COLUMN students.contact_type  IS '연락처 유형: phone | kakao | email';
