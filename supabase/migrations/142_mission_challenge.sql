-- 미션 챌린지: 선생님 인스타 게시물 + 학생 운동 인증 피드

CREATE TABLE IF NOT EXISTS mission_daily_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  instagram_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mission_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  instagram_username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  photo_url TEXT,
  rep_count INTEGER NOT NULL CHECK (rep_count > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, instagram_username)
);

-- 팔로워 캐시 (1시간 TTL, verify-follow API 성능 최적화)
CREATE TABLE IF NOT EXISTS mission_follow_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_username TEXT NOT NULL,
  is_follower BOOLEAN NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mission_follow_cache_username ON mission_follow_cache(instagram_username);
CREATE INDEX IF NOT EXISTS idx_mission_follow_cache_cached_at ON mission_follow_cache(cached_at);

-- RLS
ALTER TABLE mission_daily_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_follow_cache ENABLE ROW LEVEL SECURITY;

-- mission_daily_posts: 읽기 공개, 쓰기 service_role만
CREATE POLICY "mission_daily_posts_select" ON mission_daily_posts FOR SELECT USING (true);
CREATE POLICY "mission_daily_posts_insert" ON mission_daily_posts FOR INSERT WITH CHECK (false);
CREATE POLICY "mission_daily_posts_update" ON mission_daily_posts FOR UPDATE USING (false);

-- mission_submissions: 읽기 공개, 삽입 공개, 수정/삭제 service_role만
CREATE POLICY "mission_submissions_select" ON mission_submissions FOR SELECT USING (true);
CREATE POLICY "mission_submissions_insert" ON mission_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "mission_submissions_delete" ON mission_submissions FOR DELETE USING (false);

-- mission_follow_cache: service_role만
CREATE POLICY "mission_follow_cache_all" ON mission_follow_cache FOR ALL USING (false);
