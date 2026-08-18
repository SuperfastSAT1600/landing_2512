-- 첫 메시지(첫 응답) 발송 시각. null = 미발송/미입력.
-- 소스별 '문의 → 첫 메시지' 평균 응답 시간 산출에 사용 (문의시각 기준 = created_at).
alter table students add column if not exists first_message_sent_at timestamptz;
