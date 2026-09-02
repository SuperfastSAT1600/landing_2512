/**
 * Stripe 결제 웹훅 → 슬랙 결제 채널 알림.
 *
 * 등록 이벤트: checkout.session.completed, invoice.paid
 * 응답 규칙 — 서명/본문 오류는 400(재시도 무의미), 설정 누락과 슬랙 전송 실패는 500
 * (Stripe가 재시도하도록). 관심 없는 이벤트는 200으로 조용히 넘긴다.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyStripeSignature, parseStripeEvent, fetchCheckoutLineItems, formatLineItem } from '@/lib/stripe-webhook';
import { notifyPaymentToSlack, type PaymentNotification } from '@/lib/slack-payment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const checkoutSessionSchema = z.object({
  id: z.string(),
  amount_total: z.number().nullish(),
  currency: z.string().nullish(),
  payment_intent: z.string().nullish(),
  customer_details: z.object({
    name: z.string().nullish(),
    email: z.string().nullish(),
  }).nullish(),
});

const invoiceSchema = z.object({
  id: z.string(),
  billing_reason: z.string().nullish(),
  amount_paid: z.number().nullish(),
  currency: z.string().nullish(),
  customer_name: z.string().nullish(),
  customer_email: z.string().nullish(),
  hosted_invoice_url: z.string().nullish(),
  lines: z.object({
    data: z.array(z.object({
      description: z.string().nullish(),
      quantity: z.number().nullish(),
    })),
  }).nullish(),
});

async function fromCheckoutSession(object: unknown, livemode: boolean): Promise<PaymentNotification | null> {
  const parsed = checkoutSessionSchema.safeParse(object);
  if (!parsed.success) return null;
  const session = parsed.data;

  return {
    customerName: session.customer_details?.name ?? null,
    customerEmail: session.customer_details?.email ?? null,
    items: await fetchCheckoutLineItems(session.id),
    amount: session.amount_total ?? 0,
    currency: session.currency ?? 'krw',
    dashboardUrl: session.payment_intent
      ? `https://dashboard.stripe.com/payments/${session.payment_intent}`
      : null,
    livemode,
    source: 'Stripe',
  };
}

/**
 * 구독 갱신 결제만 처리한다.
 * 구독 최초 결제는 checkout.session.completed 와 invoice.paid 가 둘 다 발생하므로
 * subscription_create 를 여기서 걸러야 같은 결제가 두 번 올라가지 않는다.
 */
function fromInvoice(object: unknown, livemode: boolean): PaymentNotification | null {
  const parsed = invoiceSchema.safeParse(object);
  if (!parsed.success) return null;
  const invoice = parsed.data;
  if (invoice.billing_reason !== 'subscription_cycle') return null;

  const items = (invoice.lines?.data ?? [])
    .filter((line) => line.description)
    .map((line) => formatLineItem(line.description as string, line.quantity));

  return {
    customerName: invoice.customer_name ?? null,
    customerEmail: invoice.customer_email ?? null,
    items,
    amount: invoice.amount_paid ?? 0,
    currency: invoice.currency ?? 'krw',
    dashboardUrl: `https://dashboard.stripe.com/invoices/${invoice.id}`,
    livemode,
    source: 'Stripe',
  };
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET 미설정');
    return NextResponse.json({ error: { code: 'CONFIG_MISSING', message: 'webhook secret 미설정' } }, { status: 500 });
  }

  // 서명 검증에 원문이 필요하다 — req.json() 을 쓰면 검증할 수 없다
  const raw = await req.text();
  if (!verifyStripeSignature(raw, req.headers.get('stripe-signature'), secret)) {
    return NextResponse.json({ error: { code: 'INVALID_SIGNATURE', message: '서명 검증 실패' } }, { status: 400 });
  }

  const event = parseStripeEvent(raw);
  if (!event) {
    return NextResponse.json({ error: { code: 'INVALID_PAYLOAD', message: '이벤트 파싱 실패' } }, { status: 400 });
  }

  let payment: PaymentNotification | null = null;
  if (event.type === 'checkout.session.completed') {
    payment = await fromCheckoutSession(event.data.object, event.livemode);
  } else if (event.type === 'invoice.paid') {
    payment = fromInvoice(event.data.object, event.livemode);
  }

  if (!payment) return NextResponse.json({ data: { received: true, notified: false }, meta: { requestId: event.id } });

  try {
    await notifyPaymentToSlack(payment);
  } catch (e) {
    // 200을 주면 Stripe가 재전송하지 않아 알림이 조용히 사라진다
    console.error('[stripe-webhook] 슬랙 전송 실패:', e);
    return NextResponse.json({ error: { code: 'SLACK_FAILED', message: '슬랙 전송 실패' } }, { status: 500 });
  }

  return NextResponse.json({ data: { received: true, notified: true }, meta: { requestId: event.id } });
}
