-- popup_rules: 특정 포스트를 읽고 난 뒤 팝업에 표시할 타겟 포스트를 관리자가 지정
create table if not exists popup_rules (
  id           uuid primary key default gen_random_uuid(),
  post_id      text not null unique references posts(id) on delete cascade,
  target_post_id text not null references posts(id) on delete cascade,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists popup_rules_post_id_idx on popup_rules(post_id);
