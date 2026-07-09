-- Migration 078: 출석/결석 컬럼 추가, pin NOT NULL 제거
-- 강사 페이지 레벨 비밀번호로 전환 → 피드백별 pin 불필요

ALTER TABLE public.b2b_lesson_feedback
  ADD COLUMN IF NOT EXISTS attendees jsonb,
  ADD COLUMN IF NOT EXISTS absentees jsonb;

ALTER TABLE public.b2b_lesson_feedback
  ALTER COLUMN pin DROP NOT NULL;
