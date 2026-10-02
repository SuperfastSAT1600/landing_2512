import { describe, it, expect, vi } from 'vitest';
import { optimisticUpdate } from '../optimistic';

describe('optimisticUpdate', () => {
  // REQ-003 (crm-quality-cleanup)
  it('성공하면 apply만 하고 true를 돌려준다', async () => {
    const apply = vi.fn();
    const revert = vi.fn();
    const ok = await optimisticUpdate({
      apply,
      revert,
      request: () => Promise.resolve(new Response('{}', { status: 200 })),
    });
    expect(ok).toBe(true);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(revert).not.toHaveBeenCalled();
  });

  it('응답이 ok가 아니면 revert하고 onError를 부른다', async () => {
    const revert = vi.fn();
    const onError = vi.fn();
    const ok = await optimisticUpdate({
      apply: vi.fn(),
      revert,
      onError,
      request: () => Promise.resolve(new Response('{}', { status: 500 })),
    });
    expect(ok).toBe(false);
    expect(revert).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('네트워크 예외도 revert한다', async () => {
    const revert = vi.fn();
    const ok = await optimisticUpdate({
      apply: vi.fn(),
      revert,
      onError: vi.fn(),
      request: () => Promise.reject(new TypeError('Failed to fetch')),
    });
    expect(ok).toBe(false);
    expect(revert).toHaveBeenCalledTimes(1);
  });

  it('onError가 없으면 failMessage로 alert한다', async () => {
    const alertSpy = vi.fn();
    vi.stubGlobal('alert', alertSpy);
    try {
      await optimisticUpdate({
        apply: vi.fn(),
        revert: vi.fn(),
        failMessage: '이동 실패',
        request: () => Promise.resolve(new Response('{}', { status: 500 })),
      });
      expect(alertSpy).toHaveBeenCalledWith('이동 실패');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
