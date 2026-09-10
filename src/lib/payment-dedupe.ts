/**
 * 결제 알림 중복 게시 방지.
 *
 * 결제 웹훅은 at-least-once 다 — 토스는 2xx 를 못 받으면 최대 7회 재전송하고,
 * Stripe 도 같은 event.id 로 재전송한다. 알림을 보내기 전에 (source, event_key) 를
 * 선점해서, 두 번째 전달은 슬랙에 닿지 못하게 한다.
 *
 * 선점은 "보내기 전"에 한다. 보낸 뒤 기록하면 동시에 도착한 두 전달이 둘 다 통과한다.
 */
import { supabaseAdmin } from '@/lib/supabase-admin';

const TABLE = 'payment_notifications';

/** PostgreSQL unique_violation — 이미 다른 전달이 선점했다는 뜻이다. */
const UNIQUE_VIOLATION = '23505';

export type PaymentSource = 'toss' | 'stripe';

/**
 * 알림 권한을 선점한다.
 * @returns true 면 이 요청이 보낸다. false 면 이미 보낸 결제다.
 * @throws DB 오류 — 호출부는 발송하지 말고 non-2xx 로 재전송을 유도해야 한다.
 *         중복 게시보다 알림 지연이 낫다.
 */
export async function claimPaymentNotification(source: PaymentSource, eventKey: string): Promise<boolean> {
  const { error } = await supabaseAdmin.from(TABLE).insert({ source, event_key: eventKey });

  if (!error) return true;
  if (error.code === UNIQUE_VIOLATION) return false;
  throw new Error(`결제 알림 선점 실패: ${error.message}`);
}

/**
 * 선점을 되돌린다 — 슬랙 전송이 실패했을 때만 쓴다.
 * 여기서 다시 던지면 원래 실패(슬랙 오류)를 덮어쓰므로, 실패해도 삼키고 로그만 남긴다.
 * 해제되지 않으면 그 결제 알림은 영영 못 나가므로 로그를 남겨 사람이 볼 수 있게 한다.
 */
export async function releasePaymentNotification(source: PaymentSource, eventKey: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from(TABLE).delete().eq('source', source).eq('event_key', eventKey);
    if (error) console.error('[payment-dedupe] 선점 해제 실패:', source, eventKey, error.message);
  } catch (e) {
    console.error('[payment-dedupe] 선점 해제 오류:', source, eventKey, e);
  }
}
