create table if not exists srm_session_status_logs (
  id           uuid primary key default gen_random_uuid(),
  event_id     text not null,
  event_type   text not null check (event_type in ('study_hall', 'vocab')),
  event_date   text not null,
  student_id   text,
  student_name text not null,
  status       text not null check (status in (
    'on_time', 'late', 'late_present', 'late_absent', 'absent',
    'disconnected', 'disconnected_end', 'returned', 'completed'
  )),
  logged_by    text not null,
  created_at   timestamptz not null default now()
);

create index if not exists srm_session_status_logs_event_id_idx
  on srm_session_status_logs (event_id);

create index if not exists srm_session_status_logs_event_date_idx
  on srm_session_status_logs (event_date);
