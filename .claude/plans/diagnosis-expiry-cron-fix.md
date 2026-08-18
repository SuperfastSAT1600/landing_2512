# Diagnosis Expiry Cron Fix

## Feature Overview
진단 토큰 만료 슬랙 알림이 오지 않는 버그 수정.

**증상**: 토큰 960581, 2026-04-12 23:59 KST 만료, 2026-04-13 09:00 KST에 슬랙 알림 없음.

**의심 원인 (우선순위 순)**:
1. `SLACK_WEBHOOK_URL` 환경변수가 Vercel production에 설정되지 않음 (silent fail)
2. 24h 윈도우가 크론 실행 타이밍에 따라 토큰을 놓칠 수 있음
3. 크론이 Vercel에서 아예 실행되지 않음 (로그 부재로 확인 불가)
4. `is_active = false`로 토큰 상태가 바뀐 경우

## Requirements

### REQ-001: 환경변수 미설정 시 명시적 오류 반환
- **Description**: `SLACK_WEBHOOK_URL` 미설정 시 경고만 하고 silently return하지 않고, cron response에 명시적으로 기록
- **Verification**: (MANUAL)
- **Priority**: Must

### REQ-002: 48h 윈도우로 확장
- **Description**: 24h → 48h 윈도우로 변경해 크론이 하루 빠졌을 때도 토큰을 잡음
- **Verification**: (MANUAL)
- **Priority**: Must

### REQ-003: 크론 응답에 디버깅 정보 포함
- **Description**: 쿼리 결과 상세 정보 (total found, filtered out by submission, skipped reason) 를 response body에 포함
- **Verification**: (MANUAL)
- **Priority**: Must

### REQ-004: `is_active` 필터 제거
- **Description**: 만료된 토큰은 `is_active` 상태와 무관하게 알림 대상. 현재 validate-token은 만료 시 is_active를 false로 바꾸지 않지만, 어드민이 수동으로 바꿀 수 있음
- **Verification**: (MANUAL)
- **Priority**: Should

## Implementation Steps

Step 1: `src/app/api/cron/diagnosis-expiry/route.ts` 수정
- 24h → 48h 윈도우
- `is_active` 필터 제거 (expires_at만으로 판단)
- 응답에 디버그 정보 포함
- SLACK_WEBHOOK_URL 체크를 response에 포함

## Risks
- 48h 윈도우로 중복 알림 가능성 → `slack_notified_at` 가드가 이미 있으므로 안전
- `is_active = false` 토큰을 알리면 의도적으로 비활성화한 케이스도 포함 → 수용 가능 (어드민이 판단)
