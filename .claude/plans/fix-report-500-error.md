---
spec: fix-report-500-error
version: 1.0
status: approved
template: spec-bugfix
---

# Bugfix Spec: 진단 리포트 페이지 500 Application Error

## 재현 단계
1. `tutoring.superfastsat.com/reports/[resultId]` 접속
2. "Application error: a server-side exception has occurred" (Digest: 3580913326)

## 근본 원인 분석

### 버그 A — 자기참조 fetch 실패 (최우선)
**파일**: `src/app/reports/[resultId]/page.tsx` line 21–26

```typescript
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
const res = await fetch(`${baseUrl}/api/reports/${resultId}`, { cache: 'no-store' });
```

서버 컴포넌트가 자신의 API를 HTTP로 self-fetch한다.
`NEXT_PUBLIC_BASE_URL`이 `tutoring.superfastsat.com`으로 설정되지 않았거나,
DNS 미구성 상태이면 `fetch()`가 `ECONNREFUSED` / DNS 에러를 던짐 → **uncaught → Application error**.

**핵심**: try/catch가 없어서 fetch 실패 = 서버 컴포넌트 전체 크래시.

### 버그 B — `.trim()` on non-string (2차 원인)
**파일**: `src/app/api/reports/[resultId]/route.ts` line 76

```typescript
: studentAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
```

`answers` JSONB 컬럼은 `Record<string, string>`으로 타입 캐스팅되지만,
실제 DB 값이 `number | boolean | object`일 경우 `TypeError: .trim is not a function` 발생.
API route에 try/catch 없음 → 500 응답 → 버그 A와 결합해 Application error.

### 버그 C — `generateAllInsights` 예외 가능성
**파일**: `src/app/reports/[resultId]/page.tsx` line 45–50

API가 예상치 못한 shape을 반환하면 `generateAllInsights()` 내부에서
uncaught 예외 발생 가능. try/catch 부재.

---

## Requirements

### REQ-001: self-fetch 제거 → 직접 함수 호출로 교체 `(BROWSER)`
**Priority: Must**

`page.tsx`의 `getReportData()`가 HTTP self-fetch 대신
`route.ts`의 데이터 조회 로직을 직접 호출하도록 리팩터링.

AS-IS:
```typescript
const res = await fetch(`${baseUrl}/api/reports/${resultId}`, { cache: 'no-store' });
```

TO-BE:
```typescript
// 공유 함수 src/lib/report-data.ts 로 추출
import { fetchReportData } from '@/lib/report-data';
const data = await fetchReportData(resultId);
```

`fetchReportData`는 기존 route.ts의 DB 조회 + 계산 로직을 그대로 이전.
route.ts는 이 함수를 import해 사용.

### REQ-002: API route try/catch 추가 `(TEST)`
**Priority: Must**

`route.ts` 전체를 try/catch로 감싸 DB 에러·타입 에러가 500이 아닌
`{ error: '...' }` JSON으로 반환되게 처리.

```typescript
export async function GET(...) {
  try {
    // 기존 로직
  } catch (err) {
    console.error('[report API]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### REQ-003: `.trim()` 타입 가드 추가 `(TEST)`
**Priority: Must**

line 76 직전에 string 타입 확인:

```typescript
const safeStr = (v: unknown): string =>
  typeof v === 'string' ? v : String(v ?? '');

const isCorrect = studentAnswer !== undefined
  ? q.type === 'multiple-choice'
    ? studentAnswer === correctAnswer
    : safeStr(studentAnswer).trim().toLowerCase() === safeStr(correctAnswer).trim().toLowerCase()
  : false;
```

### REQ-004: page.tsx `generateAllInsights` 예외 격리 `(BROWSER)`
**Priority: Should**

`generateAllInsights()` 호출을 try/catch로 감싸고,
예외 시 빈 insights로 폴백해 페이지 자체는 렌더링되도록:

```typescript
let aiInsights;
try {
  aiInsights = generateAllInsights(data.sections, data.questionDetails, ...);
} catch {
  aiInsights = { /* safe empty defaults */ };
}
```

---

## 구현 순서

### Step 1 — 공유 함수 추출 (REQ-001)
**신규 파일**: `src/lib/report-data.ts`
- route.ts 의 DB 조회 + 계산 로직 전체 이동
- `fetchReportData(resultId: string)` export

**수정**: `src/app/api/reports/[resultId]/route.ts`
- `fetchReportData` import 후 호출
- REQ-002 try/catch 함께 추가

**수정**: `src/app/reports/[resultId]/page.tsx`
- `getReportData()` → `fetchReportData()` 직접 호출로 교체
- HTTP fetch 제거

### Step 2 — 타입 가드 (REQ-003)
`src/lib/report-data.ts` 내 `.trim()` 호출 부분에 `safeStr()` 헬퍼 적용

### Step 3 — 예외 격리 (REQ-004)
`page.tsx` 내 `generateAllInsights` try/catch

---

## Traceability Matrix

| REQ ID  | 설명                          | 검증      | 수정 파일                            |
|---------|-------------------------------|-----------|--------------------------------------|
| REQ-001 | self-fetch → 직접 호출        | (BROWSER) | page.tsx, route.ts, lib/report-data.ts |
| REQ-002 | API route try/catch           | (TEST)    | route.ts → lib/report-data.ts        |
| REQ-003 | .trim() 타입 가드             | (TEST)    | lib/report-data.ts:76                |
| REQ-004 | generateAllInsights 예외 격리 | (BROWSER) | page.tsx:45                          |

---

## 기대 결과

- 리포트 URL 접속 시 Application error 제거
- JSONB 타입 불일치 데이터도 안전하게 처리
- `NEXT_PUBLIC_BASE_URL` 환경변수 의존성 제거
