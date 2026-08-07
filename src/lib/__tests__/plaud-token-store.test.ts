// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Supabase admin은 항상 mock — 유닛 테스트가 실제 DB에 붙지 않도록.
const maybeSingle = vi.fn();
const upsert = vi.fn();
const eqAccount = vi.fn(() => ({ maybeSingle }));
const eqProvider = vi.fn(() => ({ eq: eqAccount }));
const select = vi.fn(() => ({ eq: eqProvider }));
const from = vi.fn(() => ({ select, upsert }));

vi.mock('@/lib/supabase-admin', () => ({ supabaseAdmin: { from } }));

describe('plaud-token-store (REQ-002: 계정 인식)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsert.mockResolvedValue({ error: null });
  });

  it('REQ-002: read는 account_key로 필터해 해당 계정 토큰만 반환', async () => {
    maybeSingle.mockResolvedValue({ data: { refresh_token: 'tok-byungyun' }, error: null });
    const { readStoredRefreshToken } = await import('@/lib/plaud-token-store');

    const t = await readStoredRefreshToken('byungyun');

    expect(t).toBe('tok-byungyun');
    expect(eqProvider).toHaveBeenCalledWith('provider', 'plaud');
    expect(eqAccount).toHaveBeenCalledWith('account_key', 'byungyun');
  });

  it('REQ-002: read는 행이 없으면 null', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const { readStoredRefreshToken } = await import('@/lib/plaud-token-store');
    expect(await readStoredRefreshToken('me')).toBeNull();
  });

  it('REQ-002: read는 오류 시 null 폴백', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const { readStoredRefreshToken } = await import('@/lib/plaud-token-store');
    expect(await readStoredRefreshToken('me')).toBeNull();
  });

  it('REQ-002: write는 account_key 포함해 (provider,account_key)로 upsert', async () => {
    const { writeStoredRefreshToken } = await import('@/lib/plaud-token-store');
    await writeStoredRefreshToken('byungyun', 'rotated-tok');

    expect(upsert).toHaveBeenCalledTimes(1);
    const [row, opts] = upsert.mock.calls[0];
    expect(row).toMatchObject({
      provider: 'plaud',
      account_key: 'byungyun',
      refresh_token: 'rotated-tok',
    });
    expect(opts).toEqual({ onConflict: 'provider,account_key' });
  });

  it('REQ-002: write 실패는 삼켜서 noop(치명적 아님)', async () => {
    upsert.mockRejectedValue(new Error('supabase down'));
    const { writeStoredRefreshToken } = await import('@/lib/plaud-token-store');
    await expect(writeStoredRefreshToken('me', 't')).resolves.toBeUndefined();
  });
});
