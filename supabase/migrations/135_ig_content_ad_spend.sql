create table if not exists ig_content_ad_spend (
  date            date    not null,
  ad_id           text    not null,
  ad_name         text,
  post_shortcode  text,
  post_url        text,
  ad_account_id   text,
  spend           integer not null default 0,
  impressions     integer not null default 0,
  reach           integer not null default 0,
  primary key (date, ad_id)
);
