-- 기존 단일 lead_source 필드 제거
ALTER TABLE students DROP COLUMN IF EXISTS lead_source;

-- 새 6개 분류 필드 추가
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS inquiry_channel TEXT,
  ADD COLUMN IF NOT EXISTS traffic_source  TEXT,
  ADD COLUMN IF NOT EXISTS content_author  TEXT,
  ADD COLUMN IF NOT EXISTS lead_type       TEXT CHECK (lead_type IN ('B2C', 'B2B')),
  ADD COLUMN IF NOT EXISTS b2b_partner     TEXT,
  ADD COLUMN IF NOT EXISTS campaign_tags   TEXT[] DEFAULT '{}';

COMMENT ON COLUMN students.inquiry_channel IS '인입 채널: 카톡 | 네이버 상담시트 | 구글 상담시트 | 전화 | 상담 예약 | 진단테스트 신청 | 인스타그램 링크';
COMMENT ON COLUMN students.traffic_source  IS '유입 소스: 네이버 블로그 | 네이버 카페 | (구)랜딩페이지 | 튜터링 랜딩페이지 | 공식 블로그 | 인스타그램 오가닉 | 인스타그램 광고 | 브런치 | 책 | 소개/추천 | 레딧 | B2B 파트너';
COMMENT ON COLUMN students.content_author  IS '콘텐츠 작성자: 배병윤 | 이민재 | 김우영 | 장현아';
COMMENT ON COLUMN students.lead_type       IS 'B2C 또는 B2B';
COMMENT ON COLUMN students.b2b_partner     IS 'B2B인 경우 파트너사명';
COMMENT ON COLUMN students.campaign_tags   IS '기간성·세그먼트 태그 배열 (예: 기존DB 재활성화, 여름특강)';
