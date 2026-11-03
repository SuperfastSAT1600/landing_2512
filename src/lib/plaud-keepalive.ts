/**
 * Plaud refresh_token keep-alive.
 * refresh_token은 7일 hard expiry라, 그 계정 녹음을 7일 동안 아무도 안 열면 체인이 끊긴다.
 * 매일 크론에서 전 계정을 강제 갱신해 회전된 토큰을 저장소에 남긴다.
 */

import { getPlaudAccessToken, listPlaudAccounts } from './plaud-client';

export interface PlaudKeepaliveResult {
  account: string;
  label: string;
  ok: boolean;
  error?: string;
}

/** 사용 가능한 모든 Plaud 계정을 강제 갱신한다. 한 계정 실패가 다른 계정을 막지 않는다. */
export async function refreshAllPlaudAccounts(): Promise<PlaudKeepaliveResult[]> {
  const accounts = await listPlaudAccounts();
  return Promise.all(
    accounts.map(async ({ key, label }): Promise<PlaudKeepaliveResult> => {
      try {
        await getPlaudAccessToken(key, { force: true });
        return { account: key, label, ok: true };
      } catch (e) {
        return { account: key, label, ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    })
  );
}
