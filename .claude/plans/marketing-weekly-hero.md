# 마케팅 대시보드 — 주간 헬스체크 (Layer 1 + Layer 2)

## Overview

마케팅 페이지 최상단에 "이번 주 상태"를 즉시 판정해주는 Hero 위젯(Layer 1)과,
채널별 역사적 기대치 대비 이번 주 실적 비교 테이블(Layer 2)을 추가한다.
기존 그룹 카드·차트(Layer 3)는 그대로 유지하되 아래로 밀린다.

---

## Requirements

### REQ-001: 주간 집계 API — GET /api/crm/marketing/weekly
- **Priority**: Must
- **Description**: 이번 주 / 작년 동기 / 최근 12주 채널별 평균을 한 번에 반환하는 API
- **Acceptance Criteria**:
  - Query param 없이 호출 시 현재 ISO 주차(월~일) 자동 적용
  - `this_week`: 이번 주(월요일 ~ 오늘) 그룹별 leads 집계
  - `yoy_week`: 작년 동일 ISO 주차(월~일 전체) 그룹별 leads 집계
  - `hist_weekly_avg`: 최근 12개 완료된 주차의 그룹별 평균 leads (소수점 1자리)
  - `week_label`: "2026년 24주차" 형식 문자열
  - `days_elapsed`: 이번 주에서 오늘까지 경과 일수 (월=1 ~ 일=7)
  - `weekly_target`: 35 (상수, 향후 설정 가능하도록 분리)
  - x-admin-key 인증 필수
- **Verification**: (TEST) 주차 계산, YoY 매핑, 12주 평균 계산 단위 테스트

### REQ-002: Hero 위젯 — Layer 1
- **Priority**: Must
- **Description**: 페이지 최상단에 이번 주 리드 현황을 한눈에 보여주는 위젯
- **Acceptance Criteria**:
  - 이번 주 총 인입 수 / 목표(35) 진척도 바 표시
  - 진척도 바 색상: 목표의 70% 미만 🔴, 70~99% 🟡, 100%+ 🟢
  - 페이스 예측: `(이번 주 실적 / days_elapsed) * 7` → 소수점 버림, "주말까지 예상 N개"
  - YoY 한 줄 비교: "작년 동기(N주차): M개 → 현재 K개 (+X%)" 형식
  - YoY 데이터 없으면 "작년 데이터 없음"으로 graceful fallback
  - 주차 레이블 표시 ("2026년 24주차 · 화요일 기준")
- **Verification**: (BROWSER) 월요일~일요일 각 시점 시뮬레이션, YoY 증감 표시 확인

### REQ-003: 채널별 기대치 vs 실적 테이블 — Layer 2
- **Priority**: Must
- **Description**: Hero 위젯 바로 아래, 채널별 🔴🟡🟢 판정과 기대치 비교
- **Acceptance Criteria**:
  - 5개 그룹 행: 그룹명 | 이번 주 실적 | 기대치(12주 평균) | 차이(+/-) | 판정
  - 판정 기준:
    - 🟢: 실적 ≥ 기대치 × 0.9
    - 🟡: 기대치 × 0.5 ≤ 실적 < 기대치 × 0.9
    - 🔴: 실적 < 기대치 × 0.5
  - 기대치가 0이면(신규 채널) 판정 없이 "—" 표시
  - 기대치 출처 표시: "(최근 12주 평균)"
  - 이번 주 실적이 없는 채널도 행으로 표시 (0개)
- **Verification**: (BROWSER) 각 판정 임계값 경계에서 색상 전환 확인

---

## Technical Design

### ISO 주차 계산

```typescript
// ISO 8601: 월요일 시작
function getISOWeekBounds(date: Date): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getUTCDay() || 7; // 일=7로 변환
  d.setUTCDate(d.getUTCDate() - day + 1); // 이번 주 월요일
  const start = d.toISOString().slice(0, 10);
  d.setUTCDate(d.getUTCDate() + 6); // 이번 주 일요일
  const end = d.toISOString().slice(0, 10);
  return { start, end };
}

function getISOWeekNumber(date: Date): number { /* ISO 주차 계산 */ }
```

### YoY 매핑

작년 동일 ISO 주차 → 해당 주 월~일 날짜 범위로 쿼리

### 최근 12주 평균

- 이번 주 제외, 직전 12개 완료 주차의 그룹별 리드 합산 / 12
- 주차별 → 그룹별 집계 후 평균

### 파일 구조

```
src/app/api/crm/marketing/weekly/route.ts    # REQ-001 신규
src/app/admin/marketing/page.tsx             # REQ-002, REQ-003 수정
src/__tests__/marketing-weekly.test.ts       # REQ-001 테스트
```

---

## Traceability Matrix

| REQ ID  | Description              | Verification | Test File                                    | Status  |
|---------|--------------------------|--------------|----------------------------------------------|---------|
| REQ-001 | 주간 집계 API             | (TEST)       | `src/__tests__/marketing-weekly.test.ts`     | Pending |
| REQ-002 | Hero 위젯                 | (BROWSER)    | e2e/marketing-weekly.spec.ts                 | Pending |
| REQ-003 | 채널별 기대치 vs 실적 테이블 | (BROWSER)  | e2e/marketing-weekly.spec.ts                 | Pending |

## Implementation Order

1. REQ-001 — API 먼저 (UI가 의존)
2. REQ-002 — Hero 위젯
3. REQ-003 — Layer 2 테이블 (REQ-001 데이터 재사용)

## Out of Scope

- 주간 목표(35) 설정 UI (하드코딩)
- 계절 밴드 (데이터 2년 이상 필요)
- 주차별 상세 드릴다운
