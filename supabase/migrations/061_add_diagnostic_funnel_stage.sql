-- 진단 테스트 전용 퍼널 단계(0~3). null = 미설정.
-- 0: 진단 테스트 진행하지 않고 결제
-- 1: 안내 완료 후 대기
-- 2: Report 세일즈 진행 완료 (Report 링크 전달 안하고 콜로만 진행)
-- 3: Report 세일즈 진행 완료 (Report 링크 전달함)
alter table students add column if not exists diagnostic_funnel_stage smallint;
