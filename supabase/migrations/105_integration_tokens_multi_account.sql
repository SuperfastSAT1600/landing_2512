-- integration_tokens 다계정 확장.
-- Plaud를 두 사람(민재/병윤)이 각자 계정으로 쓰므로, 계정별 회전 refresh_token을 분리 저장해야 한다.
-- 기존 PK(provider 단일)를 (provider, account_key) 복합 PK로 바꾸고, 기존 단일 행은 'me'로 백필한다.
-- account_key는 코드 로스터(src/lib/plaud-client.ts)가 정의한 안정적 식별자('me','byungyun' 등).
-- RLS(정책 없음 → service_role 전용, refresh_token은 민감정보)는 그대로 유지된다.

alter table integration_tokens
  add column if not exists account_key text not null default 'me';

-- 단일 provider PK → (provider, account_key) 복합 PK.
alter table integration_tokens drop constraint if exists integration_tokens_pkey;
alter table integration_tokens add primary key (provider, account_key);
