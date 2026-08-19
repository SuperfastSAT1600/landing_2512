-- Migration 115: 글로벌 월별 목표를 원화(KRW)로 직접 저장
--
-- 배경: 114에서 글로벌 목표를 USD로 저장하고 화면에서 1$=1,400원으로 되돌려 표시했는데,
--       정수 반올림 때문에 100만원 목표가 999,600원으로 어긋나 보였다. 근본 해결로
--       글로벌 목표도 튜터링과 동일하게 원화(KRW)로 직접 저장한다 — 실적(달러 매출)만
--       월별 집계 시점에 1$=1,400원으로 환산해 원화 기준으로 비교한다.
-- 사용자가 Supabase에서 직접 실행한다.

UPDATE business_monthly_targets SET target_amount = 1000000,  currency = 'KRW', updated_at = now() WHERE segment = 'global' AND month = '2026-08-01';
UPDATE business_monthly_targets SET target_amount = 10000000, currency = 'KRW', updated_at = now() WHERE segment = 'global' AND month = '2026-09-01';
UPDATE business_monthly_targets SET target_amount = 30000000, currency = 'KRW', updated_at = now() WHERE segment = 'global' AND month = '2026-10-01';
UPDATE business_monthly_targets SET target_amount = 50000000, currency = 'KRW', updated_at = now() WHERE segment = 'global' AND month = '2026-11-01';
