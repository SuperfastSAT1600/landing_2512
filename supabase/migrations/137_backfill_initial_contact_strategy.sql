-- 137: 2026-07-22 이후 인입 B2C 리드에 최초 컨택 전략 '개인화 메시지' 소급 기록.
-- 상태: 2026-09-16 프로덕션에 적용 완료. 이 파일은 실행 기록이다(재실행 시 가드가 중단시킨다).
-- 실제 컨택은 수행했으나 CRM 입력이 누락된 구간(문의일 7/22 ~ 9/15) 보정.
-- applied_at = inquiry_date (naive KST 벽시계 — src/lib/kst-day.ts가 KST로 해석).
-- 엔트리 shape은 src/lib/strategy-history.ts buildStrategyHistoryEntry와 동일.
-- 대상: 132명 (B2B 5명 제외, 이미 initial_contact 기록 있는 7명 제외)
-- 가드: 대상이 132명이 아니면 예외를 던지고 트랜잭션 전체를 롤백한다.

BEGIN;

DO $guard$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
  FROM students
  WHERE inquiry_date >= '2026-07-22'
    AND lead_type = 'B2C'
    AND company_id IS NULL
    AND NOT COALESCE(strategy_history, '[]'::jsonb) @> '[{"type":"initial_contact"}]'::jsonb;

  RAISE NOTICE '백필 대상: %명', n;

  IF n <> 132 THEN
    RAISE EXCEPTION '대상이 132명이 아니라 %명입니다 — 중단합니다', n;
  END IF;
END
$guard$;

UPDATE students
SET strategy_history = COALESCE(strategy_history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'id',            gen_random_uuid()::text,
        'type',          'initial_contact',
        'strategy_id',   '6a6d7da3-1ccb-4ffe-8b03-7097134f8455',
        'strategy_name', '개인화 메시지',
        'memo',          'CRM 입력 누락분 소급 기록 (2026-09-16)',
        'applied_at',    to_char(inquiry_date, 'YYYY-MM-DD"T"HH24:MI:SS')
      )
    )
WHERE inquiry_date >= '2026-07-22'
  AND lead_type = 'B2C'
  AND company_id IS NULL
  AND NOT COALESCE(strategy_history, '[]'::jsonb) @> '[{"type":"initial_contact"}]'::jsonb;

COMMIT;

-- 실행 결과 확인 (마지막 결과셋으로 표시됨)
SELECT to_char(inquiry_date, 'YYYY-MM') AS 월, count(*) AS 개인화메시지_기록
FROM students
WHERE inquiry_date >= '2026-07-22'
  AND strategy_history @> '[{"type":"initial_contact","strategy_name":"개인화 메시지"}]'::jsonb
GROUP BY 1
ORDER BY 1;
