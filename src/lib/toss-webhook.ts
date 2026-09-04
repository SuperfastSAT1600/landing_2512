/**
 * 토스페이먼츠 링크페이 웹훅 수신 유틸.
 *
 * 토스 웹훅에는 Stripe 같은 범용 서명 검증이 없다 — 문서가 안내하는 보안 키가
 * 지급대행용이라 링크페이 적용 여부가 불확실하다. 그래서 진위 검증은
 * "받은 orderKey 로 토스에 되물어보기"로 한다. 위조 요청은 조회에서 걸러지고,
 * 알림에 쓰는 값도 조회 결과만 신뢰하므로 본문 변조가 무의미해진다.
 */
import { z } from 'zod';
import type { PaymentNotification } from '@/lib/slack-payment';

const TOSS_API_BASE = 'https://api.tosspayments.com';

/** 토스는 10초 안에 2xx 를 못 받으면 실패로 보고 재전송한다. 조회는 넉넉히 4초로 끊는다. */
const LOOKUP_TIMEOUT_MS = 4000;

export type TossLookupFailure = 'config' | 'not_found' | 'transient';

export class TossOrderLookupError extends Error {
  constructor(public readonly kind: TossLookupFailure, message: string) {
    super(message);
    this.name = 'TossOrderLookupError';
  }
}

const webhookSchema = z.object({
  eventType: z.string(),
  data: z.object({ orderKey: z.string() }),
});

export interface TossWebhook {
  eventType: string;
  orderKey: string;
}

export function parseTossWebhook(rawBody: string): TossWebhook | null {
  try {
    const parsed = webhookSchema.safeParse(JSON.parse(rawBody));
    if (!parsed.success) return null;
    // zod 의 .data 와 페이로드의 data 필드가 겹치므로 풀어서 쓴다
    const { eventType, data } = parsed.data;
    return { eventType, orderKey: data.orderKey };
  } catch {
    return null;
  }
}

/** 외부 API 응답이므로 경계에서만 관대하게 파싱한다. 문서에 없는 필드는 무시된다. */
const orderSchema = z.object({
  orderKey: z.string(),
  amount: z.number().nullish(),
  customerName: z.string().nullish(),
  customerPhoneNumber: z.string().nullish(),
  // 상품명은 항목이 아니라 그 안의 product 에 있다 (라이브 응답 확인, 문서에는 없음)
  orderItems: z.array(z.object({
    product: z.object({ name: z.string().nullish() }).nullish(),
    quantity: z.number().nullish(),
  })).nullish(),
  payment: z.object({
    status: z.string().nullish(),
    approvedAt: z.string().nullish(),
  }).nullish(),
  status: z.string().nullish(),
});

export type TossOrder = z.infer<typeof orderSchema>;

/**
 * 진단용 — 페이로드의 "키 이름"만 뽑는다. 값(구매자 이름·연락처)은 로그에 남기지 않는다.
 * 링크페이 Order 스키마가 문서에 전부 열거돼 있지 않아, 어긋났을 때 이걸 보고 매핑을 고친다.
 */
export function describePayloadShape(rawBody: string): string {
  try {
    const obj = JSON.parse(rawBody) as Record<string, unknown>;
    const top = Object.keys(obj);
    const data = obj.data && typeof obj.data === 'object' ? Object.keys(obj.data as object) : [];
    return `top=[${top.join(',')}] data=[${data.join(',')}]`;
  } catch {
    return '(JSON 아님)';
  }
}

/** 결제 상태는 Order 의 payment 안에 있고, 없으면 Order 자체의 status 를 본다. */
export function orderPaymentStatus(order: TossOrder): string | null {
  return order.payment?.status ?? order.status ?? null;
}

/** 에러 응답 본문의 code 만 뽑는다. 본문이 JSON 이 아니어도 판정을 바꾸지 않는다. */
async function tossErrorCode(res: Response): Promise<string> {
  try {
    const body = await res.json() as { code?: unknown };
    return typeof body.code === 'string' ? ` ${body.code}` : '';
  } catch {
    return '';
  }
}

export async function fetchTossOrder(orderKey: string): Promise<TossOrder> {
  const key = process.env.TOSS_SECRET_KEY;
  if (!key) throw new TossOrderLookupError('config', 'TOSS_SECRET_KEY 미설정');

  // 토스 Basic 인증은 "시크릿키:" 형태 — 비밀번호 자리는 비운다
  const auth = Buffer.from(`${key}:`).toString('base64');

  let res: Response;
  try {
    res = await fetch(`${TOSS_API_BASE}/v1/orders/${encodeURIComponent(orderKey)}`, {
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
  } catch (e) {
    throw new TossOrderLookupError('transient', `주문 조회 실패: ${String(e)}`);
  }

  if (!res.ok) {
    // 상태 코드만으로는 키 불일치와 인코딩 오류를 못 가른다 — 토스가 준 code 를 같이 남긴다
    const detail = `${res.status}${await tossErrorCode(res)}`;
    if (res.status === 404) throw new TossOrderLookupError('not_found', `주문 없음: ${orderKey} (${detail})`);
    if (res.status === 401 || res.status === 403) {
      throw new TossOrderLookupError('config', `토스 인증 실패 (${detail})`);
    }
    throw new TossOrderLookupError('transient', `주문 조회 실패 (${detail})`);
  }

  const parsed = orderSchema.safeParse(await res.json());
  if (!parsed.success) {
    throw new TossOrderLookupError('transient', '주문 응답 형식이 예상과 다름');
  }
  return parsed.data;
}

function formatItem(name: string, quantity: number | null | undefined): string {
  return quantity && quantity > 1 ? `${name} × ${quantity}` : name;
}

export function mapOrderToNotification(order: TossOrder): PaymentNotification {
  const items = (order.orderItems ?? [])
    .filter((item) => item.product?.name)
    .map((item) => formatItem(item.product?.name as string, item.quantity));

  return {
    customerName: order.customerName ?? null,
    customerEmail: null,
    customerPhone: order.customerPhoneNumber ?? null,
    items,
    // 토스 금액은 원화 그대로다. KRW 는 최소 단위 = 통화 단위라 변환이 없다.
    amount: order.amount ?? 0,
    currency: 'krw',
    dashboardUrl: null,
    livemode: true,
    source: '토스',
    // 웹훅은 재전송될 수 있다 — 알림에 찍을 시각은 도착 시각이 아니라 승인 시각이다
    paidAt: order.payment?.approvedAt ?? null,
  };
}
