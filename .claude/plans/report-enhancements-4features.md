# 진단테스트 + 리포트 4가지 기능 개선

## Feature Overview

4개의 독립적인 기능을 한 번에 구현한다.

1. **학생별 시험 시간 설정** — 어드민이 코드 생성 시 학생마다 시험 시간(분)을 지정. 리포트 통계도 해당 시간 기준으로 반영.
2. **Submit 후 View Report 버튼 제거** — 시험 완료 화면에서 리포트 링크 삭제.
3. **Key Recommendations 인사이트 편집** — 어드민 인사이트 편집 페이지에서 권장사항 목록도 수정 가능.
4. **할인 쿠폰 발행 + 리포트 카운트다운** — 어드민이 할인율과 만료 시간을 설정하면 리포트 하단에 카운트다운 쿠폰이 표시됨.

---

## Requirements

### REQ-001: 어드민 코드 생성 폼에 시험 시간 입력 추가 (BROWSER)
- **Description**: `GenerateTokenTab.tsx`의 코드 생성 폼에 `시험 시간 (분)` 숫자 입력 필드 추가. 기본값 30분, 10분~180분 범위.
- **Verification**: (BROWSER)
- **Priority**: Must

### REQ-002: 시험 시간을 토큰 DB에 저장 (TEST)
- **Description**: `diagnostic_access_tokens` 테이블에 `time_limit_minutes INTEGER NOT NULL DEFAULT 30` 컬럼 추가. POST 토큰 생성 API가 해당 값을 저장.
- **Verification**: (TEST)
- **Priority**: Must

### REQ-003: validate-token API 응답에 timeLimitMinutes 포함 (TEST)
- **Description**: `GET /api/diagnosis/validate-token` 응답에 `timeLimitMinutes` 필드 추가. 학생 페이지가 이 값을 받아 테스트에 전달.
- **Verification**: (TEST)
- **Priority**: Must

### REQ-004: DiagnosticTestView에 동적 시험 시간 적용 (BROWSER)
- **Description**: 현재 `testData.timeLimit`(고정 30분)를 `timeLimitMinutes` prop으로 override. 타이머가 해당 시간부터 카운트다운.
- **Verification**: (BROWSER)
- **Priority**: Must

### REQ-005: 리포트 behavioral 인사이트에서 시험 시간 기준 반영 (TEST)
- **Description**: `generateBehavioralInsight()`의 pacing 판단 기준(`avgTime > 90`초 등)은 전체 문제수와 허용 시간으로 계산. 현재 SAT 기준(`90초`) 대신 `(timeLimitSeconds / totalQuestions)`을 `allowedSecondsPerQuestion`으로 사용하도록 수정. API `/api/reports/[resultId]`에서 토큰의 `time_limit_minutes` 조회 후 응답에 포함.
- **Verification**: (TEST)
- **Priority**: Must

### REQ-006: Submit 후 View Your Report 버튼 제거 (BROWSER)
- **Description**: `TestSubmittedScreen` 컴포넌트에서 `{resultId && <Link href={/reports/${resultId}}>View Your Report</Link>}` 블록 제거. 완료 메시지와 안내 문구만 남김.
- **Verification**: (BROWSER)
- **Priority**: Must

### REQ-007: 어드민 인사이트 편집 - Key Recommendations 수정 가능 (BROWSER)
- **Description**: `src/app/admin/reports/[resultId]/insights/page.tsx`에 keyRecommendations 편집 UI 추가. 각 항목을 textarea로 표시, 항목 추가(+) / 삭제(×) 버튼 제공. 순서 변경은 선택사항.
- **Verification**: (BROWSER)
- **Priority**: Must

### REQ-008: keyRecommendations가 PATCH API를 통해 DB에 저장됨 (TEST)
- **Description**: 기존 `PATCH /api/admin/diagnosis/results/[id]/insights`는 이미 `keyRecommendations: string[]`을 처리하므로 merge-insights.ts 측 수정 불필요. 프론트에서 배열을 그대로 전송.
- **Verification**: (TEST)
- **Priority**: Must

### REQ-009: 어드민 인사이트 편집 - 할인 쿠폰 섹션 추가 (BROWSER)
- **Description**: 어드민 인사이트 편집 페이지 하단에 "할인 쿠폰 설정" 섹션 추가.
  - 할인율 입력 (1~100%)
  - 만료일시 입력 (datetime-local)
  - 저장 버튼 (기존 Save와 별도 or 통합)
  - 쿠폰이 설정되면 현재 쿠폰 정보 표시
- **Verification**: (BROWSER)
- **Priority**: Must

### REQ-010: 할인 쿠폰 데이터를 DB에 저장 (TEST)
- **Description**: `diagnostic_test_results` 테이블에 `coupon JSONB DEFAULT NULL` 컬럼 추가.
  ```json
  {
    "discountPercent": 20,
    "expiresAt": "2026-03-15T23:59:59Z"
  }
  ```
  별도 PATCH 엔드포인트 `PATCH /api/admin/diagnosis/results/[id]/coupon` 또는 기존 insights PATCH에 통합.
- **Verification**: (TEST)
- **Priority**: Must

### REQ-011: 리포트 하단에 쿠폰 카운트다운 컴포넌트 표시 (BROWSER)
- **Description**: 쿠폰 데이터가 있고 아직 만료되지 않은 경우, 리포트 footer 직전에 `CouponCountdown` 컴포넌트 렌더링.
  - 할인율(예: `20% OFF`) 표시
  - 남은 시간 카운트다운 (`D day HH:MM:SS` 또는 `XX시간 YY분 ZZ초`)
  - 만료 후에는 컴포넌트 숨김 (쿠폰 사라짐)
  - 클라이언트 컴포넌트 (`'use client'`, `setInterval` 사용)
- **Verification**: (BROWSER)
- **Priority**: Must

### REQ-012: 리포트 API가 쿠폰 데이터를 응답에 포함 (TEST)
- **Description**: `GET /api/reports/[resultId]` 응답에 `coupon: { discountPercent, expiresAt } | null` 추가.
- **Verification**: (TEST)
- **Priority**: Must

---

## Traceability Matrix

| REQ ID  | Description | Verification | Location |
|---------|-------------|-------------|----------|
| REQ-001 | 어드민 시험 시간 입력 필드 | (BROWSER) | GenerateTokenTab.tsx |
| REQ-002 | time_limit_minutes DB 저장 | (TEST) | migrations/006_time_limit.sql + tokens/route.ts |
| REQ-003 | validate-token에 timeLimitMinutes 포함 | (TEST) | validate-token/route.ts |
| REQ-004 | 동적 시험 시간 타이머 적용 | (BROWSER) | DiagnosticTestView.tsx, diagnosis/page.tsx |
| REQ-005 | 리포트 behavioral 기준 동적 적용 | (TEST) | report-insights.ts, reports/[resultId]/route.ts |
| REQ-006 | View Report 버튼 제거 | (BROWSER) | TestSubmittedScreen 컴포넌트 |
| REQ-007 | Key Recommendations 편집 UI | (BROWSER) | admin/reports/[resultId]/insights/page.tsx |
| REQ-008 | Key Recommendations PATCH 저장 | (TEST) | admin/diagnosis/results/[id]/insights/route.ts |
| REQ-009 | 어드민 쿠폰 설정 UI | (BROWSER) | admin/reports/[resultId]/insights/page.tsx |
| REQ-010 | 쿠폰 DB 저장 | (TEST) | migrations/007_coupon.sql + coupon route |
| REQ-011 | 리포트 쿠폰 카운트다운 UI | (BROWSER) | reports/[resultId]/components/CouponCountdown.tsx |
| REQ-012 | 리포트 API 쿠폰 포함 | (TEST) | reports/[resultId]/route.ts |

---

## Implementation Steps

### Step 1: DB 마이그레이션 (REQ-002, REQ-010)
**신규 파일**: `supabase/migrations/006_time_limit_and_coupon.sql`
```sql
-- 학생별 시험 시간
ALTER TABLE diagnostic_access_tokens
  ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER NOT NULL DEFAULT 30;

-- 결과에 쿠폰 정보
ALTER TABLE diagnostic_test_results
  ADD COLUMN IF NOT EXISTS coupon JSONB DEFAULT NULL;
```
**Dependencies**: 없음
**Complexity**: Low
**Note**: 수동으로 Supabase에서 실행 후 진행

---

### Step 2: View Your Report 버튼 제거 (REQ-006)
**수정 파일**: `TestSubmittedScreen.tsx` 또는 `DiagnosticTestView.tsx` 내 submit 완료 UI
- `resultId && <Link ...>View Your Report</Link>` 블록 제거
- 완료 안내 문구("답안이 제출되었습니다" 등)만 남김
**Dependencies**: 없음
**Complexity**: Low

---

### Step 3: 어드민 코드 생성 - 시험 시간 필드 추가 (REQ-001, REQ-002)
**수정 파일**: `src/app/admin/diagnosis/components/GenerateTokenTab.tsx`
- `timeLimitMinutes` state 추가 (기본값: 30)
- 폼에 숫자 입력 필드 추가: `시험 시간 (분)`, min=10, max=180, step=5
- POST body에 `timeLimitMinutes` 추가

**수정 파일**: `src/app/api/admin/diagnosis/tokens/route.ts`
- 요청 body에서 `timeLimitMinutes` 읽기 (기본값 30)
- DB insert에 `time_limit_minutes: timeLimitMinutes` 추가

**Dependencies**: Step 1 완료
**Complexity**: Low

---

### Step 4: validate-token API 수정 (REQ-003)
**수정 파일**: `src/app/api/diagnosis/validate-token/route.ts`
- `diagnostic_access_tokens` 조회 시 `time_limit_minutes` select에 추가
- 응답에 `timeLimitMinutes: tokenData.time_limit_minutes` 포함

**Dependencies**: Step 1 완료
**Complexity**: Low

---

### Step 5: 학생 진단 페이지 - timeLimitMinutes 전달 (REQ-004)
**수정 파일**: `src/app/diagnosis/page.tsx`
- `timeLimitMinutes` state 추가 (기본값 30)
- `handleSubmit` 성공 시 `setTimeLimitMinutes(data.timeLimitMinutes ?? 30)` 저장
- `DiagnosticTestView`에 `timeLimitMinutes={timeLimitMinutes}` prop 전달

**수정 파일**: `src/app/diagnosis/components/DiagnosticTestView.tsx`
- `timeLimitMinutes?: number` prop 추가
- `useTestTimer` 호출 시 `testData.timeLimit`을 `(timeLimitMinutes ?? 30) * 60`으로 override

**Dependencies**: Step 4 완료
**Complexity**: Low-Medium

---

### Step 6: 리포트 API - 시험 시간 기준 + 쿠폰 포함 (REQ-005, REQ-012)
**수정 파일**: `src/app/api/reports/[resultId]/route.ts`
- 결과 조회 시 `token_id`(또는 join)를 통해 `time_limit_minutes` 조회
  - 현재 `diagnostic_test_results`에는 token 참조가 없음. 두 가지 옵션:
    - **A (권장)**: `diagnostic_test_results`에 `time_limit_minutes INTEGER` 컬럼 추가하고 submit 시 저장
    - **B**: token 코드를 result에 저장하고 join
  - **Option A 선택**: submit API에서 token의 `time_limit_minutes`를 읽어 result에 저장
- 응답에 `timeLimitMinutes: result.time_limit_minutes ?? 30` 추가
- 응답에 `coupon: result.coupon ?? null` 추가

**수정 파일**: `supabase/migrations/006_time_limit_and_coupon.sql` (추가)
```sql
ALTER TABLE diagnostic_test_results
  ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER NOT NULL DEFAULT 30;
```

**수정 파일**: `src/app/api/diagnosis/submit/route.ts` (또는 submit 처리 위치)
- token에서 `time_limit_minutes` 읽어서 result insert에 포함

**Dependencies**: Step 1, Step 4 완료
**Complexity**: Medium

---

### Step 7: 리포트 인사이트 - 동적 시험 시간 반영 (REQ-005)
**수정 파일**: `src/lib/report-insights.ts`
- `generateBehavioralInsight(questionDetails, timeLimitMinutes?: number)` 시그니처 변경
- 현재 `if (avgTime > 90)` 기준을 `const avgAllowedSeconds = (timeLimitMinutes * 60) / totalQuestions` 로 대체
  - `avgTime > avgAllowedSeconds * 1.2` → 느린 페이스
  - `avgTime < avgAllowedSeconds * 0.5` → 빠른 페이스
- `generateAllInsights(sections, questionDetails, savedWords, timeLimitMinutes?)` 시그니처 업데이트

**수정 파일**: `src/app/api/reports/[resultId]/route.ts`
- `generateAllInsights(...)` 호출에 `timeLimitMinutes` 전달

**Dependencies**: Step 6 완료
**Complexity**: Low-Medium

---

### Step 8: Key Recommendations 편집 UI (REQ-007, REQ-008)
**수정 파일**: `src/app/admin/reports/[resultId]/insights/page.tsx`
- `form.keyRecommendations: string[]` state 관리
- 초기값: `editedInsights?.keyRecommendations ?? aiInsights.keyRecommendations`
- UI: 각 항목을 `<textarea>` + 삭제(×) 버튼으로 표시
- 하단에 "항목 추가 +" 버튼 → 빈 string 추가
- 기존 Save 버튼이 keyRecommendations도 함께 전송
- "AI 초안으로 되돌리기" → `aiInsights.keyRecommendations`로 reset

**Dependencies**: 없음 (기존 PATCH API가 이미 keyRecommendations를 처리함)
**Complexity**: Medium

---

### Step 9: 할인 쿠폰 - 어드민 설정 UI (REQ-009, REQ-010)
**수정 파일**: `src/app/admin/reports/[resultId]/insights/page.tsx`
- `coupon: { discountPercent: number; expiresAt: string } | null` state 추가
- 폼 하단에 "할인 쿠폰 설정" 카드 추가:
  - 할인율 입력 (input[type="number"], 1~100)
  - 만료일시 (input[type="datetime-local"])
  - "쿠폰 적용" 저장 버튼
  - 현재 설정된 쿠폰 표시 + "쿠폰 제거" 버튼

**신규 파일**: `src/app/api/admin/diagnosis/results/[id]/coupon/route.ts`
```
PATCH /api/admin/diagnosis/results/[id]/coupon
Body: { discountPercent: number, expiresAt: string } | { remove: true }
```
- `diagnostic_test_results.coupon`을 JSONB로 저장
- Auth: `isAuthenticated(request)`

**신규 파일 (대안)**: 기존 insights PATCH에 통합도 가능하지만 관심사 분리를 위해 별도 라우트 권장

**Dependencies**: Step 1 완료
**Complexity**: Medium

---

### Step 10: 리포트 쿠폰 카운트다운 컴포넌트 (REQ-011, REQ-012)
**신규 파일**: `src/app/reports/[resultId]/components/CouponCountdown.tsx`
```tsx
'use client';
// Props: discountPercent: number, expiresAt: string
// State: remaining seconds (via setInterval, 1s tick)
// Display:
//   - 만료 전: "특별 할인 {N}% OFF" + 카운트다운 (D일 HH:MM:SS)
//   - 만료 후: null (렌더링 안 함)
// useEffect cleanup: clearInterval on unmount
```

**수정 파일**: `src/app/reports/[resultId]/page.tsx`
- `data.coupon`이 있고 `expiresAt`이 미래이면 `<CouponCountdown>` 렌더링
- footer 직전 위치에 삽입

**Dependencies**: Step 9 완료
**Complexity**: Medium

---

## 수정 대상 파일 요약

| 파일 | 변경 내용 | REQs |
|------|-----------|------|
| `supabase/migrations/006_time_limit_and_coupon.sql` | 신규 (4개 ALTER TABLE) | REQ-002, REQ-010 |
| `src/app/admin/diagnosis/components/GenerateTokenTab.tsx` | timeLimitMinutes 필드 추가 | REQ-001 |
| `src/app/api/admin/diagnosis/tokens/route.ts` | time_limit_minutes 저장 | REQ-002 |
| `src/app/api/diagnosis/validate-token/route.ts` | timeLimitMinutes 응답 포함 | REQ-003 |
| `src/app/diagnosis/page.tsx` | timeLimitMinutes state + prop 전달 | REQ-004 |
| `src/app/diagnosis/components/DiagnosticTestView.tsx` | timeLimitMinutes prop으로 타이머 override | REQ-004 |
| `TestSubmittedScreen` (DiagnosticTestView 내부 or 별도 파일) | View Report 버튼 제거 | REQ-006 |
| `src/app/api/diagnosis/submit/route.ts` | time_limit_minutes를 results에 저장 | REQ-005 |
| `src/app/api/reports/[resultId]/route.ts` | timeLimitMinutes, coupon 응답 포함 | REQ-005, REQ-012 |
| `src/lib/report-insights.ts` | behavioral insight 동적 시간 기준 | REQ-005 |
| `src/app/admin/reports/[resultId]/insights/page.tsx` | Key Recommendations + 쿠폰 UI | REQ-007, REQ-009 |
| `src/app/api/admin/diagnosis/results/[id]/coupon/route.ts` | 신규 — 쿠폰 PATCH API | REQ-010 |
| `src/app/reports/[resultId]/components/CouponCountdown.tsx` | 신규 — 카운트다운 컴포넌트 | REQ-011 |
| `src/app/reports/[resultId]/page.tsx` | CouponCountdown 렌더링 | REQ-011 |

---

## Testing Strategy

**Unit Tests (report-insights.ts 변경):**
- `generateBehavioralInsight` — 30분 vs 60분 기준 pacing 메시지가 다른지 확인

**Browser (Playwright):**
- 어드민 코드 생성 폼에 `시험 시간` 필드 표시 확인
- 생성된 토큰으로 시험 진입 시 타이머가 설정 시간으로 시작하는지 확인
- Submit 후 "View Your Report" 링크 없음 확인
- 어드민 인사이트 편집에서 Key Recommendations 수정/저장 확인
- 어드민 인사이트 편집에서 쿠폰 설정 후 리포트에 카운트다운 표시 확인
- 쿠폰 만료 후 카운트다운 숨김 확인

---

## Risks & Considerations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `diagnostic_test_results`에 token 참조 없음 | Medium | submit 시 token에서 time_limit_minutes 읽어 results에 저장 |
| `useTestTimer`가 `testData.timeLimit`을 직접 사용 | Low | prop override로 우선순위 부여 |
| 쿠폰 카운트다운이 SSR에서 hydration mismatch | Medium | `'use client'` 컴포넌트로 분리, `suppressHydrationWarning` |
| 기존 results의 `time_limit_minutes` 기본값 | Low | DEFAULT 30으로 마이그레이션 처리 |
| Key Recommendations 배열 저장 시 순서 유지 | Low | 배열 그대로 저장, 프론트에서 순서 관리 |

---

## 구현 순서 (권장)

1. **Step 1** (DB 마이그레이션) — 수동 실행 후
2. **Step 2** (View Report 버튼 제거) — 즉시 가능, 가장 단순
3. **Step 3 + 4** (시험 시간 어드민 + API) — 병렬 가능
4. **Step 5** (학생 페이지 타이머 연결)
5. **Step 6 + 7** (리포트 API + 인사이트 통계 반영)
6. **Step 8** (Key Recommendations UI)
7. **Step 9** (쿠폰 어드민 UI + API)
8. **Step 10** (리포트 쿠폰 카운트다운)
