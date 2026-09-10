-- posts 테이블에 embedding 컬럼 추가 (pgvector 1536차원)
-- 사용 모델: OpenAI text-embedding-3-small (1536d)
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- embedding 인덱스 (IVFFlat: 코사인 유사도 기반 검색)
CREATE INDEX IF NOT EXISTS posts_embedding_idx
  ON posts
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- match_posts RPC 함수
-- 입력: 쿼리 임베딩, 유사도 임계값, 반환 개수
-- 출력: id(slug), title, excerpt, description, similarity
CREATE OR REPLACE FUNCTION match_posts(
  query_embedding vector(1536),
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
