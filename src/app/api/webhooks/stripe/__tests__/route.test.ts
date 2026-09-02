// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { NextRequest } from 'next/server';

const notifyPaymentToSlack = vi.hoisted(() => vi.fn());
vi.mock('@/lib/slack-payment', () => ({ notifyPaymentToSlack }));

const fetchCheckoutLineItems = vi.hoisted(() => vi.fn());
vi.mock('@/lib/stripe-webhook', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/stripe-webhook')>();
  return { ...actual, fetchCheckoutLineItems };
});

const SECRET = 'whsec_test_secret';

function signedRequest(payload: object, opts: { secret?: string } = {}): NextRequest {
  const body = JSON.stringify(payload);
  const t = Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac('sha256', opts.secret ?? SECRET).update(`${t}.${body}`).digest('hex');
  return new NextRequest('https://example.com/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': `t=${t},v1=${v1}`, 'content-type': 'application/json' },
    body,
  });
}

const checkoutEvent = {
  id: 'evt_checkout',
  type: 'checkout.session.completed',
  livemode: true,
  data: {
    object: {
      id: 'cs_1',
      amount_total: 1800000,
      currency: 'krw',
      payment_intent: 'pi_1',
      customer_details: { name: 'Chloe Lee02', email: 'chloe@example.com' },
    },
  },
};

function invoiceEvent(billingReason: string) {
  return {
    id: `evt_invoice_${billingReason}`,
    type: 'invoice.paid',
    livemode: true,
    data: {
      object: {
        id: 'in_1',
        billing_reason: billingReason,
        amount_paid: 300000,
        currency: 'usd',
        customer_name: 'Chloe Lee02',
        customer_email: 'chloe@example.com',
        lines: { data: [{ description: 'SAT 구독 월 4시간', quantity: 1 }] },
      },
    },
  };
}

describe('POST /api/webhooks/stripe (REQ-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    notifyPaymentToSlack.mockResolvedValue(undefined);
    fetchCheckoutLineItems.mockResolvedValue(['SAT 관리형 1:1 대표코치 10시간']);
  });

  it('checkout.session.completed 를 슬랙으로 보낸다', async () => {
    const { POST } = await import('../route');

    const res = await POST(signedRequest(checkoutEvent));

    expect(res.status).toBe(200);
    expect(notifyPaymentToSlack).toHaveBeenCalledTimes(1);
    expect(notifyPaymentToSlack).toHaveBeenCalledWith(expect.objectContaining({
      customerName: 'Chloe Lee02',
      customerEmail: 'chloe@example.com',
      amount: 1800000,
      currency: 'krw',
      items: ['SAT 관리형 1:1 대표코치 10시간'],
      livemode: true,
      source: 'Stripe',
    }));
    expect(fetchCheckoutLineItems).toHaveBeenCalledWith('cs_1');
  });

  it('checkout 결제는 payment_intent 로 대시보드 링크를 만든다', async () => {
    const { POST } = await import('../route');

    await POST(signedRequest(checkoutEvent));

    expect(notifyPaymentToSlack.mock.calls[0][0].dashboardUrl).toContain('pi_1');
  });

  it('구독 갱신(subscription_cycle) 결제를 슬랙으로 보낸다', async () => {
    const { POST } = await import('../route');

    const res = await POST(signedRequest(invoiceEvent('subscription_cycle')));

    expect(res.status).toBe(200);
    expect(notifyPaymentToSlack).toHaveBeenCalledTimes(1);
    expect(notifyPaymentToSlack.mock.calls[0][0].items).toEqual(['SAT 구독 월 4시간']);
    // invoice 페이로드에 라인이 이미 있으므로 추가 API 호출을 하지 않는다
    expect(fetchCheckoutLineItems).not.toHaveBeenCalled();
  });

  it('구독 최초 결제(subscription_create)는 checkout 과 중복이라 보내지 않는다', async () => {
    const { POST } = await import('../route');

    const res = await POST(signedRequest(invoiceEvent('subscription_create')));

    expect(res.status).toBe(200);
    expect(notifyPaymentToSlack).not.toHaveBeenCalled();
  });

  it('관심 없는 이벤트는 200 으로 무시한다', async () => {
    const { POST } = await import('../route');

    const res = await POST(signedRequest({
      id: 'evt_x', type: 'customer.subscription.updated', livemode: true, data: { object: {} },
    }));

    expect(res.status).toBe(200);
    expect(notifyPaymentToSlack).not.toHaveBeenCalled();
  });

  it('서명이 틀리면 400 이고 전송하지 않는다', async () => {
    const { POST } = await import('../route');

    const res = await POST(signedRequest(checkoutEvent, { secret: 'whsec_wrong' }));

    expect(res.status).toBe(400);
    expect(notifyPaymentToSlack).not.toHaveBeenCalled();
  });

  it('서명 헤더가 없으면 400', async () => {
    const { POST } = await import('../route');
    const req = new NextRequest('https://example.com/api/webhooks/stripe', {
      method: 'POST',
      body: JSON.stringify(checkoutEvent),
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(notifyPaymentToSlack).not.toHaveBeenCalled();
  });

  it('webhook secret 이 설정돼 있지 않으면 500', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const { POST } = await import('../route');

    const res = await POST(signedRequest(checkoutEvent));

    expect(res.status).toBe(500);
    expect(notifyPaymentToSlack).not.toHaveBeenCalled();
  });

  it('슬랙 전송이 실패하면 500 을 반환해 Stripe 재시도를 유도한다', async () => {
    const { POST } = await import('../route');
    notifyPaymentToSlack.mockRejectedValue(new Error('not_in_channel'));

    const res = await POST(signedRequest(checkoutEvent));

    expect(res.status).toBe(500);
  });

  it('본문이 JSON 이 아니면 400', async () => {
    const { POST } = await import('../route');
    const body = 'not-json';
    const t = Math.floor(Date.now() / 1000);
    const v1 = crypto.createHmac('sha256', SECRET).update(`${t}.${body}`).digest('hex');
    const req = new NextRequest('https://example.com/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': `t=${t},v1=${v1}` },
      body,
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(notifyPaymentToSlack).not.toHaveBeenCalled();
  });
});
