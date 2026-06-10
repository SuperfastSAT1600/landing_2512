# 마케팅 대시보드 (Marketing Dashboard)

## Overview

리드 유입 소스를 5개 그룹(네이버 SEO / 구글 SEO / META / 소개 / B2B)으로 집계해
날짜 범위별 **인입 수, 컨택 성공률, 결제 전환율, 매출**을 한눈에 보고,
META·구글 SEO 채널에 광고비를 입력하면 **ROI / ROAS**를 즉시 계산하는 어드민 메뉴.

기존 `/admin/crm` 의 `stats` 탭을 대체하지 않고, 별도 페이지 `/admin/marketing`으로 추가.

---

## Requirements

### REQ-001: 소스 그룹 매핑 상수 정의
- **Priority**: Must
- **Description**: `traffic_source` 12개 값을 5개 마케팅 그룹에 매핑하는 상수를 `src/lib/marketing-groups.ts`에 정의
- **Acceptance Criteria**:
  - `네이버 블로그`, `네이버 카페` → `네이버 SEO`
  - `(구)랜딩페이지`, `튜터링 랜딩페이지`, `공식 블로그`, `브런치`, `레딧` → `구글 SEO`
  - `인스타그램 오가닉`, `인스타그램 광고` → `META`
  - `소개/추천`, `책` → `소개`
  - `B2B 파트너` → `B2B`
  - `null` / 미분류 → `미분류` (그룹 합계에서 별도 집계)
- **Verification**: (TEST) 12개 source 값 전부 올바른 그룹에 매핑되는지 단위 테스트

### REQ-002: ad_spend Supabase 테이블 및 타입
- **Priority**: Must
- **Description**: 일별 채널 광고비를 저장하는 `marketing_ad_spend` 테이블 생성 마이그레이션 + TypeScript 타입
- **Acceptance Criteria**:
  - 컬럼: `id` (uuid PK), `date` (date), `channel_group` (text: 'META' | '구글 SEO'), `amount` (integer, 원 단위), `note` (text nullable), `created_at`, `updated_at`
  - `(date, channel_group)` unique constraint
  - `src/types/marketing.ts`에 `AdSpend`, `MarketingGroup`, `MarketingGroupStats`, `MarketingDailyRow` 타입 정의
- **Verification**: (TEST) 타입 import 에러 없음, 마이그레이션 파일 존재

### REQ-003: 마케팅 통계 API — GET /api/crm/marketing/stats
- **Priority**: Must
- **Description**: 날짜 범위를 받아 그룹별 + 날짜별 집계 반환
- **Acceptance Criteria**:
  - Query params: `from` (YYYY-MM-DD), `to` (YYYY-MM-DD)
  - `students` 테이블에서 `inquiry_date` 기준 필터, `traffic_source` 기준 그룹핑
  - 기존 `isContacted()` 로직 재사용해 컨택 성공률 계산
  - `payments` 테이블 조인으로 결제 건수 / 매출 집계
  - 응답:
    ```json
    {
      "groups": [
        {
          "group": "META",
          "leads": 45,
          "contacted": 28,
          "contact_rate": 0.622,
          "paid": 6,
          "conversion_rate": 0.133,
          "revenue": 4200000,
          "sources": [
            { "source": "인스타그램 광고", "leads": 38, ... },
            { "source": "인스타그램 오가닉", "leads": 7, ... }
          ]
        }
      ],
      "daily": [
        { "date": "2026-05-01", "group": "META", "leads": 3 }
      ]
    }
    ```
  - x-admin-key 인증 필수
- **Verification**: (TEST) mock Supabase로 집계 결과 검증

### REQ-004: 광고비 CRUD API — /api/crm/marketing/ad-spend
- **Priority**: Must
- **Description**: 광고비 조회/추가/수정
- **Acceptance Criteria**:
  - `GET /api/crm/marketing/ad-spend?from=&to=` → 기간 내 모든 광고비 레코드 배열 반환
  - `POST /api/crm/marketing/ad-spend` body `{ date, channel_group, amount, note }` → upsert (date+channel_group unique)
  - x-admin-key 인증 필수
  - amount는 양의 정수 (원 단위) 검증
- **Verification**: (TEST) upsert 로직, 인증 실패 401 반환

### REQ-005: 마케팅 대시보드 페이지 — /admin/marketing
- **Priority**: Must
- **Description**: 날짜 범위 선택 + 5개 그룹 카드 + 드릴다운 UI
- **Acceptance Criteria**:
  - 상단: 날짜 범위 선택기 (기본값: 최근 30일), 적용 버튼
  - 5개 그룹 카드 (각 카드):
    - 그룹명 + 아이콘
    - 인입 수, 컨택 성공률(%), 결제 전환율(%), 매출(원)
    - 유료 채널(META, 구글 SEO)에 한해 ROI(%) / ROAS(x) 표시
  - 카드 클릭 → 드릴다운 패널 열림 (같은 페이지, 슬라이드인 또는 아코디언)
  - 드릴다운 패널: 해당 그룹의 개별 소스별 동일 지표 테이블
  - 미분류(null) 리드는 페이지 하단 별도 카드로 표시
- **Verification**: (BROWSER) 날짜 변경 시 카드 수치 업데이트 확인, 드릴다운 정상 동작 확인

### REQ-006: 광고비 입력 UI
- **Priority**: Must
- **Description**: META / 구글 SEO 그룹 카드에서 일별 광고비를 입력할 수 있는 인터페이스
- **Acceptance Criteria**:
  - 날짜 선택기 + 금액 입력 + 저장 버튼
  - 저장 성공 시 해당 그룹 카드의 ROI / ROAS 즉시 재계산
  - ROI = (매출 − 광고비 합계) / 광고비 합계 × 100 (%)
  - ROAS = 매출 / 광고비 합계 (배수)
  - 기간 내 날짜별 광고비 소계도 카드 하단에 표시 ("이 기간 광고비 합계: 1,200,000원")
- **Verification**: (BROWSER) 광고비 입력 후 ROI/ROAS 숫자 업데이트 확인

### REQ-007: 날짜별 트렌드 차트
- **Priority**: Should
- **Description**: 선택 기간 동안 일별 그룹별 리드 인입 추이를 스택 바 차트로 시각화
- **Acceptance Criteria**:
  - x축: 날짜, y축: 리드 수
  - 5개 그룹을 다른 색으로 스택
  - 범례 클릭으로 그룹 토글 가능
  - 차트 라이브러리: 기존 프로젝트 의존성 확인 후 `recharts` 사용 (없으면 설치)
- **Verification**: (BROWSER) 기간 변경 시 차트 데이터 업데이트

### REQ-008: 어드민 사이드바 네비게이션 추가
- **Priority**: Must
- **Description**: `src/app/admin/layout.tsx`의 `NAV_ITEMS`에 마케팅 메뉴 추가
- **Acceptance Criteria**:
  - `{ href: '/admin/marketing', label: '마케팅', icon: '📣' }` CRM 아이템 바로 아래에 추가
  - 현재 경로 활성화 하이라이트 정상 동작
- **Verification**: (BROWSER) 사이드바에서 마케팅 링크 클릭 → /admin/marketing 진입

---

## Technical Design

### Architecture

```
src/
├── app/
│   ├── admin/
│   │   ├── layout.tsx                        # REQ-008: nav item 추가
│   │   └── marketing/
│   │       └── page.tsx                      # REQ-005, REQ-006, REQ-007
│   └── api/crm/marketing/
│       ├── stats/route.ts                    # REQ-003
│       └── ad-spend/route.ts                 # REQ-004
├── lib/
│   └── marketing-groups.ts                   # REQ-001: SOURCE_GROUP_MAP, GROUP_LABELS
└── types/
    └── marketing.ts                          # REQ-002: 타입 정의

supabase/migrations/
└── YYYYMMDDHHMMSS_create_marketing_ad_spend.sql  # REQ-002
```

### Source Group Mapping

```typescript
// src/lib/marketing-groups.ts
export const MARKETING_GROUPS = ['네이버 SEO', '구글 SEO', 'META', '소개', 'B2B'] as const;
export type MarketingGroup = typeof MARKETING_GROUPS[number] | '미분류';
export const PAID_GROUPS: MarketingGroup[] = ['META', '구글 SEO'];

export const SOURCE_GROUP_MAP: Record<string, MarketingGroup> = {
  '네이버 블로그': '네이버 SEO',
  '네이버 카페': '네이버 SEO',
  '(구)랜딩페이지': '구글 SEO',
  '튜터링 랜딩페이지': '구글 SEO',
  '공식 블로그': '구글 SEO',
  '브런치': '구글 SEO',
  '레딧': '구글 SEO',
  '인스타그램 오가닉': 'META',
  '인스타그램 광고': 'META',
  '소개/추천': '소개',
  '책': '소개',
  'B2B 파트너': 'B2B',
};
```

### ROI / ROAS Formulas

```
총 광고비 = 선택 기간 내 해당 그룹의 ad_spend.amount 합산
ROAS     = 매출 / 총 광고비                  (소수점 2자리, ex: 3.42x)
ROI      = (매출 − 총 광고비) / 총 광고비 × 100  (%, ex: +242%)
```

광고비가 0이면 ROI/ROAS 셀은 "—" 표시.

### Stats API — 데이터 흐름

1. `students` 조회: `inquiry_date BETWEEN from AND to` + `traffic_source`
2. `SOURCE_GROUP_MAP`으로 그룹 분류
3. `isContacted()` 로직 (기존 `/api/crm/stats/route.ts`에서 재사용) → contact_rate
4. `payments` 테이블 조인 → 결제 건수, 매출(환불 차감)
5. 일별 집계: `GROUP BY inquiry_date, group`

### Dependencies

- `recharts` (트렌드 차트용) — package.json 미존재 시 설치
- 기존: `supabaseAdmin`, `isAuthenticated`, `isContacted` 재사용

---

## Traceability Matrix

| REQ ID  | Description                  | Verification | Test File                                      | Status  |
|---------|------------------------------|--------------|------------------------------------------------|---------|
| REQ-001 | 소스 그룹 매핑 상수           | (TEST)       | `src/__tests__/marketing-groups.test.ts`       | Pending |
| REQ-002 | ad_spend 테이블 + 타입        | (TEST)       | `src/__tests__/marketing-types.test.ts`        | Pending |
| REQ-003 | 마케팅 통계 API               | (TEST)       | `src/__tests__/api/marketing-stats.test.ts`    | Pending |
| REQ-004 | 광고비 CRUD API               | (TEST)       | `src/__tests__/api/marketing-ad-spend.test.ts` | Pending |
| REQ-005 | 마케팅 대시보드 페이지         | (BROWSER)    | e2e/marketing-dashboard.spec.ts                | Pending |
| REQ-006 | 광고비 입력 UI + ROI/ROAS     | (BROWSER)    | e2e/marketing-dashboard.spec.ts                | Pending |
| REQ-007 | 날짜별 트렌드 차트             | (BROWSER)    | e2e/marketing-dashboard.spec.ts                | Pending |
| REQ-008 | 사이드바 네비게이션 추가       | (BROWSER)    | e2e/marketing-dashboard.spec.ts                | Pending |

---

## Implementation Order

1. **REQ-001** — 다른 모든 코드가 이 매핑에 의존
2. **REQ-002** — 타입 정의와 마이그레이션 (API 전에 필요)
3. **REQ-008** — 사이드바 nav 추가 (독립적, 빠름)
4. **REQ-003** — 통계 API (UI보다 먼저)
5. **REQ-004** — 광고비 API (UI보다 먼저)
6. **REQ-005** — 대시보드 페이지 기본 UI
7. **REQ-006** — 광고비 입력 + ROI/ROAS (REQ-004, REQ-005 완료 후)
8. **REQ-007** — 트렌드 차트 (나머지 완료 후 추가)

---

## Out of Scope

- META / 구글 ads API 자동 연동 (광고비는 수동 입력)
- 채널별 A/B/C tier 분포 분석 (Phase 2)
- 이메일/슬랙 주간 리포트 발송
- 멀티터치 어트리뷰션 모델
