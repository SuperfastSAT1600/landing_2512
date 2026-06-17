-- 문의 날짜를 분 단위까지 기록할 수 있도록 date → timestamp(without time zone)로 확장.
-- 타임존 드리프트(주/월/일 그룹핑 어긋남) 방지를 위해 timestamptz가 아닌 naive timestamp 사용.
-- 기존 date 값은 자정(00:00:00) 타임스탬프로 변환된다.
alter table students
  alter column inquiry_date type timestamp without time zone
  using inquiry_date::timestamp without time zone;
