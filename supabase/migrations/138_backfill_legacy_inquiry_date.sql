-- 138: 레거시 시트 마이그레이션(2026-05-28 배치)으로 들어온 리드 465건의
--      inquiry_date NULL 을 stage_history[0].entered_at (KST 벽시계)로 복원한다.
-- 상태: 2026-09-16 프로덕션에 적용 완료. 이 파일은 실행 기록이다(재실행 시 가드가 중단시킨다).
--
-- 배경: computeCrmStats 는 inquiry_date 가 기간 내인 리드만 센다(crm-stats-service.ts).
--       NULL 인 465건이 집계에서 통째로 빠지면서 2025년 컨택 성공률이 96.88%로
--       부풀려져 있었다(누락분의 실제 컨택률은 39.6%).
--
-- 근거: inquiry_date 가 이미 있는 417건에서 stage_history[0] 날짜 == inquiry_date 날짜가
--       97.8%(408/417). UTC→KST 변환 시 날짜가 바뀌는 행 0건.
-- 대상: 465명 (2024년 25 / 2025년 356 / 2026년 84, 최대 2026-06-25)
--       마이그레이션 137(>= 2026-07-22) 범위와 겹치는 행 0건.
-- 가드: 대상이 465명이 아니면 예외를 던지고 트랜잭션 전체를 롤백한다.
--
-- 선행 필수: 롤백용 id 백업 테이블을 먼저 만들 것.
--   CREATE TABLE IF NOT EXISTS _backup_inquiry_date_null_20260916 AS
--   SELECT id FROM students WHERE inquiry_date IS NULL;

BEGIN;

DO $guard$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
  FROM students
  WHERE inquiry_date IS NULL
    AND jsonb_array_length(COALESCE(stage_history, '[]'::jsonb)) > 0
    AND stage_history->0->>'entered_at' IS NOT NULL;

  RAISE NOTICE '백필 대상: %명', n;

  IF n <> 465 THEN
    RAISE EXCEPTION '대상이 465명이 아니라 %명입니다 — 중단합니다', n;
  END IF;
END
$guard$;

UPDATE students
SET inquiry_date = (stage_history->0->>'entered_at')::timestamptz AT TIME ZONE 'Asia/Seoul'
WHERE inquiry_date IS NULL
  AND jsonb_array_length(COALESCE(stage_history, '[]'::jsonb)) > 0
  AND stage_history->0->>'entered_at' IS NOT NULL;

COMMIT;
