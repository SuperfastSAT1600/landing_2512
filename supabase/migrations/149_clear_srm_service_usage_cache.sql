-- 스케줄 쿼리 버그(URL 한도 초과) 수정 전 저장된 캐시 전체 삭제
-- 이후 과거 날짜 조회 시 수정된 쿼리로 재집계됨
TRUNCATE TABLE srm_service_usage_cache;
