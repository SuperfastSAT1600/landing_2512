-- Migration 077: b2b_lesson_feedback anon UPDATE 정책 추가
-- PIN 검증은 클라이언트에서 처리, 강사가 기존 피드백을 수정할 수 있도록

CREATE POLICY "b2b_fb_anon_update"
  ON public.b2b_lesson_feedback
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);
