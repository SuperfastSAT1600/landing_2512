/**
 * 토스페이먼츠 링크페이 결제 웹훅 → 슬랙 결제 채널 알림.
 *
 * 등록 이벤트: ORDER_PAYMENT_STATUS_CHANGED
 * 응답 규칙 — 본문 파싱 실패와 존재하지 않는 주문은 400(재시도 무의미),
 * 설정 오류·일시적 조회 실패·슬랙 전송 실패는 500(토스가 최대 7회 재전송).
 * 관심 없는 이벤트와 결제 완료가 아닌 상태는 200으로 조용히 넘긴다.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  parseTossWebhook,
  describePayloadShape,
  fetchTossOrder,
  mapOrderToNotification,
  orderPaymentStatus,
  TossOrderLookupError,
} from '@/lib/toss-webhook';
import { notifyPaymentToSlack } from '@/lib/slack-payment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ORDER_EVENT = 'ORDER_PAYMENT_STATUS_CHANGED';
const PAID = 'DONE';

function ok(notified: boolean, orderKey?: string) {
  return NextResponse.json({ data: { received: true, notified }, meta: { requestId: orderKey ?? null } });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const event = parseTossWebhook(raw);
  if (!event) {
    // 어떤 키로 왔는지 남겨야 매핑을 고칠 수 있다 — 값은 남기지 않는다
    console.error('[toss-webhook] 웹훅 파싱 실패:', describePayloadShape(raw));
    return NextResponse.json({ error: { code: 'INVALID_PAYLOAD', message: '웹훅 파싱 실패' } }, { status: 400 });
  }

  // 토스는 취소·정산 등 다른 이벤트도 같은 URL로 보낸다
  if (event.eventType !== ORDER_EVENT) return ok(false, event.orderKey);

  let order;
  try {
    // 본문을 신뢰하지 않는다 — 알림에 쓰는 값은 이 조회 결과뿐이다
    order = await fetchTossOrder(event.orderKey);
  } catch (e) {
    const kind = e instanceof TossOrderLookupError ? e.kind : 'transient';
    console.error('[toss-webhook] 주문 조회 실패:', kind, e);
    if (kind === 'not_found') {
      return NextResponse.json({ error: { code: 'ORDER_NOT_FOUND', message: '주문 없음' } }, { status: 400 });
    }
    return NextResponse.json({ error: { code: 'LOOKUP_FAILED', message: '주문 조회 실패' } }, { status: 500 });
  }

  // 상태가 바뀔 때마다 웹훅이 오므로 결제 완료만 걸러낸다
  const status = orderPaymentStatus(order);
  if (status !== PAID) {
    // status 가 null 이면 상태 필드 위치가 문서와 다르다는 신호다
    console.log('[toss-webhook] 결제 완료 아님 — status:', status, 'orderKey:', event.orderKey);
    return ok(false, event.orderKey);
  }

  try {
    await notifyPaymentToSlack(mapOrderToNotification(order));
  } catch (e) {
    // 200을 주면 재전송이 끊겨 결제 알림이 조용히 사라진다
    console.error('[toss-webhook] 슬랙 전송 실패:', e);
    return NextResponse.json({ error: { code: 'SLACK_FAILED', message: '슬랙 전송 실패' } }, { status: 500 });
  }

  return ok(true, event.orderKey);
}
