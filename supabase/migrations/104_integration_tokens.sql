-- 외부 연동 refresh_token 영구 저장소.
-- Plaud는 OAuth refresh token rotation 방식(갱신마다 새 refresh_token 발급)이고 refresh_token은
-- 7일 hard expiry라, env 씨앗 토큰만 쓰면 7일 뒤 체인이 끊긴다. 회전된 최신 토큰을 여기 upsert해
-- 최소 7일에 한 번만 갱신이 일어나도 체인이 무한히 유지되게 한다.
-- 접근은 service_role(서버)만. RLS로 anon/authenticated 차단(refresh_token은 민감정보).
create table if not exists integration_tokens (
  provider      text primary key,   -- 'plaud' 등 연동 식별자
  refresh_token text not null,
  updated_at    timestamptz not null default now()
);

alter table integration_tokens enable row level security;
-- 정책을 두지 않으면 anon/authenticated는 접근 불가, service_role은 RLS를 우회한다.
