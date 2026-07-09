-- Migration 078: 출석/결석 학생 컬럼 추가
ALTER TABLE public.b2b_lesson_feedback
  ADD COLUMN IF NOT EXISTS attendees jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS absentees jsonb DEFAULT '[]';
