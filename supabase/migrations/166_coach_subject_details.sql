-- 코치별 수업 가능 상세 과목 (예: 'SAT Math', 'AP Calculus BC'). subjects(SAT/AP)는 대분류로 유지.
alter table coaches add column if not exists subject_details text[] not null default '{}';
