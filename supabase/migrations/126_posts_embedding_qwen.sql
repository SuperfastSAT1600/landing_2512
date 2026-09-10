-- embedding 컬럼을 1024차원으로 재생성 (Qwen text-embedding-v3)
-- 기존 1536차원(OpenAI) → 1024차원(Qwen) 전환
ALTER TABLE posts DROP COLUMN IF EXISTS embedding;
ALTER TABLE posts ADD COLUMN embedding vector(1024);

DROP INDEX IF EXISTS posts_embedding_idx;
CREATE INDEX IF NOT EXISTS posts_embedding_idx
  ON posts
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

DROP FUNCTION IF EXISTS match_posts(vector(1536), float, int);

CREATE OR REPLACE FUNCTION match_posts(
  query_embedding vector(1024),
  match_threshold  float,
  match_count      int
)
RETURNS TABLE (
  id          text,
  title       text,
  excerpt     text,
  description text,
  similarity  float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    p.title,
    p.excerpt,
    p.description,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM posts p
  WHERE
    p.embedding IS NOT NULL
    AND p.is_published = true
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
$$;
