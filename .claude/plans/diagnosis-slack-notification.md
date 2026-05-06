# Diagnosis Slack Notification

## Overview

진단테스트 관련 Slack 알림 시스템. 두 가지 트리거를 처리한다:
1. **토큰 만료 알림** -- 발급된 코드가 만료되었는데 학생이 테스트를 제출하지 않은 경우 관리자에게 Slack으로 알림
2. **테스트 제출 알림** -- 학생이 진단테스트를 완료 제출하면 즉시 Slack으로 알림

이메일(Resend) 대신 Slack Incoming Webhook을 사용하여 외부 패키지 없이 `fetch()`만으로 구현한다.

## Requirements

### REQ-001: Slack 메시지 전송 유틸리티
- **Priority**: Must
- **Description**: Slack Incoming Webhook URL로 Block Kit 메시지를 전송하는 공통 유틸리티 함수. `SLACK_WEBHOOK_URL` 미설정 시 경고 로그만 남기고 에러 없이 스킵.
- **Acceptance Criteria**: `sendSlackNotification(blocks)` 호출 시 Slack 채널에 메시지가 도착하거나, env 미설정 시 graceful skip
- **Verification**: (TEST) 유닛테스트 — fetch mock으로 payload 구조 검증, env 미설정 시 스킵 검증

### REQ-002: 테스트 제출 시 Slack 알림
- **Priority**: Must
- **Description**: `POST /api/diagnosis/submit` 성공(201) 후 비동기로 Slack 메시지 전송. 학생 이름, 이메일, 제출 시각, 리포트 링크 포함. 알림 실패 시에도 제출 응답에 영향 없음 (fire-and-forget).
- **Acceptance Criteria**: 테스트 제출 성공 시 Slack 채널에 제출 알림 메시지 도착. 메시지에 리포트 링크(`/reports/{resultId}`) 포함.
- **Verification**: (TEST) submit route 테스트에서 Slack 함수 호출 여부 검증

### REQ-003: DB 마이그레이션 -- slack_notified_at 컬럼
- **Priority**: Must
- **Description**: `diagnostic_access_tokens` 테이블에 `slack_notified_at TIMESTAMPTZ DEFAULT NULL` 컬럼 추가. 만료 알림 중복 방지용.
- **Acceptance Criteria**: 마이그레이션 실행 후 컬럼 존재 확인
- **Verification**: (TEST) 마이그레이션 SQL 파일 존재 및 구문 검증

### REQ-004: Cron API -- 만료 토큰 Slack 알림
- **Priority**: Must
- **Description**: `GET /api/cron/diagnosis-expiry` 엔드포인트. Vercel Cron이 매시간 호출. 조건: `expires_at < now` AND `is_active = true` AND 해당 token_id로 `diagnostic_test_results`에 결과 없음 AND `slack_notified_at IS NULL`. 조건에 맞는 토큰마다 Slack 알림 전송 후 `slack_notified_at = now()` 업데이트.
- **Acceptance Criteria**: Cron 실행 시 만료+미제출+미알림 토큰에 대해 Slack 메시지 전송, `slack_notified_at` 기록, 이미 알림 보낸 토큰은 스킵
- **Verification**: (TEST) 유닛테스트 — supabase mock으로 쿼리 조건/업데이트 검증

### REQ-005: Vercel Cron 설정
- **Priority**: Must
- **Description**: `vercel.json` 파일에 cron job 설정 추가. 경로: `/api/cron/diagnosis-expiry`, 스케줄: `0 * * * *` (매시간 정각).
- **Acceptance Criteria**: `vercel.json`에 cron 설정 존재
- **Verification**: (MANUAL) vercel.json 파일 확인

### REQ-006: Cron 보안 -- CRON_SECRET 검증
- **Priority**: Must
- **Description**: Cron 엔드포인트는 `Authorization: Bearer <CRON_SECRET>` 헤더를 검증. Vercel은 자동으로 이 헤더를 추가함. 미인증 요청은 401 반환.
- **Acceptance Criteria**: CRON_SECRET 불일치 시 401, 일치 시 정상 실행
- **Verification**: (TEST) 인증 실패/성공 케이스 유닛테스트

### REQ-007: Slack Block Kit 메시지 포맷
- **Priority**: Should
- **Description**: 만료 알림과 제출 알림 각각에 대해 Block Kit 포맷 메시지 빌더 함수 제공. 만료 알림: 학생명, 코드, 만료 시각, 어드민 링크. 제출 알림: 학생명, 이메일, 제출 시각, 리포트 링크.
- **Acceptance Criteria**: Block Kit JSON 구조가 Slack API 스펙에 부합
- **Verification**: (TEST) 빌더 함수 output snapshot 테스트

## Technical Design

### Architecture

```
src/lib/slack.ts                         -- 공통 Slack 유틸 (REQ-001, REQ-007)
src/app/api/diagnosis/submit/route.ts    -- 기존 파일 수정 (REQ-002)
src/app/api/cron/diagnosis-expiry/route.ts -- 신규 Cron 엔드포인트 (REQ-004, REQ-006)
supabase/migrations/008_slack_notified_at.sql -- DB 마이그레이션 (REQ-003)
vercel.json                              -- 신규 파일 (REQ-005)
```

### Slack 메시지 포맷 (Block Kit)

**제출 알림:**
```json
{
  "blocks": [
    {
      "type": "header",
      "text": { "type": "plain_text", "text": "✅ 진단테스트 제출 완료", "emoji": true }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*학생:*\n홍길동" },
        { "type": "mrkdwn", "text": "*이메일:*\nstudent@email.com" },
        { "type": "mrkdwn", "text": "*제출 시각:*\n2026-04-06 14:30 KST" },
        { "type": "mrkdwn", "text": "*소요 시간:*\n25분 12초" }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "리포트 보기" },
          "url": "https://superfastsat.com/reports/{resultId}",
          "style": "primary"
        },
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "어드민 열기" },
          "url": "https://superfastsat.com/admin/diagnosis"
        }
      ]
    }
  ]
}
```

**만료 알림:**
```json
{
  "blocks": [
    {
      "type": "header",
      "text": { "type": "plain_text", "text": "⏰ 진단코드 만료 (미제출)", "emoji": true }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*학생:*\n홍길동" },
        { "type": "mrkdwn", "text": "*코드:*\n`123456`" },
        { "type": "mrkdwn", "text": "*만료 시각:*\n2026-04-06 14:00 KST" },
        { "type": "mrkdwn", "text": "*발급일:*\n2026-04-05 10:00 KST" }
      ]
    },
    {
      "type": "context",
      "elements": [
        { "type": "mrkdwn", "text": "학생이 테스트를 시작하지 않았거나 완료하지 못했습니다. 코드 재발급이 필요할 수 있습니다." }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": { "type": "plain_text", "text": "어드민에서 확인" },
          "url": "https://superfastsat.com/admin/diagnosis",
          "style": "primary"
        }
      ]
    }
  ]
}
```

**배치 만료 알림 (2건 이상):**
- 개별 알림 대신 하나의 메시지에 여러 토큰을 나열
- 5건 초과 시 상위 5건 + "외 N건" 요약

### 핵심 함수 시그니처

```typescript
// src/lib/slack.ts
export async function sendSlackNotification(blocks: SlackBlock[]): Promise<boolean>;
export function buildSubmitNotification(data: SubmitNotificationData): SlackBlock[];
export function buildExpiryNotification(tokens: ExpiredTokenData[]): SlackBlock[];
```

### Cron 쿼리 로직 (REQ-004)

```sql
-- 만료 + 활성 + 미제출 + 미알림 토큰 조회
SELECT t.id, t.token, t.student_name, t.student_email, t.expires_at, t.created_at
FROM diagnostic_access_tokens t
LEFT JOIN diagnostic_test_results r ON r.token_id = t.id
WHERE t.expires_at < NOW()
  AND t.is_active = true
  AND t.slack_notified_at IS NULL
  AND r.id IS NULL
LIMIT 50;
```

Supabase JS로는 LEFT JOIN이 어려우므로 두 단계로 처리:
1. 만료+활성+미알림 토큰 조회
2. 해당 token_id들로 결과 테이블 조회 → 결과 있는 token_id 제외

### Dependencies

- **외부 패키지 추가 없음** -- `fetch()` (Node 18+ built-in) 사용
- **환경변수**: `SLACK_WEBHOOK_URL`, `CRON_SECRET`
- **기존 의존**: `@supabase/supabase-js` (supabaseAdmin)

### 환경변수 목록

| 변수 | 용도 | 필수 | 설정 위치 |
|------|------|------|----------|
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL | Yes (prod) | Vercel env |
| `CRON_SECRET` | Vercel Cron 인증 토큰 | Yes (prod) | Vercel env (자동 생성) |

## Traceability Matrix

| REQ ID  | Description                    | Verification | Test/Check Location                                    | Status  |
|---------|--------------------------------|--------------|--------------------------------------------------------|---------|
| REQ-001 | Slack 전송 유틸리티            | (TEST)       | `src/lib/__tests__/slack.test.ts`                      | Pending |
| REQ-002 | 제출 시 Slack 알림             | (TEST)       | `src/app/api/diagnosis/__tests__/submit-slack.test.ts`  | Pending |
| REQ-003 | slack_notified_at 컬럼         | (TEST)       | `supabase/migrations/008_slack_notified_at.sql`         | Pending |
| REQ-004 | Cron 만료 알림 엔드포인트      | (TEST)       | `src/app/api/cron/__tests__/diagnosis-expiry.test.ts`   | Pending |
| REQ-005 | Vercel Cron 설정               | (MANUAL)     | `vercel.json`                                           | Pending |
| REQ-006 | Cron CRON_SECRET 보안          | (TEST)       | `src/app/api/cron/__tests__/diagnosis-expiry.test.ts`   | Pending |
| REQ-007 | Block Kit 메시지 빌더          | (TEST)       | `src/lib/__tests__/slack.test.ts`                       | Pending |

## Implementation Order

1. **REQ-003** -- DB 마이그레이션 (다른 모든 것의 기반)
2. **REQ-001 + REQ-007** -- Slack 유틸리티 + 메시지 빌더 (공통 모듈, 의존성 없음)
3. **REQ-002** -- submit route에 Slack 알림 추가 (REQ-001 의존)
4. **REQ-004 + REQ-006** -- Cron 엔드포인트 (REQ-001, REQ-003 의존)
5. **REQ-005** -- vercel.json Cron 설정 (REQ-004 의존)

## 신규/수정 파일 목록

| 파일 | 상태 | 설명 |
|------|------|------|
| `src/lib/slack.ts` | **신규** | Slack webhook 전송 + Block Kit 빌더 |
| `src/lib/__tests__/slack.test.ts` | **신규** | Slack 유틸 유닛테스트 |
| `src/app/api/diagnosis/submit/route.ts` | **수정** | 제출 성공 후 Slack 알림 추가 |
| `src/app/api/diagnosis/__tests__/submit-slack.test.ts` | **신규** | submit Slack 연동 테스트 |
| `src/app/api/cron/diagnosis-expiry/route.ts` | **신규** | Cron 만료 체크 엔드포인트 |
| `src/app/api/cron/__tests__/diagnosis-expiry.test.ts` | **신규** | Cron 엔드포인트 테스트 |
| `supabase/migrations/008_slack_notified_at.sql` | **신규** | slack_notified_at 컬럼 |
| `vercel.json` | **신규** | Vercel Cron 설정 |

## vercel.json 설정

```json
{
  "crons": [
    {
      "path": "/api/cron/diagnosis-expiry",
      "schedule": "0 * * * *"
    }
  ]
}
```

## Risks & Considerations

1. **Slack Webhook URL 노출 방지** -- 환경변수로만 관리, 절대 하드코드하지 않음. Vercel env에 저장.
2. **Cron 중복 실행** -- `slack_notified_at` 컬럼 + 트랜잭션적 업데이트로 방지. 동시 실행 시에도 UPDATE WHERE slack_notified_at IS NULL 조건으로 한 건만 처리.
3. **Slack API Rate Limit** -- Incoming Webhook은 분당 1회 제한 없음 (초당 1회 권장). 배치 알림으로 여러 만료 토큰을 하나의 메시지로 묶어 호출 횟수 최소화.
4. **Vercel Cron Free Plan 제한** -- Hobby 플랜은 일 1회만 가능. Pro 플랜 필요 (매시간 실행). 대안: 일 1회 실행으로 변경 시 `expires_at BETWEEN now - 24h AND now`로 변경.
5. **Fire-and-forget 패턴** -- submit route의 Slack 알림은 `.catch()` 처리. 실패해도 제출 응답에 영향 없음.
6. **시간대** -- 만료 시각 비교는 UTC 기준 (Supabase TIMESTAMPTZ). 메시지 표시는 KST(Asia/Seoul)로 포맷.

## Out of Scope

- Slack Interactive Components (버튼 클릭 시 액션)
- Slack App (Bot) 방식 -- Incoming Webhook으로 충분
- 이메일 알림 (Resend) -- Slack으로 대체
- 토큰 자동 재발급
- 관리자 알림 설정 UI (채널 선택 등)
