-- Migration 075: b2b 숙제 제출 테이블
-- 강원 U-18 영어 인터뷰 수업 — 학생 숙제 제출 및 현황판용

CREATE TABLE IF NOT EXISTS public.b2b_homework_submissions (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  unit           text        NOT NULL,           -- 'unit1', 'unit2', ...
  student_name   text        NOT NULL,
  rewatch_answer text,                           -- Rewatch 단계 답변
  prepare_answer text,                           -- Prepare 단계 답변 (빈칸 채우기 등)
  submitted_at   timestamptz DEFAULT now()
);

ALTER TABLE public.b2b_homework_submissions ENABLE ROW LEVEL SECURITY;

-- anon(비로그인) 누구나 조회 가능
CREATE POLICY "b2b_hw_anon_select"
  ON public.b2b_homework_submissions
  FOR SELECT TO anon
  USING (true);

-- anon(비로그인) 누구나 제출 가능
CREATE POLICY "b2b_hw_anon_insert"
  ON public.b2b_homework_submissions
  FOR INSERT TO anon
  WITH CHECK (true);
