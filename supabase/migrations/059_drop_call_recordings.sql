-- 구 통화 녹음 기능 제거: 브라우저 인터넷 전화(call_sessions, 058)로 대체됨.
-- 원본 오디오는 더 이상 Supabase 버킷('call-recordings')에 저장하지 않는다.
-- (버킷 자체 삭제는 Supabase 대시보드/관리 API로 별도 수행)
DROP TABLE IF EXISTS call_recordings;
