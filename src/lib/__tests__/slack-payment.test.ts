// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function slackBody() {
  const [, init] = fetchMock.mock.calls[0];
  return JSON.parse((init as RequestInit).body as string) as { channel: string; text: string };
}

const base = {
  customerName: 'Chloe Lee02',
  customerEmail: 'chloe@example.com',
  items: ['SAT 관리형 1:1 대표코치 10시간'],
  amount: 1800000,
  currency: 'krw',
  dashboardUrl: 'https://dashboard.stripe.com/payments/pi_1',
  livemode: true,
};

describe('notifyPaymentToSlack (REQ-002, REQ-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SLACK_BOT_TOKEN = 'xoxb-test';
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  });

  it('결제 채널로 학생·이메일·구매내역·금액·링크를 담아 보낸다', async () => {
    const { notifyPaymentToSlack } = await import('@/lib/slack-payment');

    await notifyPaymentToSlack(base);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('https://slack.com/api/chat.postMessage');
    const body = slackBody();
    expect(body.channel).toBe('C08BL3EJ4V6');
    expect(body.text).toContain('새 결제');
    expect(body.text).toContain('Chloe Lee02');
    expect(body.text).toContain('chloe@example.com');
    expect(body.text).toContain('SAT 관리형 1:1 대표코치 10시간');
    expect(body.text).toContain('₩1,800,000');
    expect(body.text).toContain('<https://dashboard.stripe.com/payments/pi_1|Stripe에서 보기>');
  });

  it('KRW는 소수점 없이, USD는 100으로 나눠 표기한다', async () => {
    const { notifyPaymentToSlack } = await import('@/lib/slack-payment');

    await notifyPaymentToSlack({ ...base, amount: 30000, currency: 'usd' });

    expect(slackBody().text).toContain('$300.00');
  });

  it('알 수 없는 통화는 코드와 함께 표기한다', async () => {
    const { notifyPaymentToSlack } = await import('@/lib/slack-payment');

    await notifyPaymentToSlack({ ...base, amount: 12345, currency: 'sgd' });

    expect(slackBody().text).toContain('123.45 SGD');
  });

  it('이메일·구매내역·링크가 없으면 해당 줄을 넣지 않는다', async () => {
    const { notifyPaymentToSlack } = await import('@/lib/slack-payment');

    await notifyPaymentToSlack({ ...base, customerEmail: null, items: [], dashboardUrl: null });

    const text = slackBody().text;
    expect(text).not.toContain('이메일');
    expect(text).not.toContain('구매내역');
    expect(text).not.toContain('Stripe에서 보기');
    expect(text).toContain('Chloe Lee02');
  });

  it('이름이 없으면 이름 미상으로 표기한다', async () => {
    const { notifyPaymentToSlack } = await import('@/lib/slack-payment');

    await notifyPaymentToSlack({ ...base, customerName: null });

    expect(slackBody().text).toContain('이름 미상');
  });

  it('구매내역이 여러 건이면 모두 나열한다', async () => {
    const { notifyPaymentToSlack } = await import('@/lib/slack-payment');

    await notifyPaymentToSlack({ ...base, items: ['SAT 10시간', 'AP 5시간'] });

    const text = slackBody().text;
    expect(text).toContain('SAT 10시간');
    expect(text).toContain('AP 5시간');
  });

  it('시각을 MM/DD HH:mm KST 24시간제로 표기한다', async () => {
    const { notifyPaymentToSlack } = await import('@/lib/slack-payment');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-02T09:50:00+09:00'));

    await notifyPaymentToSlack(base);

    expect(slackBody().text).toContain('09/02 09:50 KST');
    vi.useRealTimers();
  });

  it('오후 시각도 24시간제로 표기한다 (AM/오후 표기 없음)', async () => {
    const { notifyPaymentToSlack } = await import('@/lib/slack-payment');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-02T15:32:00+09:00'));

    const text = (await notifyPaymentToSlack(base), slackBody().text);
    expect(text).toContain('09/02 15:32 KST');
    expect(text).not.toMatch(/AM|PM|오전|오후/);
    vi.useRealTimers();
  });

  it('테스트 모드 결제는 [TEST] 접두사를 붙인다', async () => {
    const { notifyPaymentToSlack } = await import('@/lib/slack-payment');

    await notifyPaymentToSlack({ ...base, livemode: false });

    expect(slackBody().text).toContain('[TEST]');
  });

  it('실서비스 결제에는 [TEST] 접두사가 없다', async () => {
    const { notifyPaymentToSlack } = await import('@/lib/slack-payment');

    await notifyPaymentToSlack(base);

    expect(slackBody().text).not.toContain('[TEST]');
  });

  it('source 를 주면 헤더에 PG 이름을 표기한다 (REQ-004)', async () => {
    const { notifyPaymentToSlack } = await import('@/lib/slack-payment');

    await notifyPaymentToSlack({ ...base, source: '토스' });

    expect(slackBody().text).toContain('새 결제 (토스)');
  });

  it('source 가 없으면 PG 표기 없이 기존 형식을 유지한다 (REQ-004)', async () => {
    const { notifyPaymentToSlack } = await import('@/lib/slack-payment');

    await notifyPaymentToSlack(base);

    const text = slackBody().text;
    expect(text).toContain('새 결제');
    expect(text).not.toContain('(토스)');
    expect(text).not.toContain('(Stripe)');
  });

  it('연락처가 있으면 줄을 넣고, 없으면 생략한다 (REQ-004)', async () => {
    const { notifyPaymentToSlack } = await import('@/lib/slack-payment');

    await notifyPaymentToSlack({ ...base, customerPhone: '010-1234-5678' });
    expect(slackBody().text).toContain('• 연락처 : 010-1234-5678');

    fetchMock.mockClear();
    await notifyPaymentToSlack({ ...base, customerPhone: null });
    expect(slackBody().text).not.toContain('연락처');
  });

  it('링크 라벨은 source 를 따른다 (REQ-004)', async () => {
    const { notifyPaymentToSlack } = await import('@/lib/slack-payment');

    await notifyPaymentToSlack({ ...base, source: '토스', dashboardUrl: 'https://example.com/o/1' });

    expect(slackBody().text).toContain('|토스에서 보기>');
  });

  it('슬랙 호출에 타임아웃을 건다 — 토스 10초 제한 대응 (REQ-005)', async () => {
    const { notifyPaymentToSlack } = await import('@/lib/slack-payment');

    await notifyPaymentToSlack(base);

    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).signal).toBeDefined();
  });

  it('슬랙이 ok:false를 반환하면 실패를 던진다 (삼키지 않는다)', async () => {
    const { notifyPaymentToSlack } = await import('@/lib/slack-payment');
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: false, error: 'not_in_channel' }) });

    await expect(notifyPaymentToSlack(base)).rejects.toThrow(/not_in_channel/);
  });

  it('네트워크 오류도 그대로 전파한다', async () => {
    const { notifyPaymentToSlack } = await import('@/lib/slack-payment');
    fetchMock.mockRejectedValue(new Error('network down'));

    await expect(notifyPaymentToSlack(base)).rejects.toThrow(/network down/);
  });

  it('토큰이 없으면 전송하지 않고 던진다', async () => {
    const { notifyPaymentToSlack } = await import('@/lib/slack-payment');
    delete process.env.SLACK_BOT_TOKEN;

    await expect(notifyPaymentToSlack(base)).rejects.toThrow(/SLACK_BOT_TOKEN/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
