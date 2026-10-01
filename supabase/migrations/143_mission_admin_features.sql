-- mission_daily_posts: teacher_rep_count 컬럼 (이미 있으면 무시)
ALTER TABLE mission_daily_posts ADD COLUMN IF NOT EXISTS teacher_rep_count INTEGER;

-- 전체 챌린지 시작 횟수 글로벌 설정 테이블
CREATE TABLE IF NOT EXISTS mission_config (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO mission_config (key, value) VALUES ('base_reps', 0) ON CONFLICT (key) DO NOTHING;

-- RLS: service_role(admin)만 읽기/쓰기
ALTER TABLE mission_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mission_config_all" ON mission_config FOR ALL USING (false);
