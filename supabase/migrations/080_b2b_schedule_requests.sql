-- Migration 080: 수업 일정 변경 요청 테이블
CREATE TABLE IF NOT EXISTS public.b2b_schedule_requests (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id      text        NOT NULL DEFAULT 'gangwon',
  session_date date        NOT NULL,
  message      text        NOT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.b2b_schedule_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "b2b_schedule_req_select"
  ON public.b2b_schedule_requests FOR SELECT TO anon USING (true);

CREATE POLICY "b2b_schedule_req_insert"
  ON public.b2b_schedule_requests FOR INSERT TO anon WITH CHECK (true);
