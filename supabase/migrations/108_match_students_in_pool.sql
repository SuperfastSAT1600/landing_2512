-- Migration 108: 윈백 추천용 벡터 검색 — 규칙 사전필터로 좁힌 후보 집합 **안에서만** 유사도 검색.
--
-- 기존 040 match_students(전체 이탈풀 top-N) / 051 match_students_for_strategy(결과확정군)는 손대지 않는다.
-- 전역 top-N을 뽑아 앱에서 교집합을 내면, 사전필터가 좁을 때(예: 11학년 + AP 문의 = 80명)
-- 전역 상위권이 후보와 겹치지 않아 recall이 굶는다. 그래서 후보 id 배열을 받아 그 안에서 정렬한다.

create or replace function match_students_in_pool(
  query_embedding vector(1536),
  candidate_ids   uuid[],
  match_count     int default 60
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
    and id = any(candidate_ids)
  order by embedding <=> query_embedding
  limit match_count;
$$;
