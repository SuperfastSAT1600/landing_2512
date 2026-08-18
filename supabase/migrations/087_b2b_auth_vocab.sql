-- b2b_students: 학생 계정 (이름 + PIN hash)
CREATE TABLE IF NOT EXISTS public.b2b_students (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text        NOT NULL UNIQUE,
  pin_hash   text        NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.b2b_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_b2b_students" ON public.b2b_students
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- b2b_vocab_events: Leitner box 이벤트 (v2 vocab.events와 동일 구조)
CREATE TABLE IF NOT EXISTS public.b2b_vocab_events (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id  uuid        NOT NULL REFERENCES public.b2b_students(id),
  unit        text        NOT NULL,
  word_key    text        NOT NULL,
  is_correct  boolean     NOT NULL,
  prev_box    int         NOT NULL DEFAULT 0,
  new_box     int         NOT NULL DEFAULT 0,
  occurred_at timestamptz DEFAULT now()
);

ALTER TABLE public.b2b_vocab_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_b2b_vocab_events" ON public.b2b_vocab_events
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- b2b_homework_submissions: student_id 컬럼 추가
ALTER TABLE public.b2b_homework_submissions
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.b2b_students(id);
