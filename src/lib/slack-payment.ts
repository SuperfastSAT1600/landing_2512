/**
 * Stripe 결제 → 슬랙 결제 채널 알림.
 *
 * 상담 메모(src/lib/slack-memo.ts)와 같은 Bot Token + chat.postMessage 방식이지만,
 * 전송 실패를 삼키지 않는다. 웹훅 라우트가 500을 반환해 Stripe 재시도를 받아야
 * 결제 알림이 조용히 유실되지 않는다.
 */

const SLACK_CHANNEL = 'C08BL3EJ4V6'; // m1_26년-3분기-2억-3믿음 (결제 건을 올리는 채널)

/**
 * 토스는 웹훅에 10초 안에 2xx 를 요구한다. 조회(4초)와 합쳐 여유를 남기려면
 * 슬랙 호출도 끊어줘야 한다 — 걸어두지 않으면 슬랙이 늦을 때 라우트 전체가 묶인다.
 */
const SLACK_TIMEOUT_MS = 5000;

/** 최소 단위가 곧 통화 단위인 통화들 — 100으로 나누면 안 된다. */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga',
  'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
]);

const CURRENCY_SYMBOLS: Record<string, string> = { krw: '₩', usd: '$', jpy: '¥', eur: '€', gbp: '£' };

export interface PaymentNotification {
  customerName: string | null;
  customerEmail: string | null;
  /** 토스는 이메일 대신 연락처를 준다. 없으면 줄을 생략한다. */
  customerPhone?: string | null;
  /** 상품명 목록. 비어 있으면 구매내역 줄을 생략한다. */
  items: string[];
  /** PG 최소 단위 금액 (KRW 1800000 = 1,800,000원). */
  amount: number;
  currency: string;
  dashboardUrl: string | null;
  livemode: boolean;
  /** 한 채널에 두 PG 알림이 섞이므로 출처를 표기한다. 미지정 시 표기 없음. */
  source?: 'Stripe' | '토스';
}

export function formatAmount(amount: number, currency: string): string {
  const code = currency.toLowerCase();
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(code);
  const value = isZeroDecimal ? amount : amount / 100;
  const digits = isZeroDecimal ? 0 : 2;
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  const symbol = CURRENCY_SYMBOLS[code];
  return symbol ? `${symbol}${formatted}` : `${formatted} ${currency.toUpperCase()}`;
}

/** Vercel 서버는 UTC — 반드시 Asia/Seoul 지정. 로케일별 오전/AM 표기가 섞이지 않게 직접 조립한다. */
function kstTimestamp(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('month')}/${get('day')} ${get('hour')}:${get('minute')}`;
}

export function formatPaymentMessage(p: PaymentNotification): string {
  const now = kstTimestamp();

  const prefix = p.livemode ? '' : '[TEST] ';
  const pg = p.source ? ` (${p.source})` : '';
  const lines = [
    `💳 *${prefix}새 결제${pg}* — ${now} KST`,
    `• 학생 : ${p.customerName || '이름 미상'}`,
  ];
  if (p.customerEmail) lines.push(`• 이메일 : ${p.customerEmail}`);
  if (p.customerPhone) lines.push(`• 연락처 : ${p.customerPhone}`);
  if (p.items.length > 0) lines.push(`• 구매내역 : ${p.items.join(', ')}`);
  lines.push(`• 금액 : ${formatAmount(p.amount, p.currency)}`);
  if (p.dashboardUrl) lines.push(`<${p.dashboardUrl}|${p.source ?? 'Stripe'}에서 보기>`);

  return lines.join('\n');
}

export async function notifyPaymentToSlack(p: PaymentNotification): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error('SLACK_BOT_TOKEN 미설정 — 결제 알림을 보낼 수 없다');

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ channel: SLACK_CHANNEL, text: formatPaymentMessage(p) }),
    signal: AbortSignal.timeout(SLACK_TIMEOUT_MS),
  });

  const data = await res.json() as { ok: boolean; error?: string };
  if (!data.ok) throw new Error(`Slack chat.postMessage 실패: ${data.error ?? 'unknown'}`);
}
