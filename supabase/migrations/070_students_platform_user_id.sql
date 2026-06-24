-- 플랫폼(superfastsat) 계정과의 상호 참조. 두 앱은 별도 Supabase 프로젝트라 동일
-- UUID 를 공유할 수 없으므로, 가입 완료 시 플랫폼 auth user id 를 여기에 기록한다.
-- (반대 방향은 플랫폼 profiles.crm_student_id 에 students.id 를 저장)
alter table students add column if not exists platform_user_id uuid;

create unique index if not exists students_platform_user_id_key
  on students (platform_user_id)
  where platform_user_id is not null;
