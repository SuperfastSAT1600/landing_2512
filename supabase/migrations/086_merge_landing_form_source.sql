-- 유입소스 통합: '랜딩 상담 폼 카톡 - SuperfastSAT!'(예약 없음) → '랜딩 상담 예약 폼 카톡 - SuperfastSAT!'
-- 드롭다운 옵션을 예약 폼 카톡 하나로 통합. 현재 students 해당 값 0건이라 사실상 no-op이나 방어적으로 실행.

UPDATE students SET traffic_source = '랜딩 상담 예약 폼 카톡 - SuperfastSAT!'
  WHERE traffic_source = '랜딩 상담 폼 카톡 - SuperfastSAT!';

UPDATE growth_experiments SET segment_source = '랜딩 상담 예약 폼 카톡 - SuperfastSAT!'
  WHERE segment_source = '랜딩 상담 폼 카톡 - SuperfastSAT!';
