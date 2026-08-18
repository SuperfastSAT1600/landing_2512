-- 세일즈 전략 AI용 유사 학생 검색 RPC
-- 기존 match_students는 inactive/reactivating(이탈 풀)만 검색해 "결제 전환" 사례를 못 본다.
-- 전략 추천은 결제 전환(enrolled)과 이탈(churned) 사례를 함께 학습해야 하므로,
-- 결과가 확정된 학생(enrolled ∪ inactive ∪ reactivating)을 대상으로 하고 현재 학생을 제외한다.
create or replace function match_students_for_strategy(
  query_embedding vector(1536),
  exclude_id uuid,
  match_count int default 6
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
    embedding is not null
    and id <> exclude_id
    and lead_status in ('enrolled', 'inactive', 'reactivating')
  order by embedding <=> query_embedding
  limit match_count;
$$;
