// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const insert = vi.hoisted(() => vi.fn());
const del = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from } }));

// delete().eq().eq() 체인
function deleteChain() {
  const chain = { eq: vi.fn(() => chain), then: undefined as never };
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  from.mockReturnValue({ insert, delete: del });
});

describe('claimPaymentNotification (REQ-011)', () => {
  it('처음 보는 이벤트면 선점하고 true 를 준다', async () => {
    const { claimPaymentNotification } = await import('@/lib/payment-dedupe');
    insert.mockResolvedValue({ error: null });

    await expect(claimPaymentNotification('toss', 'link_pay_1')).resolves.toBe(true);
    expect(from).toHaveBeenCalledWith('payment_notifications');
    expect(insert).toHaveBeenCalledWith({ source: 'toss', event_key: 'link_pay_1' });
  });

  it('이미 알림한 이벤트면 false 를 준다 (unique 위반)', async () => {
    const { claimPaymentNotification } = await import('@/lib/payment-dedupe');
    insert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });

    await expect(claimPaymentNotification('toss', 'link_pay_1')).resolves.toBe(false);
  });

  it('그 밖의 DB 오류는 던진다 — 중복보다 지연을 택한다', async () => {
    const { claimPaymentNotification } = await import('@/lib/payment-dedupe');
    insert.mockResolvedValue({ error: { code: '08006', message: 'connection failure' } });

    await expect(claimPaymentNotification('stripe', 'evt_1')).rejects.toThrow(/connection failure/);
  });
});

describe('releasePaymentNotification (REQ-011)', () => {
  it('선점을 지워 재전송이 다시 시도할 수 있게 한다', async () => {
    const { releasePaymentNotification } = await import('@/lib/payment-dedupe');
    const chain = deleteChain();
    del.mockReturnValue(chain);

    await releasePaymentNotification('toss', 'link_pay_1');

    expect(del).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('source', 'toss');
    expect(chain.eq).toHaveBeenCalledWith('event_key', 'link_pay_1');
  });

  it('해제가 실패해도 던지지 않는다 — 원래 실패를 덮어쓰지 않는다', async () => {
    const { releasePaymentNotification } = await import('@/lib/payment-dedupe');
    del.mockImplementation(() => { throw new Error('db down'); });

    await expect(releasePaymentNotification('toss', 'link_pay_1')).resolves.toBeUndefined();
  });
});
