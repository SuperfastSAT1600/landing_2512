import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '@/lib/call-transcribe';

// 테스트에서는 실제 대기 없이 즉시 진행하도록 sleep을 주입한다.
const noSleep = () => Promise.resolve();

function apiError(status: number): Error & { status: number } {
  return Object.assign(new Error(`status ${status}`), { status });
}

describe('withRetry', () => {
  it('첫 시도에 성공하면 1회만 호출한다', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(withRetry(fn, { sleep: noSleep })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('일시적 503 후 성공하면 재시도해 결과를 반환한다', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(apiError(503))
      .mockResolvedValue('ok');
    await expect(withRetry(fn, { sleep: noSleep })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('네트워크 오류(status 없음)도 일시적으로 보고 재시도한다', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue('ok');
    await expect(withRetry(fn, { sleep: noSleep })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('영구 오류(400)는 재시도하지 않고 즉시 throw한다', async () => {
    const fn = vi.fn().mockRejectedValue(apiError(400));
    await expect(withRetry(fn, { sleep: noSleep })).rejects.toThrow('status 400');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('계속 503이면 attempts만큼 시도 후 마지막 오류를 throw한다', async () => {
    const fn = vi.fn().mockRejectedValue(apiError(503));
    await expect(withRetry(fn, { attempts: 3, sleep: noSleep })).rejects.toThrow('status 503');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('429(rate limit)도 재시도 대상이다', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(apiError(429))
      .mockResolvedValue('ok');
    await expect(withRetry(fn, { sleep: noSleep })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
