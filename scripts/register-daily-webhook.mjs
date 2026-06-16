#!/usr/bin/env node
/**
 * Daily 웹훅 1회 등록 스크립트.
 *
 * 사용법:
 *   DAILY_API_KEY=xxx node scripts/register-daily-webhook.mjs https://<도메인>/api/webhooks/daily
 *
 * 출력된 hmac 시크릿을 .env.local / Vercel 의 DAILY_WEBHOOK_SECRET 에 넣으세요.
 * 배포 URL(프로덕션)과 로컬 ngrok URL 각각 등록이 필요합니다.
 */
const apiKey = process.env.DAILY_API_KEY;
const url = process.argv[2];

if (!apiKey) {
  console.error('DAILY_API_KEY 환경변수가 필요합니다.');
  process.exit(1);
}
if (!url) {
  console.error('사용법: node scripts/register-daily-webhook.mjs <webhook-url>');
  process.exit(1);
}

const res = await fetch('https://api.daily.co/v1/webhooks', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url,
    eventTypes: ['recording.ready-to-download'],
    retryType: 'exponential',
  }),
});

const body = await res.json();
if (!res.ok) {
  console.error('등록 실패:', res.status, JSON.stringify(body, null, 2));
  process.exit(1);
}

console.log('✅ 웹훅 등록 완료');
console.log(JSON.stringify(body, null, 2));
console.log('\n→ 응답의 hmac 값을 DAILY_WEBHOOK_SECRET 으로 설정하세요.');
