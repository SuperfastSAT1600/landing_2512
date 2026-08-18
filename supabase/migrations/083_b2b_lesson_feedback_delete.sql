-- Migration 083: b2b_lesson_feedback anon DELETE 정책 추가
-- 레슨 피드백 뷰 페이지에서 중복·오작성 항목 삭제 허용

CREATE POLICY "b2b_fb_anon_delete"
  ON public.b2b_lesson_feedback
  FOR DELETE TO anon
  USING (true);
