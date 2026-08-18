# 재시험 차단 + 리포트 어드민 전용 접근

## Overview
두 가지 보안 기능 추가:
1. 시험 제출 후 토큰 비활성화 → 재응시 차단
2. `/reports/[resultId]` 어드민 세션이 없으면 잠금 화면 표시

---

## 현황 파악

### 재응시
- `validate-token`: `is_active = true` + 만료일만 체크, 기제출 여부 미확인
- `submit`: 제출 성공 후 토큰 비활성화 없음 → 재응시 가능

### 리포트 접근
- `useAdminAuth`: localStorage 기반 → 서버 컴포넌트에서 읽기 불가
- `/api/admin/auth`: 로그인 성공 시 JSON 응답만, 쿠키 미발행
- `/reports/[resultId]/page.tsx`: 인증 없음, 누구나 접근 가능

---

## Requirements

### REQ-001: 제출 후 토큰 비활성화
- **Description**: 제출 API 성공 시 `diagnostic_access_tokens.is_active = false` 업데이트. 이후 동일 코드 입력 시 "유효하지 않은 코드입니다" 오류 반환.
- **Verification**: (TEST)
- **Priority**: Must

### REQ-002: 어드민 로그인 시 쿠키 발행
- **Description**: `/api/admin/auth` POST 성공 시 `admin_session` httpOnly 쿠키를 set. 이를 통해 서버 컴포넌트에서 인증 상태 확인 가능.
- **Verification**: (TEST)
- **Priority**: Must

### REQ-003: 리포트 페이지 어드민 게이트
- **Description**: `/reports/[resultId]` 로드 시 서버에서 `admin_session` 쿠키를 확인. 없거나 유효하지 않으면 잠금 UI("이 리포트는 선생님만 확인할 수 있습니다") 표시. 있으면 기존 리포트 정상 렌더링.
- **Verification**: (BROWSER)
- **Priority**: Must

### REQ-004: 어드민 로그아웃 시 쿠키 삭제
- **Description**: 어드민 로그아웃 시 `admin_session` 쿠키 만료 처리.
- **Verification**: (TEST)
- **Priority**: Must

---

## Traceability Matrix

| REQ ID  | Description               | Verification | 위치 |
|---------|---------------------------|-------------|------|
| REQ-001 | 제출 후 토큰 비활성화     | (TEST)      | `src/app/api/diagnosis/submit/route.ts` |
| REQ-002 | 어드민 로그인 쿠키 발행   | (TEST)      | `src/app/api/admin/auth/route.ts` |
| REQ-003 | 리포트 어드민 게이트      | (BROWSER)   | `src/app/reports/[resultId]/page.tsx` |
| REQ-004 | 로그아웃 쿠키 삭제        | (TEST)      | `src/app/api/admin/logout/route.ts` (신규) |

---

## Implementation Steps

### Step 1: 제출 후 토큰 비활성화 (REQ-001)
**파일**: `src/app/api/diagnosis/submit/route.ts`

제출 결과 insert 성공 직후:
```ts
// tokenId가 있으면 토큰 비활성화
if (tokenId) {
  await supabaseAdmin
    .from('diagnostic_access_tokens')
    .update({ is_active: false })
    .eq('id', tokenId);
  // 실패해도 제출 자체는 성공 처리 (결과는 저장됨)
}
```
- Complexity: **Low**

---

### Step 2: 어드민 로그인 쿠키 발행 (REQ-002)
**파일**: `src/app/api/admin/auth/route.ts`

성공 응답 시 `admin_session` 쿠키 추가:
```ts
const response = NextResponse.json({ success: true, apiKey: process.env.ADMIN_SECRET_KEY });
response.cookies.set('admin_session', process.env.ADMIN_SECRET_KEY!, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 7, // 7일
  path: '/',
});
return response;
```
- Complexity: **Low**

---

### Step 3: 리포트 어드민 게이트 (REQ-003)
**파일**: `src/app/reports/[resultId]/page.tsx`

서버 컴포넌트에서 쿠키 확인:
```ts
import { cookies } from 'next/headers';

const cookieStore = await cookies();
const session = cookieStore.get('admin_session');
const isAdmin = session?.value === process.env.ADMIN_SECRET_KEY;

if (!isAdmin) {
  return <ReportLockedPage />;
}
```

잠금 페이지 UI (`ReportLockedPage` - 인라인 컴포넌트):
- 배경: `#F4F5F9`, 중앙 정렬
- 아이콘 + "이 리포트는 SuperfastSAT 선생님만 열람할 수 있습니다"
- "선생님에게 문의하세요" 안내
- 학생 데이터 일절 미노출

- Complexity: **Low**

---

### Step 4: 로그아웃 쿠키 삭제 (REQ-004)
**파일 신규**: `src/app/api/admin/logout/route.ts`

```ts
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_session');
  return response;
}
```

**파일**: `src/app/admin/layout.tsx`의 `logout` 함수에서 이 API 호출 추가:
```ts
// useAdminAuth logout 후 추가
await fetch('/api/admin/logout', { method: 'POST' });
```
- Complexity: **Low**

---

## 구현 순서

| Step | 파일 | REQ | 복잡도 |
|------|------|-----|--------|
| 1 | `submit/route.ts` | REQ-001 | Low |
| 2 | `auth/route.ts` | REQ-002 | Low |
| 3 | `reports/[resultId]/page.tsx` | REQ-003 | Low |
| 4 | `logout/route.ts` + `admin/layout.tsx` | REQ-004 | Low |

---

## Risks & Considerations

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 토큰 비활성화 실패해도 제출 결과는 보존 | Low | try/catch로 분리, 로그만 남김 |
| 어드민 쿠키 없으면 기존 로그인 상태 유지 안 됨 | Medium | 기존 로그인된 어드민은 재로그인 1회 필요 |
| `ADMIN_SECRET_KEY` 미설정 시 리포트 완전 차단 | High | 환경변수 체크 + fallback 로직 필요 |
| OG 이미지는 게이트 없음 | Low | 크롤러 접근 허용 유지 (이름 마스킹됨) |

### 주의사항
- 어드민이 처음 이 기능 배포 후 리포트를 보려면 **어드민 패널에서 로그아웃 후 재로그인** 필요 (쿠키 최초 발행)
- `ADMIN_SECRET_KEY` 환경변수가 비어있는 경우 → `isAdmin = false`로 처리하지 말고 서버 에러 명시

---

## Verification

1. **REQ-001**: 진단테스트 제출 → 같은 코드 재입력 → "유효하지 않은 코드" 확인
2. **REQ-002**: 어드민 로그인 → 브라우저 개발자도구 Cookies에서 `admin_session` 존재 확인
3. **REQ-003**: 비로그인 상태 브라우저에서 `/reports/[uuid]` 직접 접근 → 잠금 화면 표시 확인
4. **REQ-004**: 어드민 로그아웃 → `admin_session` 쿠키 삭제 확인 → 리포트 접근 차단 확인
