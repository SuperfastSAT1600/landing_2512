DROP TABLE IF EXISTS naver_clicks;

CREATE TABLE IF NOT EXISTS channel_clicks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  channel text NOT NULL CHECK (channel IN ('naver', 'ghost', 'instagram')),
  post_id text NOT NULL DEFAULT 'direct',
  referer_url text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_channel_clicks_channel_created_at
  ON channel_clicks (channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channel_clicks_channel_post_id
  ON channel_clicks (channel, post_id);
