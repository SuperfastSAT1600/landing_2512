-- 결제 완료 → 회원가입 / 카톡 단톡방 개설 온보딩 추적 (최초 세일즈 칸반 8번 컬럼).
-- kakao_chat_created: 카카오톡 단톡방 개설 완료 여부.
-- signup_done_at: 회원가입 완료 처리 시각. null = 미완료(8번 컬럼에 표시). 값 있으면 칸반에서 제거.
alter table students add column if not exists kakao_chat_created boolean not null default false;
alter table students add column if not exists signup_done_at timestamptz;

-- 백필: 마이그레이션 시점의 기존 결제완료(stage 8) 학생은 이미 온보딩이 끝난 것으로 간주한다.
-- 이들을 8번 "결제완료·가입대기" 컬럼에서 제외해, 앞으로 신규 결제 학생만 가입대기에 표시되게 한다.
update students
set signup_done_at = coalesce(funnel_stage_updated_at, updated_at, now()),
    kakao_chat_created = true
where funnel_stage = '8' and signup_done_at is null;
