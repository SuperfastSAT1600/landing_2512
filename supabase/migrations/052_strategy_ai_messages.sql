-- 학생별 세일즈 전략 AI 대화 기록 — 패널을 닫았다 다시 열어도 이어서 진행하기 위함.
-- [{ "role": "user" | "assistant", "content": "..." }, ...] 형태의 JSONB 배열.
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS strategy_ai_messages JSONB NOT NULL DEFAULT '[]'::jsonb;
