/**
 * Plaud refresh_token 영구 저장소 (Supabase `integration_tokens`).
 *
 * Plaud는 OAuth refresh token rotation 방식이라 access token을 갱신할 때마다 새 refresh_token을
 * 돌려준다. refresh_token 자체는 7일 hard expiry(JWT exp)이므로, env 씨앗 토큰만 쓰면 7일 뒤
 * 체인이 끊겨 수동 재인증이 필요하다. 회전된 최신 토큰을 여기 저장해두면 최소 7일에 한 번만
 * 갱신이 일어나도 체인이 무한히 유지된다.
 *
 * 저장소 접근은 부트스트랩/그레이스풀: Supabase 미구성·오류 시 read→null, write→noop 으로
 * 조용히 폴백하고, 갱신 흐름은 env 씨앗 토큰으로 계속 동작한다.
 *
 * 다계정: (provider, account_key) 복합 PK로 Plaud 계정별 토큰을 분리 저장한다.
 * account_key는 코드 로스터(plaud-client)가 정의한 안정적 식별자('me', 'byungyun' 등).
 */

const PROVIDER = 'plaud';

/** 지정 계정의 저장된 최신 refresh_token을 반환한다. 없거나 오류면 null. */
export async function readStoredRefreshToken(accountKey: string): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import('./supabase-admin');
    const { data, error } = await supabaseAdmin
      .from('integration_tokens')
      .select('refresh_token')
      .eq('provider', PROVIDER)
      .eq('account_key', accountKey)
      .maybeSingle();
    if (error || !data?.refresh_token) return null;
    return data.refresh_token as string;
  } catch {
    return null;
  }
}

/** 지정 계정의 회전된 새 refresh_token을 저장한다. 실패는 치명적이지 않다(다음 갱신에서 재시도). */
export async function writeStoredRefreshToken(
  accountKey: string,
  refreshToken: string
): Promise<void> {
  try {
    const { supabaseAdmin } = await import('./supabase-admin');
    await supabaseAdmin.from('integration_tokens').upsert(
      {
        provider: PROVIDER,
        account_key: accountKey,
        refresh_token: refreshToken,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'provider,account_key' }
    );
  } catch {
    /* noop */
  }
}
