CREATE TABLE IF NOT EXISTS naver_clicks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  referer_url text,
  post_id text NOT NULL DEFAULT 'direct',
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_naver_clicks_post_id ON naver_clicks (post_id);
CREATE INDEX IF NOT EXISTS idx_naver_clicks_created_at ON naver_clicks (created_at DESC);
