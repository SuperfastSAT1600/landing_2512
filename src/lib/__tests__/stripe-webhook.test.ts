// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { verifyStripeSignature, parseStripeEvent, fetchCheckoutLineItems } from '@/lib/stripe-webhook';

const SECRET = 'whsec_test_secret';

function sign(body: string, timestamp: number, secret = SECRET): string {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

function header(body: string, opts: { timestamp?: number; secret?: string; extraV1?: string } = {}): string {
  const t = opts.timestamp ?? Math.floor(Date.now() / 1000);
  const v1 = sign(body, t, opts.secret ?? SECRET);
  return opts.extraV1 ? `t=${t},v1=${opts.extraV1},v1=${v1}` : `t=${t},v1=${v1}`;
}

describe('verifyStripeSignature (REQ-001)', () => {
  const body = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' });

  it('유효한 서명을 통과시킨다', () => {
    expect(verifyStripeSignature(body, header(body), SECRET)).toBe(true);
  });

  it('본문이 변조되면 거부한다', () => {
    const sig = header(body);
    expect(verifyStripeSignature(body + ' ', sig, SECRET)).toBe(false);
  });

  it('다른 secret으로 서명된 요청을 거부한다', () => {
    expect(verifyStripeSignature(body, header(body, { secret: 'whsec_other' }), SECRET)).toBe(false);
  });

  it('타임스탬프가 300초를 넘게 오래되면 거부한다', () => {
    const old = Math.floor(Date.now() / 1000) - 400;
    expect(verifyStripeSignature(body, header(body, { timestamp: old }), SECRET)).toBe(false);
  });

  it('헤더가 없으면 거부한다', () => {
    expect(verifyStripeSignature(body, null, SECRET)).toBe(false);
  });

  it('v1 없이 t만 있으면 거부한다', () => {
    expect(verifyStripeSignature(body, `t=${Math.floor(Date.now() / 1000)}`, SECRET)).toBe(false);
  });

  it('secret이 비어 있으면 거부한다 (통과시키지 않는다)', () => {
    expect(verifyStripeSignature(body, header(body), '')).toBe(false);
  });

  it('v1 서명이 여러 개일 때 하나만 일치해도 통과한다', () => {
    const sig = header(body, { extraV1: 'deadbeef'.repeat(8) });
    expect(verifyStripeSignature(body, sig, SECRET)).toBe(true);
  });

  it('길이가 다른 가짜 서명에도 예외 없이 false를 반환한다', () => {
    const t = Math.floor(Date.now() / 1000);
    expect(verifyStripeSignature(body, `t=${t},v1=short`, SECRET)).toBe(false);
  });
});

describe('parseStripeEvent (REQ-001)', () => {
  it('필요한 필드만 뽑아낸다', () => {
    const event = parseStripeEvent(JSON.stringify({
      id: 'evt_1',
      type: 'checkout.session.completed',
      livemode: true,
      data: { object: { id: 'cs_1', amount_total: 1800000, currency: 'krw' } },
    }));
    expect(event?.type).toBe('checkout.session.completed');
    expect(event?.livemode).toBe(true);
  });

  it('JSON이 깨졌으면 null', () => {
    expect(parseStripeEvent('{not json')).toBeNull();
  });

  it('형식이 맞지 않으면 null', () => {
    expect(parseStripeEvent(JSON.stringify({ foo: 'bar' }))).toBeNull();
  });
});

describe('fetchCheckoutLineItems (REQ-004)', () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  });

  it('상품명과 수량을 문자열로 만든다', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ description: 'SAT 대표코치 10시간', quantity: 1 }] }),
    });

    const items = await fetchCheckoutLineItems('cs_1');

    expect(items).toEqual(['SAT 대표코치 10시간']);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/v1/checkout/sessions/cs_1/line_items');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer sk_test_123' });
  });

  it('수량이 2 이상이면 표기한다', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ description: 'SAT 10시간', quantity: 2 }] }),
    });
    expect(await fetchCheckoutLineItems('cs_1')).toEqual(['SAT 10시간 × 2']);
  });

  it('API가 실패해도 던지지 않고 빈 배열을 반환한다', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    expect(await fetchCheckoutLineItems('cs_1')).toEqual([]);
  });

  it('네트워크 오류도 빈 배열로 흡수한다', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    expect(await fetchCheckoutLineItems('cs_1')).toEqual([]);
  });

  it('키가 없으면 호출하지 않는다', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(await fetchCheckoutLineItems('cs_1')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
