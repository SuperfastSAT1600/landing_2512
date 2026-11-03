// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getPlaudAccessToken = vi.fn();
const listPlaudAccounts = vi.fn();
vi.mock('@/lib/plaud-client', () => ({
  getPlaudAccessToken: (...a: unknown[]) => getPlaudAccessToken(...a),
  listPlaudAccounts: () => listPlaudAccounts(),
}));

const { refreshAllPlaudAccounts } = await import('@/lib/plaud-keepalive');

// REQ-002
describe('refreshAllPlaudAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPlaudAccounts.mockResolvedValue([
      { key: 'me', label: '이민재' },
      { key: 'wooyoung', label: '김우영' },
    ]);
  });

  it('계정마다 강제 갱신한다', async () => {
    getPlaudAccessToken.mockResolvedValue('tok');
    const results = await refreshAllPlaudAccounts();
    expect(getPlaudAccessToken).toHaveBeenCalledWith('me', { force: true });
    expect(getPlaudAccessToken).toHaveBeenCalledWith('wooyoung', { force: true });
    expect(results).toEqual([
      { account: 'me', label: '이민재', ok: true },
      { account: 'wooyoung', label: '김우영', ok: true },
    ]);
  });

  it('한 계정이 실패해도 다른 계정은 갱신되고 실패 사유를 담는다', async () => {
    getPlaudAccessToken.mockImplementation(async (k: string) => {
      if (k === 'wooyoung') throw new Error('Plaud 토큰 갱신 실패: 401');
      return 'tok';
    });
    const results = await refreshAllPlaudAccounts();
    expect(results).toEqual([
      { account: 'me', label: '이민재', ok: true },
      { account: 'wooyoung', label: '김우영', ok: false, error: 'Plaud 토큰 갱신 실패: 401' },
    ]);
  });

  it('계정이 없으면 빈 배열', async () => {
    listPlaudAccounts.mockResolvedValue([]);
    expect(await refreshAllPlaudAccounts()).toEqual([]);
  });
});
