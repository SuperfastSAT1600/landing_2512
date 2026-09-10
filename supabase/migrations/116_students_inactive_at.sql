-- Migration 116: 이탈 시점 컬럼(inactive_at)
--
-- 문제: 윈백 추천은 `updated_at`을 이탈 시점 proxy로 써 왔는데, 2026-08-11 08:22 일괄 백필로
--       이탈풀 1,261명 중 1,224명이 같은 시각을 갖게 됐다. 그 결과
--         - 30~180일 경과 구간: 0명, 1년 초과: 0명  → recency 신호가 전원 미발동
--         - "이탈 경과 최소 N일" 필터를 쓰면 후보가 0명으로 붕괴
-- 해결: 이탈 전환 시점을 별도 컬럼에 기록하고, 과거분은 마지막 상담 메모 날짜로 백필한다.
--       코드는 `inactive_at ?? updated_at` 폴백이므로 이 마이그레이션 전에도 동작한다.

alter table students add column if not exists inactive_at timestamptz;

comment on column students.inactive_at is
  '이탈(lead_status=inactive/reactivating) 전환 시점. 윈백 recency 신호·이탈 경과일 필터의 기준. 재활성화 시 null로 되돌린다.';

-- 과거분 백필: 마지막 상담 메모 날짜 → 메모가 없으면 리드 생성일
update students s
set inactive_at = coalesce(m.last_memo_at, s.created_at)
from students s0
left join lateral (
  select max((e->>'created_at')::timestamptz) as last_memo_at
  from jsonb_array_elements(
    case when jsonb_typeof(s0.consultation_timeline) = 'array'
         then s0.consultation_timeline else '[]'::jsonb end
  ) e
  where e->>'created_at' ~ '^\d{4}-\d{2}-\d{2}'
) m on true
where s.id = s0.id
  and s.lead_status in ('inactive', 'reactivating')
  and s.inactive_at is null;

-- 이후 전환은 트리거가 기록한다.
-- 앱의 students PATCH는 받은 필드를 그대로 통과시키므로, 기록 책임을 DB에 둔다.
create or replace function set_students_inactive_at() returns trigger
language plpgsql as $$
begin
  if new.lead_status in ('inactive', 'reactivating') then
    if old.lead_status is distinct from new.lead_status then
      new.inactive_at := coalesce(new.inactive_at, now());
    end if;
  else
    new.inactive_at := null;   -- 재활성화 = 경과일 리셋
  end if;
  return new;
end;
$$;

drop trigger if exists trg_students_inactive_at on students;
create trigger trg_students_inactive_at
  before update of lead_status on students
  for each row execute function set_students_inactive_at();

create index if not exists idx_students_inactive_at
  on students (inactive_at)
  where lead_status in ('inactive', 'reactivating');
