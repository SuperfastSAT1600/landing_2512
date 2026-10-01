create table if not exists ssat_math_questions (
  id            uuid primary key default gen_random_uuid(),
  set_number    int not null check (set_number between 1 and 10),
  question_number int not null check (question_number between 1 and 15),
  question_text text not null,
  choice_a      text not null,
  choice_b      text not null,
  choice_c      text not null,
  choice_d      text not null,
  choice_e      text not null,
  correct_answer char(1) not null check (correct_answer in ('A','B','C','D','E')),
  difficulty    text check (difficulty in ('Easy','Medium','Hard')),
  domain        text,
  created_at    timestamptz default now(),
  unique (set_number, question_number)
);

create table if not exists ssat_math_results (
  id              uuid primary key default gen_random_uuid(),
  student_id      text not null,
  set_number      int not null,
  answers         jsonb not null,
  score           int not null,
  total           int not null default 15,
  elapsed_seconds int,
  graded_detail   jsonb not null,
  submitted_at    timestamptz default now(),
  unique (student_id, set_number)
);

alter table ssat_math_questions enable row level security;
alter table ssat_math_results enable row level security;

create policy "service_role_all_questions" on ssat_math_questions for all using (true);
create policy "service_role_all_results" on ssat_math_results for all using (true);
