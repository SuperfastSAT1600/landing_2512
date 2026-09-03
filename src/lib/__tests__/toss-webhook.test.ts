// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseTossWebhook, fetchTossOrder, mapOrderToNotification, TossOrderLookupError } from '@/lib/toss-webhook';

describe('parseTossWebhook (REQ-001)', () => {
  it('이벤트 타입과 orderKey 를 뽑아낸다', () => {
    const parsed = parseTossWebhook(JSON.stringify({
      eventType: 'ORDER_PAYMENT_STATUS_CHANGED',
      createdAt: '2026-09-02T15:32:00.000000',
      data: { orderKey: 'ord_123', amount: 1800000 },
    }));
    expect(parsed).toEqual({ eventType: 'ORDER_PAYMENT_STATUS_CHANGED', orderKey: 'ord_123' });
  });

  it('JSON 이 깨졌으면 null', () => {
    expect(parseTossWebhook('{not json')).toBeNull();
  });

  it('orderKey 가 없으면 null', () => {
    expect(parseTossWebhook(JSON.stringify({ eventType: 'X', data: {} }))).toBeNull();
  });

  it('형식이 다르면 null', () => {
    expect(parseTossWebhook(JSON.stringify({ foo: 'bar' }))).toBeNull();
  });
});

describe('fetchTossOrder (REQ-001, REQ-005)', () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);

  const order = {
    orderKey: 'ord_123',
    amount: 1800000,
    customerName: '이중희',
    customerPhoneNumber: '010-1234-5678',
    orderItems: [{
      product: { name: 'SAT > 관리형 > 1:1수업 > 대표코치 10시간 Chloe Lee', amount: 1800000 },
      quantity: 1,
    }],
    payment: { status: 'DONE' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TOSS_SECRET_KEY = 'live_sk_test';
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => order });
  });

  it('Basic 인증으로 주문을 조회한다', async () => {
    const result = await fetchTossOrder('ord_123');

    expect(result.customerName).toBe('이중희');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.tosspayments.com/v1/orders/ord_123');
    const auth = (init as RequestInit).headers as Record<string, string>;
    expect(auth.Authorization).toBe(`Basic ${Buffer.from('live_sk_test:').toString('base64')}`);
  });

  it('10초 제한을 지키기 위해 타임아웃 시그널을 건다', async () => {
    await fetchTossOrder('ord_123');

    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).signal).toBeDefined();
  });

  it('orderKey 를 URL 인코딩한다', async () => {
    await fetchTossOrder('ord/123');
    expect(String(fetchMock.mock.calls[0][0])).toContain('ord%2F123');
  });

  it('키가 없으면 설정 오류로 던진다', async () => {
    delete process.env.TOSS_SECRET_KEY;
    await expect(fetchTossOrder('ord_123')).rejects.toMatchObject({ kind: 'config' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('404 는 위조/무효 요청으로 본다 (재시도 무의미)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    await expect(fetchTossOrder('ord_123')).rejects.toMatchObject({ kind: 'not_found' });
  });

  it('401 은 키 설정 문제로 본다', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    await expect(fetchTossOrder('ord_123')).rejects.toMatchObject({ kind: 'config' });
  });

  it('5xx 는 일시적 오류로 본다 (재시도 가치 있음)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
    await expect(fetchTossOrder('ord_123')).rejects.toMatchObject({ kind: 'transient' });
  });

  // REQ-009: 프로덕션 401 때 상태 코드만 남아 원인을 못 갈랐다
  it('토스가 준 에러 코드를 메시지에 담는다', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ code: 'UNAUTHORIZED_KEY', message: '인증되지 않은 시크릿 키 혹은 클라이언트 키 입니다.' }),
    });
    await expect(fetchTossOrder('ord_123')).rejects.toThrow(/UNAUTHORIZED_KEY/);
  });

  it('에러 본문이 JSON 이 아니어도 종류는 그대로 판정한다', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => { throw new Error('not json'); },
    });
    await expect(fetchTossOrder('ord_123')).rejects.toMatchObject({ kind: 'transient' });
  });

  it('네트워크 오류도 일시적 오류', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    await expect(fetchTossOrder('ord_123')).rejects.toMatchObject({ kind: 'transient' });
  });

  it('응답 형식이 예상과 다르면 일시적 오류로 처리한다', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ nope: 1 }) });
    await expect(fetchTossOrder('ord_123')).rejects.toBeInstanceOf(TossOrderLookupError);
  });
});

// REQ-003, REQ-008 — 상품명은 orderItems[].product.name 에 있다 (라이브 응답 확인)
describe('mapOrderToNotification (REQ-003, REQ-008)', () => {
  const item = (name: string, quantity = 1) => ({
    product: { productKey: 'p_1', name, amount: 1800000, currency: 'KRW', status: 'ON_SALE' },
    quantity,
    orderOptions: [],
  });

  const base = {
    orderKey: 'ord_123',
    amount: 1800000,
    customerName: '이중희',
    customerPhoneNumber: '010-1234-5678',
    orderItems: [item('SAT 대표코치 10시간')],
    payment: { status: 'DONE' },
  };

  it('링크페이 Order 를 슬랙 알림 형태로 옮긴다', () => {
    expect(mapOrderToNotification(base)).toEqual({
      customerName: '이중희',
      customerEmail: null,
      customerPhone: '010-1234-5678',
      items: ['SAT 대표코치 10시간'],
      amount: 1800000,
      currency: 'krw',
      dashboardUrl: null,
      livemode: true,
      source: '토스',
    });
  });

  it('수량이 2 이상이면 표기한다', () => {
    const r = mapOrderToNotification({ ...base, orderItems: [item('SAT 10시간', 2)] });
    expect(r.items).toEqual(['SAT 10시간 × 2']);
  });

  it('상품이 여러 건이면 모두 담는다', () => {
    const r = mapOrderToNotification({ ...base, orderItems: [item('SAT 10시간'), item('AP 5시간')] });
    expect(r.items).toEqual(['SAT 10시간', 'AP 5시간']);
  });

  it('product 가 없거나 이름이 비면 그 항목만 건너뛴다', () => {
    const r = mapOrderToNotification({
      ...base,
      orderItems: [{ quantity: 1 }, item('SAT 10시간'), { product: { name: null }, quantity: 1 }],
    });
    expect(r.items).toEqual(['SAT 10시간']);
  });

  it('이름·연락처·상품이 비어도 죽지 않는다', () => {
    const r = mapOrderToNotification({ orderKey: 'ord_1', amount: 0 });
    expect(r.customerName).toBeNull();
    expect(r.customerPhone).toBeNull();
    expect(r.items).toEqual([]);
  });
});
