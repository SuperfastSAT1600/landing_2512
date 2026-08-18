-- pgvector 확장 활성화
create extension if not exists vector;

-- 임베딩 컬럼 추가 (text-embedding-3-small = 1536차원)
alter table students
  add column if not exists embedding vector(1536);

-- 코사인 유사도 검색용 인덱스 (리드풀 규모에서 IVFFlat이 적합)
create index if not exists students_embedding_idx
  on students
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 벡터 유사도 검색 RPC
create or replace function match_students(
  query_embedding vector(1536),
  match_count int default 20
)
returns table (
  id uuid,
  similarity float
)
language sql stable
as $$
  select
    id,
    1 - (embedding <=> query_embedding) as similarity
  from students
  where
    lead_status in ('inactive', 'reactivating')
    and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;
