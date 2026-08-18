-- add normal_study and abnormal_end to session status check constraint
alter table srm_session_status_logs
  drop constraint srm_session_status_logs_status_check;

alter table srm_session_status_logs
  add constraint srm_session_status_logs_status_check
  check (status in (
    'on_time', 'late', 'late_present', 'late_absent', 'absent',
    'normal_study', 'disconnected', 'disconnected_end', 'returned', 'completed', 'abnormal_end'
  ));
