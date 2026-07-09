-- Migration 084: b2b_lesson_feedback 수업 녹화 파일 링크 컬럼 추가

ALTER TABLE public.b2b_lesson_feedback
  ADD COLUMN IF NOT EXISTS recording_url text;
