// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const notifyPaymentToSlack = vi.hoisted(() => vi.fn());
vi.mock('@/lib/slack-payment', () => ({ notifyPaymentToSlack }));

const fetchTossOrder = vi.hoisted(() => vi.fn());
vi.mock('@/lib/toss-webhook', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/toss-webhook')>();
  return { ...actual, fetchTossOrder };
});

const claimPaymentNotification = vi.hoisted(() => vi.fn());
const releasePaymentNotification = vi.hoisted(() => vi.fn());
vi.mock('@/lib/payment-dedupe', () => ({ claimPaymentNotification, releasePaymentNotification }));

function request(payload: object | string): NextRequest {
  return new NextRequest('https://example.com/api/webhooks/toss', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  });
}

const webhook = {
  eventType: 'ORDER_PAYMENT_STATUS_CHANGED',
  createdAt: '2026-09-02T15:32:00.000000',
  data: { orderKey: 'ord_123' },
};

function order(status: string) {
  return {
    orderKey: 'ord_123',
    amount: 1800000,
    customerName: '이중희',
    customerPhoneNumber: '010-1234-5678',
    orderItems: [{ product: { name: 'SAT 대표코치 10시간' }, quantity: 1 }],
    payment: { status, paymentKey: 'link_20260902234455tdPR7' },
  };
}

describe('POST /api/webhooks/toss', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TOSS_SECRET_KEY = 'live_sk_test';
    notifyPaymentToSlack.mockResolvedValue(undefined);
    fetchTossOrder.mockResolvedValue(order('DONE'));
    claimPaymentNotification.mockResolvedValue(true);
    releasePaymentNotification.mockResolvedValue(undefined);
  });

  // REQ-011: 재전송이 두 번 성공하면 같은 결제가 두 번 올라간다
  describe('중복 게시 방지 (REQ-011)', () => {
    it('보내기 전에 orderKey 로 선점한다', async () => {
      const { POST } = await import('../route');

      await POST(request(webhook));

      expect(claimPaymentNotification).toHaveBeenCalledWith('toss', 'ord_123');
    });

    // 폴백을 두면 첫 전달과 재전송의 키가 갈려 중복이 샌다
    it('paymentKey 유무와 무관하게 같은 키로 선점한다', async () => {
      const { POST } = await import('../route');
      fetchTossOrder.mockResolvedValue({ ...order('DONE'), payment: { status: 'DONE' } });

      await POST(request(webhook));

      expect(claimPaymentNotification).toHaveBeenCalledWith('toss', 'ord_123');
    });

    it('이미 보낸 결제면 슬랙에 보내지 않고 200 을 준다', async () => {
      const { POST } = await import('../route');
      claimPaymentNotification.mockResolvedValue(false);

      const res = await POST(request(webhook));

      expect(res.status).toBe(200);
      expect(notifyPaymentToSlack).not.toHaveBeenCalled();
      expect(await res.json()).toMatchObject({ data: { notified: false } });
    });

    it('슬랙 전송이 실패하면 선점을 해제해 재전송이 다시 시도하게 한다', async () => {
      const { POST } = await import('../route');
      notifyPaymentToSlack.mockRejectedValue(new Error('not_in_channel'));

      const res = await POST(request(webhook));

      expect(res.status).toBe(500);
      expect(releasePaymentNotification).toHaveBeenCalledWith('toss', 'ord_123');
    });

    it('선점 자체가 실패하면 보내지 않고 500 — 중복보다 지연을 택한다', async () => {
      const { POST } = await import('../route');
      claimPaymentNotification.mockRejectedValue(new Error('db down'));

      const res = await POST(request(webhook));

      expect(res.status).toBe(500);
      expect(notifyPaymentToSlack).not.toHaveBeenCalled();
    });
  });

  it('결제 완료(DONE)면 슬랙으로 보낸다 (REQ-002)', async () => {
    const { POST } = await import('../route');

    const res = await POST(request(webhook));

    expect(res.status).toBe(200);
    expect(fetchTossOrder).toHaveBeenCalledWith('ord_123');
    expect(notifyPaymentToSlack).toHaveBeenCalledTimes(1);
    expect(notifyPaymentToSlack).toHaveBeenCalledWith(expect.objectContaining({
      customerName: '이중희',
      customerPhone: '010-1234-5678',
      items: ['SAT 대표코치 10시간'],
      amount: 1800000,
      source: '토스',
    }));
  });

  it('본문이 아니라 재조회 결과를 신뢰한다 (REQ-001)', async () => {
    const { POST } = await import('../route');
    fetchTossOrder.mockResolvedValue({ ...order('DONE'), customerName: '진짜이름', amount: 999 });

    await POST(request({ ...webhook, data: { orderKey: 'ord_123', customerName: '위조된이름', amount: 1 } }));

    const arg = notifyPaymentToSlack.mock.calls[0][0];
    expect(arg.customerName).toBe('진짜이름');
    expect(arg.amount).toBe(999);
  });

  it('입금 대기 상태는 보내지 않는다 (REQ-002)', async () => {
    const { POST } = await import('../route');
    fetchTossOrder.mockResolvedValue(order('WAITING_FOR_DEPOSIT'));

    const res = await POST(request(webhook));

    expect(res.status).toBe(200);
    expect(notifyPaymentToSlack).not.toHaveBeenCalled();
  });

  it('취소 상태는 보내지 않는다 (REQ-002)', async () => {
    const { POST } = await import('../route');
    fetchTossOrder.mockResolvedValue(order('CANCELED'));

    const res = await POST(request(webhook));

    expect(res.status).toBe(200);
    expect(notifyPaymentToSlack).not.toHaveBeenCalled();
  });

  it('다른 이벤트 타입은 조회조차 하지 않는다', async () => {
    const { POST } = await import('../route');

    const res = await POST(request({ ...webhook, eventType: 'CANCEL_STATUS_CHANGED' }));

    expect(res.status).toBe(200);
    expect(fetchTossOrder).not.toHaveBeenCalled();
    expect(notifyPaymentToSlack).not.toHaveBeenCalled();
  });

  it('본문이 JSON 이 아니면 400', async () => {
    const { POST } = await import('../route');

    const res = await POST(request('not-json'));

    expect(res.status).toBe(400);
    expect(notifyPaymentToSlack).not.toHaveBeenCalled();
  });

  it('없는 주문(위조 의심)은 400 — 재시도 무의미', async () => {
    const { POST } = await import('../route');
    const { TossOrderLookupError } = await import('@/lib/toss-webhook');
    fetchTossOrder.mockRejectedValue(new TossOrderLookupError('not_found', '주문 없음'));

    const res = await POST(request(webhook));

    expect(res.status).toBe(400);
    expect(notifyPaymentToSlack).not.toHaveBeenCalled();
  });

  it('키 설정 문제는 500 — 고친 뒤 재전송받아야 한다', async () => {
    const { POST } = await import('../route');
    const { TossOrderLookupError } = await import('@/lib/toss-webhook');
    fetchTossOrder.mockRejectedValue(new TossOrderLookupError('config', '키 없음'));

    const res = await POST(request(webhook));

    expect(res.status).toBe(500);
  });

  it('일시적 조회 실패는 500', async () => {
    const { POST } = await import('../route');
    const { TossOrderLookupError } = await import('@/lib/toss-webhook');
    fetchTossOrder.mockRejectedValue(new TossOrderLookupError('transient', '네트워크'));

    const res = await POST(request(webhook));

    expect(res.status).toBe(500);
  });

  it('슬랙 전송 실패는 500 — 토스 재전송을 유도한다 (REQ-006)', async () => {
    const { POST } = await import('../route');
    notifyPaymentToSlack.mockRejectedValue(new Error('not_in_channel'));

    const res = await POST(request(webhook));

    expect(res.status).toBe(500);
  });
});
