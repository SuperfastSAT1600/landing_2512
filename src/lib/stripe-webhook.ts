/**
 * Stripe 웹훅 수신 유틸 — 서명 검증과 페이로드 파싱.
 *
 * stripe SDK를 설치하지 않는 이유: 필요한 것은 HMAC 검증과 REST 호출 두 가지뿐이고,
 * 검증 구조는 이미 Slack 수신부(src/app/api/slack/events/slack-utils.ts)에 있는 것과 같다.
 */
import crypto from 'crypto';
import { z } from 'zod';

/** Stripe 권장 허용 오차. 재전송 공격 방지. */
const TOLERANCE_SECONDS = 300;

/**
 * `Stripe-Signature: t=<unix>,v1=<hex>[,v1=<hex>]` 헤더를 검증한다.
 * Slack 쪽과 달리 secret이 없으면 통과시키지 않는다 — 결제 엔드포인트이기 때문.
 */
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!secret || !header) return false;

  let timestamp = '';
  const candidates: string[] = [];
  for (const part of header.split(',')) {
    const [key, value] = part.split('=', 2);
    if (key === 't') timestamp = value ?? '';
    else if (key === 'v1' && value) candidates.push(value);
  }
  if (!timestamp || candidates.length === 0) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) return false;

  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return candidates.some((candidate) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(candidate));
    } catch {
      // 길이가 다르면 timingSafeEqual이 throw — 불일치로 본다
      return false;
    }
  });
}

/** 사용하는 필드만 느슨하게 파싱한다. Stripe는 이벤트마다 형태가 크게 다르다. */
const stripeEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  livemode: z.boolean().default(false),
  data: z.object({ object: z.record(z.string(), z.unknown()) }),
});

export type StripeEvent = z.infer<typeof stripeEventSchema>;

export function parseStripeEvent(rawBody: string): StripeEvent | null {
  try {
    const parsed = stripeEventSchema.safeParse(JSON.parse(rawBody));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const lineItemsSchema = z.object({
  data: z.array(z.object({
    description: z.string().nullish(),
    quantity: z.number().nullish(),
  })),
});

/** 수량이 2 이상일 때만 "× n"을 붙인다. */
export function formatLineItem(description: string, quantity: number | null | undefined): string {
  return quantity && quantity > 1 ? `${description} × ${quantity}` : description;
}

/**
 * checkout.session.completed 페이로드에는 line_items가 없으므로 별도 조회한다.
 * 구매내역은 알림의 부가 정보이므로, 실패해도 던지지 않고 빈 배열로 흡수한다
 * (구매내역 줄만 빠지고 알림 자체는 나가야 한다).
 */
export async function fetchCheckoutLineItems(sessionId: string): Promise<string[]> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return [];

  try {
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}/line_items?limit=10`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) {
      console.error('[stripe-webhook] line_items 조회 실패:', res.status);
      return [];
    }
    const parsed = lineItemsSchema.safeParse(await res.json());
    if (!parsed.success) return [];
    return parsed.data.data
      .filter((item) => item.description)
      .map((item) => formatLineItem(item.description as string, item.quantity));
  } catch (e) {
    console.error('[stripe-webhook] line_items 조회 오류:', e);
    return [];
  }
}
