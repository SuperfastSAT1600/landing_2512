-- 유입소스(traffic_source) 이름 개편: 기존 저장값을 새 채널명으로 이관.
-- 네이버 스프레드시트 매핑표 기준. students.traffic_source 는 raw TEXT (enum/FK 없음).
-- 신규 옵션 4개(랜딩 상담 폼 카톡 / (신) 랜딩 즉시 카톡 상담 [T] / 네이버 블로그 메인 히어로 카톡 /
-- 고스트블로그 게시물 푸터 카톡)는 기존 데이터가 없어 UPDATE 대상 아님.
-- 유지: 인스타그램 광고 / 인스타그램 오가닉 / B2B 파트너 / 책 / 레딧 / 기존DB / 대표전화 / 네이버 카페.

UPDATE students SET traffic_source = '랜딩 상담 예약 폼 카톡 - SuperfastSAT!'
  WHERE traffic_source = '구글폼에서 즉시상담';

UPDATE students SET traffic_source = '(구) 랜딩 즉시 카톡 상담 - [LD] SuperfastSAT'
  WHERE traffic_source = '(구)랜딩페이지 즉시상담';

UPDATE students SET traffic_source = '(구) 랜딩 구글폼 상담 예약'
  WHERE traffic_source = '(구)랜딩페이지 상담예약';

UPDATE students SET traffic_source = '(신) 랜딩 구글폼 상담 예약'
  WHERE traffic_source = '(신)랜딩 페이지 상담예약';

UPDATE students SET traffic_source = '네이버 블로그 게시물'
  WHERE traffic_source = '네이버 검색 후 상담예약';

UPDATE students SET traffic_source = '브런치 카톡 - [BR]SuperfastSAT'
  WHERE traffic_source = '브런치';

UPDATE students SET traffic_source = '고스트블로그 메인페이지 카톡 - SuperfastSAT(@공식블로그)'
  WHERE traffic_source = '공식 블로그';

UPDATE students SET traffic_source = '소개'
  WHERE traffic_source = '소개/추천';

-- growth_experiments.segment_source 도 동일 값을 참조하므로 함께 이관.
UPDATE growth_experiments SET segment_source = '랜딩 상담 예약 폼 카톡 - SuperfastSAT!'
  WHERE segment_source = '구글폼에서 즉시상담';
UPDATE growth_experiments SET segment_source = '(구) 랜딩 즉시 카톡 상담 - [LD] SuperfastSAT'
  WHERE segment_source = '(구)랜딩페이지 즉시상담';
UPDATE growth_experiments SET segment_source = '(구) 랜딩 구글폼 상담 예약'
  WHERE segment_source = '(구)랜딩페이지 상담예약';
UPDATE growth_experiments SET segment_source = '(신) 랜딩 구글폼 상담 예약'
  WHERE segment_source = '(신)랜딩 페이지 상담예약';
UPDATE growth_experiments SET segment_source = '네이버 블로그 게시물'
  WHERE segment_source = '네이버 검색 후 상담예약';
UPDATE growth_experiments SET segment_source = '브런치 카톡 - [BR]SuperfastSAT'
  WHERE segment_source = '브런치';
UPDATE growth_experiments SET segment_source = '고스트블로그 메인페이지 카톡 - SuperfastSAT(@공식블로그)'
  WHERE segment_source = '공식 블로그';
UPDATE growth_experiments SET segment_source = '소개'
  WHERE segment_source = '소개/추천';

COMMENT ON COLUMN students.traffic_source IS '유입 소스(네이버 스프레드시트 매핑표 기준 채널명, TRAFFIC_SOURCE_OPTIONS 와 동기화)';
