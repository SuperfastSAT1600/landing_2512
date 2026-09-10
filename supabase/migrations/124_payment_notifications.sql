-- Migration 124: 결제 알림 중복 게시 방지
--
-- 결제 웹훅은 at-least-once 다. 토스는 2xx 를 못 받으면 최대 7회 재전송하고,
-- 실제로 09-02 밤 결제가 서버 오류로 실패했다가 09-03 밤 재전송으로 도착한 적이 있다.
-- 그때 성공한 재전송이 두 번 왔다면 같은 결제가 결제 채널에 두 번 올라갔을 것이다.
--
-- 알림을 보내기 "전에" 이 표에 (source, event_key) 를 선점하고, 선점에 실패하면
-- 이미 게시된 건으로 보고 넘긴다. 슬랙 전송이 실패하면 행을 지워 재전송이
-- 다시 시도할 수 있게 한다 — 중복은 막되 유실은 만들지 않는다.

CREATE TABLE IF NOT EXISTS payment_notifications (
  source      TEXT        NOT NULL CHECK (source IN ('toss', 'stripe')),
  event_key   TEXT        NOT NULL,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (source, event_key)
);

COMMENT ON TABLE payment_notifications IS
  '결제 슬랙 알림 발송 기록. 웹훅 재전송으로 같은 결제가 두 번 게시되는 것을 막는다.';

COMMENT ON COLUMN payment_notifications.event_key IS
  '토스는 payment.paymentKey(없으면 orderKey), Stripe 는 event.id. 재전송돼도 같은 값이 온다.';

ALTER TABLE payment_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all" ON payment_notifications;

CREATE POLICY "service_role_all" ON payment_notifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);
