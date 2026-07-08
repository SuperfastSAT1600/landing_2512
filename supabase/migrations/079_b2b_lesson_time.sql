-- Migration 079: 수업 시작/종료 시간 컬럼 추가
ALTER TABLE public.b2b_lesson_feedback
  ADD COLUMN IF NOT EXISTS start_time text,
  ADD COLUMN IF NOT EXISTS end_time   text;
