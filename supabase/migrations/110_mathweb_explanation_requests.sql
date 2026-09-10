create table if not exists math_explanation_requests (
  id         uuid primary key default gen_random_uuid(),
  problem_id uuid not null references math_problems(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index on math_explanation_requests (problem_id);
