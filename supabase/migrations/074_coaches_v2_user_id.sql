-- v2 플랫폼(superfastsat) 계정과 coaches 테이블 연결
-- sfv2 profiles.id (role='teacher') 를 여기에 저장
alter table coaches add column if not exists v2_user_id text;

create unique index if not exists coaches_v2_user_id_key
  on coaches (v2_user_id)
  where v2_user_id is not null;
