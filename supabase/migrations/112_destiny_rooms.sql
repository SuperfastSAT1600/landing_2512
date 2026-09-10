create table if not exists destiny_rooms (
  code        text primary key,
  members     jsonb not null default '[]'::jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table destiny_rooms enable row level security;

create policy "destiny_rooms_select" on destiny_rooms for select using (true);
create policy "destiny_rooms_insert" on destiny_rooms for insert with check (true);
create policy "destiny_rooms_update" on destiny_rooms for update using (true);
