-- 결제완료 → 플랫폼(SuperfastSAT) 튜터링 학생 회원가입 링크용 토큰.
-- signup_token: 학생별 1회성 가입 토큰(랜덤 hex). 플랫폼이 이 토큰으로 CRM에
--   프리필 데이터를 조회하고, 가입 완료 시 signup_done_at(064)을 찍는다.
-- 소비(consumed) 판정은 signup_done_at 으로 한다 — 토큰은 보존해 재호출을 멱등 처리.
alter table students add column if not exists signup_token text;
alter table students add column if not exists signup_token_created_at timestamptz;

-- 토큰은 학생당 유일해야 한다(조회 키). null 은 허용(미발급 학생).
create unique index if not exists students_signup_token_key
  on students (signup_token)
  where signup_token is not null;
