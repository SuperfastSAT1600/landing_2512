-- 결제 기록 테이블
-- student_id: CRM 학생과 연결. 히스토리컬 데이터는 NULL 허용
-- student_name: CSV 임포트 및 student_id 없는 기록을 위한 보조 필드
CREATE TABLE IF NOT EXISTS payments (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id       UUID        REFERENCES students(id) ON DELETE SET NULL,
  student_name     TEXT        NOT NULL,
  coach_name       TEXT,
  amount           INTEGER     NOT NULL CHECK (amount > 0),
  payment_type     TEXT        NOT NULL DEFAULT '최초결제'
                               CHECK (payment_type IN ('최초결제', '재결제', '원포인트')),
  payment_method   TEXT        NOT NULL DEFAULT '계좌이체',
  plan_duration    TEXT,
  plan_subjects    TEXT,
  paid_at          TIMESTAMPTZ NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN payments.payment_type   IS '최초결제 | 재결제 | 원포인트';
COMMENT ON COLUMN payments.payment_method IS '계좌이체 | 토스결제 | Stripe | 신용카드 등';
COMMENT ON COLUMN payments.plan_duration  IS '1개월 | 3개월 | 6개월 | 12개월 (신규 입력 시)';
COMMENT ON COLUMN payments.plan_subjects  IS 'RW | Math | Both (신규 입력 시)';

CREATE INDEX IF NOT EXISTS idx_payments_student_id   ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_name ON payments(student_name);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at      ON payments(paid_at DESC);
