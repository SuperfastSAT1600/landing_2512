create table if not exists fulltest_submissions (
  id uuid default gen_random_uuid() primary key,
  student_name text not null,
  curriculum_id text not null,
  answers jsonb not null,
  submitted_at timestamptz default now()
);
