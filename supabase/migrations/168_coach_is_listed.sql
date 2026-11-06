-- 랜딩 프로필 노출 여부(is_listed)를 수업 투입 여부(is_active)에서 분리. 기존 노출 상태를 그대로 보존하도록 is_active로 백필.
alter table coaches add column if not exists is_listed boolean not null default true;
update coaches set is_listed = is_active;
