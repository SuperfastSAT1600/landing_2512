-- 079_funnel_notes.sql
-- 채널별 퍼널 단계에 붙는 '시도 전략' 주석. 세일즈 전략 > 채널 퍼널 표의 시도 주차·내용 칸.
-- 소스(traffic_source 또는 '__all__') × 퍼널 단계(stage_key)당 여러 개 가능(주차별 시도 이력).
-- 사용자가 Supabase에서 직접 실행한다.

CREATE TABLE IF NOT EXISTS funnel_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source      text NOT NULL,                 -- traffic_source 값 또는 '__all__'
  stage_key   text NOT NULL CHECK (stage_key IN ('lead','call','diagnostic','report','paid')),
  week_start  date,                           -- 시도 주차(WEEK_DEFINITIONS[].start), 선택
  content     text NOT NULL DEFAULT '',       -- 내용
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnel_notes_source ON funnel_notes(source);

ALTER TABLE funnel_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON funnel_notes
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_deny" ON funnel_notes
  FOR ALL TO anon USING (false);
