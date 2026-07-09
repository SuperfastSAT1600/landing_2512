-- Migration 076: b2b 레슨 피드백 테이블
-- 강원 U-18 영어 인터뷰 수업 — 강사 → 구단/학부모 피드백 포털

CREATE TABLE IF NOT EXISTS public.b2b_lesson_feedback (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  unit           text        NOT NULL,           -- 'unit1', 'unit2'
  lesson_date    date        NOT NULL,           -- 수업 날짜
  lesson_content text,                           -- 이번 수업에서 진행한 내용
  student_notes  jsonb,                          -- [{name, note}] 학생별 메모
  homework       text,                           -- 숙제 안내
  pin            text        NOT NULL,           -- 6자리 숫자 PIN
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE public.b2b_lesson_feedback ENABLE ROW LEVEL SECURITY;

-- anon 누구나 조회 가능 (PIN 필터는 클라이언트에서)
CREATE POLICY "b2b_fb_anon_select"
  ON public.b2b_lesson_feedback
  FOR SELECT TO anon
  USING (true);

-- anon 누구나 제출 가능 (강사가 로그인 없이 작성)
CREATE POLICY "b2b_fb_anon_insert"
  ON public.b2b_lesson_feedback
  FOR INSERT TO anon
  WITH CHECK (true);
