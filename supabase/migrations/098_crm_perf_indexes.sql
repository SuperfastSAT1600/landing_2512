-- CRM hot-path 성능 인덱스 (출력·스키마 불변, 순수 인덱스)
-- 기존 인덱스로 커버되지 않는 hot-path 조회만 대상. 이미 존재하면 no-op.
--   - payments(student_id, student_name, paid_at): 028에서 이미 인덱스
--   - students(lead_status): 025, students(funnel_stage/company_id): 016/091 에서 이미 인덱스
-- 큰 테이블에서 잠금이 우려되면 각 문을 CREATE INDEX CONCURRENTLY 로 바꿔 한 문씩 실행할 것.

-- stats: 기간 신규 리드 조회 .gte/.lte('inquiry_date', ...) — 현재 range scan (미인덱스)
CREATE INDEX IF NOT EXISTS idx_students_inquiry_date ON students (inquiry_date);

-- strategy-stats: retry_strategy_id.not.is.null / 리트라이 목록 .eq('retry_strategy_id', ...)
CREATE INDEX IF NOT EXISTS idx_students_retry_strategy_id ON students (retry_strategy_id)
  WHERE retry_strategy_id IS NOT NULL;

-- stats: 최초결제 코호트 .eq('payment_type','최초결제').gt('amount', 0)
CREATE INDEX IF NOT EXISTS idx_payments_first_payment ON payments (payment_type, amount);
