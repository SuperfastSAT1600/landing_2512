-- 마케팅 채널별 일별 광고비 테이블
create table if not exists marketing_ad_spend (
  id           uuid primary key default gen_random_uuid(),
  date         date not null,
  channel_group text not null check (channel_group in ('META', '구글 SEO')),
  amount       integer not null check (amount >= 0),
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint marketing_ad_spend_date_channel_unique unique (date, channel_group)
);

-- RLS 비활성 (어드민 전용 supabaseAdmin 클라이언트로만 접근)
alter table marketing_ad_spend disable row level security;
