# 주간 비즈니스 현황 슬랙 자동 발송 (Vercel Cron)

## Overview

CRM 세일즈 통계의 전체/B2C/B2B 수치를 매주 월요일 오전 4시(KST)에
슬랙 `00_방향맞추기` 채널(`C07L25RNWCX`)로 자동 발송한다.
대상 기간은 **직전에 완결된 주차**(월~일), 주차 정의는 기존 `WEEK_DEFINITIONS`를 그대로 쓴다
(예: 2026-08-10 월요일 04:00 KST 발송 → `26년 08월 01주차` = 2026-08-03~08-09).

메시지 형식은 사용자와 합의된 형태다 — 표·이모지·해설 없이 세그먼트별 5줄:

```
비즈니스 현황 · 26년 08월 01주차
2026-08-03 ~ 08-09 · 금액 단위: 만원

전체
리드 17 → 컨택 8 (47.06%) → 결제 4명 (50%)
리드 구성: 인스타 9 · 그 외 8
총매출 3,370 (10건) · 환불 0 (0건)
순매출 3,370 · 순수익 3,033
최초결제 1,543 (5건) · 재결제 1,827 (5건)
```

`(N건)` 결제 건수는 현재 `/api/crm/stats`가 반환하지 않으므로 오버뷰에 추가한다.
퍼널의 `결제 N명`(코호트 전환 인원)과 매출의 `N건`(기간 내 결제 트랜잭션 수)은 다른 값이므로
단위(명/건)로 구분해 표기한다.

## Requirements

### REQ-001: stats 오버뷰에 결제 건수 추가
- **Priority**: Must
- **Description**: `/api/crm/stats` 응답 `overview`에 기간 내 결제 트랜잭션 건수 4개를 추가한다.
  `gross_count`(amount≥0 건수), `refund_count`(amount<0 건수),
  `first_payment_count`(최초결제·amount≥0), `repayment_count`(재결제·amount≥0).
  기존 금액 필드와 동일한 `paymentList`(segment 필터 적용 후)를 순회해 센다.
- **Acceptance Criteria**: 2026-08-03~08-09 `segment=all` 조회 시 `gross_count=10`, `refund_count=0`,
  `first_payment_count=5`, `repayment_count=5`. `segment=b2c`는 7/0/3/4, `segment=b2b`는 3/0/2/1.
- **Verification**: (TEST) 양수 2건·환불 1건 mock으로 각 카운트 확인 + segment별 분해가 금액과 같은 집합인지 확인

### REQ-002: 직전 완결 주차 계산
- **Priority**: Must
- **Description**: `src/lib/weekly-business-report.ts`에 `lastCompletedWeek(now: Date): WeekDef | null`를 만든다.
  `now`를 KST로 변환해 하루 전 날짜가 속한 주차를 반환한다(월요일 04:00 KST 실행 시 전주 월~일).
  단, 그 주차가 아직 끝나지 않았으면(종료일 ≥ KST 오늘) 한 주 앞을 반환한다 —
  크론 지연·재시도·수동 실행으로 다른 요일에 돌아도 진행 중인 주를 리포트하지 않게 한다.
  `WEEK_DEFINITIONS` 범위 밖이면 null.
- **Acceptance Criteria**: `2026-08-10T04:00+09:00` → `{label:'26년 08월 01주차', start:'2026-08-03', end:'2026-08-09'}`.
  `2026-08-17T04:00+09:00` → `26년 08월 02주차`(08-10~08-16). UTC 입력(`2026-08-09T19:00Z`)도 동일 결과.
  목요일(`2026-08-13`) 실행 시에도 진행 중인 08-10~08-16이 아니라 08-03~08-09를 반환.
- **Verification**: (TEST) 월요일 04:00 KST 3주 연속 + UTC 표기 입력 + 비월요일 실행 + 범위 밖 날짜(2030년) 케이스

### REQ-003: 슬랙 메시지 포맷터
- **Priority**: Must
- **Description**: 같은 파일에 `formatBusinessReport(week, segments)`를 만든다.
  `segments`는 `{ label, overview, igLeads, otherLeads }[]`(전체/B2C/B2B 순).
  금액은 만원 단위 반올림 + 천단위 구분, 퍼센트는 API 값 그대로, 환불은 음수면 `-143` 형태.
  이모지·해설 문구를 넣지 않는다.
- **Acceptance Criteria**: 전체 세그먼트 입력 시 위 Overview의 문자열과 정확히 일치.
  리드 0건 세그먼트도 0으로 표기되고 NaN·undefined가 나오지 않는다.
- **Verification**: (TEST) 실제 08월 01주차 수치로 기대 문자열 전체 비교 + 리드 0/결제 0 세그먼트 스냅샷

### REQ-004: 인스타 리드 분리
- **Priority**: Must
- **Description**: `by_source` 행 중 `source`에 `인스타`가 포함된 행의 `leads` 합을 인스타 리드로,
  나머지를 그 외 리드로 계산하는 `splitLeadsBySource(by_source)`를 제공한다.
  (현재 소스는 `인스타그램 광고` 단일이지만 향후 변형 라벨도 포함되게 부분일치를 쓴다.)
- **Acceptance Criteria**: `[{source:'인스타그램 광고',leads:9},{source:'소개',leads:8}]` → `{ig:9, other:8}`.
  인스타 소스가 없으면 `{ig:0, other:합계}`.
- **Verification**: (TEST) 인스타 단일·복수·부재 3케이스

### REQ-005: cron 라우트
- **Priority**: Must
- **Description**: `GET /api/cron/weekly-business-report`를 만든다.
  `CRON_SECRET` 검증(기존 `diagnosis-expiry`와 동일 패턴) → `lastCompletedWeek` 계산 →
  자기 도메인의 `/api/crm/stats`를 `x-admin-key: ADMIN_SECRET_KEY`로 all/b2c/b2b 3회 호출
  (origin은 `request.nextUrl.origin`, 기존 `weekly-plan` 라우트와 같은 방식) →
  `formatBusinessReport` → `chat.postMessage`로 `C07L25RNWCX`에 발송.
  주차 계산 실패·stats 조회 실패·슬랙 토큰 부재는 각각 로그를 남기고 발송하지 않는다(200 + 이유 반환).
- **Acceptance Criteria**: `CRON_SECRET` 불일치 → 401. 정상 실행 시 슬랙 fetch가 1회 호출되고
  본문 `channel`이 `C07L25RNWCX`, `text`에 주차 라벨과 세 세그먼트 라벨이 포함된다.
- **Verification**: (TEST) fetch mock으로 401/정상/stats 실패/토큰 부재 4케이스

### REQ-006: Vercel Cron 등록
- **Priority**: Must
- **Description**: `vercel.json` crons에 `{ path: '/api/cron/weekly-business-report', schedule: '0 19 * * 0' }`를 추가한다.
  Vercel cron은 UTC 기준이므로 일요일 19:00 UTC = 월요일 04:00 KST.
- **Acceptance Criteria**: `vercel.json`에 해당 항목이 있고 기존 `diagnosis-expiry` 크론은 그대로 유지된다.
- **Verification**: (TEST) vercel.json을 파싱해 두 크론의 path/schedule 검증

## Technical Design

### Architecture
- `src/app/api/crm/stats/route.ts` — `overview`에 카운트 4개 추가(기존 `paymentList` 루프 내에서 증가).
- `src/lib/weekly-business-report.ts` (신규, 순수 함수) — `lastCompletedWeek`, `splitLeadsBySource`,
  `formatBusinessReport`. Slack·Supabase 의존성 없음 → 단위 테스트로 전부 커버.
- `src/app/api/cron/weekly-business-report/route.ts` (신규) — 오케스트레이션만 담당
  (인증 → 주차 → stats 3회 → 포맷 → 슬랙 발송).
- `vercel.json` — 크론 1개 추가.
- 채널 ID는 라우트 상수로 둔다(`src/lib/slack-memo.ts`가 상담 채널을 상수로 두는 방식과 동일).

### Dependencies
없음. 기존 `WEEK_DEFINITIONS`, `/api/crm/stats`, `SLACK_BOT_TOKEN`, `CRON_SECRET`, `ADMIN_SECRET_KEY` 재사용.
Slack `chat.postMessage`만 사용하므로 `files:write` 스코프 불필요.

## Traceability Matrix

| REQ ID  | Description                | Verification | Test File                                              | Status  |
|---------|----------------------------|--------------|--------------------------------------------------------|---------|
| REQ-001 | stats 결제 건수 필드        | (TEST)       | `src/app/api/crm/stats/__tests__/route.test.ts`         | Done |
| REQ-002 | 직전 완결 주차 계산         | (TEST)       | `src/lib/__tests__/weekly-business-report.test.ts`      | Done |
| REQ-003 | 메시지 포맷터               | (TEST)       | `src/lib/__tests__/weekly-business-report.test.ts`      | Done |
| REQ-004 | 인스타/그외 리드 분리       | (TEST)       | `src/lib/__tests__/weekly-business-report.test.ts`      | Done |
| REQ-005 | cron 라우트                 | (TEST)       | `src/app/api/cron/weekly-business-report/__tests__/route.test.ts` | Done |
| REQ-006 | Vercel cron 등록            | (TEST)       | `src/app/api/cron/weekly-business-report/__tests__/route.test.ts` | Done |

## Implementation Order

1. REQ-002 · REQ-003 · REQ-004 — 순수 함수부터 (의존성 없음)
2. REQ-001 — 포맷터가 요구하는 카운트 필드를 API에 추가
3. REQ-005 — 앞의 결과를 조합하는 라우트
4. REQ-006 — 스케줄 등록 후 배포 확인

## Out of Scope

- 이미지/차트 발송 (`SLACK_BOT_TOKEN`에 `files:write` 스코프 없음)
- 여러 주차 트렌드 비교 — 이번엔 단일 주차만
- 발송 이력 DB 기록·중복 발송 방지 (주 1회 크론이라 중복 위험 낮음)
- CRM 화면의 `weekly` 주차 집계가 KST 미보정으로 어긋나는 별도 버그 (이번 작업은 기간 조회 방식만 사용)
