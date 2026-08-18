-- Migration 077: 구단 PIN 관리 테이블 + lesson_feedback 구조 변경
-- 구단이 직접 PIN을 세팅/변경하는 구조로 전환

-- 1. b2b_lesson_feedback: pin 컬럼 제거, club_id 추가
ALTER TABLE public.b2b_lesson_feedback
  ADD COLUMN IF NOT EXISTS club_id text NOT NULL DEFAULT 'gangwon';

ALTER TABLE public.b2b_lesson_feedback
  ALTER COLUMN pin DROP NOT NULL;

ALTER TABLE public.b2b_lesson_feedback
  ALTER COLUMN pin SET DEFAULT NULL;

-- 2. 구단 PIN 관리 테이블
CREATE TABLE IF NOT EXISTS public.b2b_club_pins (
  club_id    text        PRIMARY KEY,
  pin        text        NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.b2b_club_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "b2b_club_pins_select"
  ON public.b2b_club_pins FOR SELECT TO anon USING (true);

CREATE POLICY "b2b_club_pins_insert"
  ON public.b2b_club_pins FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "b2b_club_pins_update"
  ON public.b2b_club_pins FOR UPDATE TO anon USING (true);

-- 3. 강원 FC 초기 PIN (000000 — 구단이 첫 로그인 후 변경)
INSERT INTO public.b2b_club_pins (club_id, pin)
VALUES ('gangwon', '000000')
ON CONFLICT (club_id) DO NOTHING;
