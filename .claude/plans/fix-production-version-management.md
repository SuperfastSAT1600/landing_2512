# Fix: Admin Version Management Not Visible in Production

## Context

프로덕션 사이트에 어드민 버전 관리 탭이 보이지 않는 문제.
로컬(friday-test 브랜치)에서는 잘 보임.

**원인 진단:**
1. **코드 미배포**: 프로덕션은 `main` 브랜치 기준 배포 중 (PR #5 = 구버전 진단 시스템). 버전 관리(`VersionManagementTab`, `/api/admin/diagnosis/versions` 등)는 `friday-test`에만 존재.
2. **머지 충돌**: `origin/main`을 `friday-test`에 머지하면서 5개 이상 파일에 Git 충돌 마커 발생. 빌드 불가 상태.
3. **환경변수**: 프로덕션에 `ADMIN_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 미설정 시 어드민 API 전체가 401로 차단됨.

---

## Requirements

### REQ-001: 머지 충돌 해소 (MANUAL)
- **Description**: `friday-test` 브랜치의 5개 충돌 파일에서 HEAD(friday-test) 기준으로 충돌 해소
- **Conflicts to resolve**:
  - `src/app/diagnosis/components/DiagnosticTestView.tsx` — HEAD(새 버전) 유지
  - `src/app/diagnosis/page.tsx` — HEAD(이메일 입력 플로우) 유지
  - `src/app/api/admin/diagnosis/tokens/route.ts` — HEAD(이메일 불필요) 유지
  - `src/app/api/diagnosis/validate-token/route.ts` — HEAD(timeLimitMinutes 포함) 유지
  - `src/app/api/diagnosis/submit/route.ts` — HEAD(이메일 옵셔널) 유지
  - `src/app/admin/diagnosis/components/GenerateTokenTab.tsx` — HEAD(timeLimitMinutes, 이메일 없음) 유지
  - `src/app/diagnosis/components/TestSubmittedScreen.tsx` — HEAD(아이콘 방식) 유지
  - `src/app/admin/diagnosis/page.tsx` — HEAD(버전 관리 탭 포함) 유지
- **Verification**: (MANUAL) `git status`에 충돌 파일 없음

### REQ-002: 빌드 검증 (TEST)
- **Description**: 충돌 해소 후 `next build` 성공 확인
- **Verification**: (TEST) `npx next build` exit code 0

### REQ-003: 환경변수 확인 및 설정 (MANUAL)
- **Description**: 프로덕션 배포 플랫폼에 아래 환경변수 설정 확인
  - `ADMIN_SECRET_KEY`
  - `ADMIN_PASSWORD`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Verification**: (MANUAL) Vercel/Railway 대시보드에서 확인

### REQ-004: friday-test → main 머지 및 배포 (MANUAL)
- **Description**: 충돌 해소 + 빌드 성공 후 PR #6 머지, 프로덕션 배포
- **Verification**: (BROWSER) 배포된 사이트 `/admin/diagnosis` 접속 → "버전 관리" 탭 확인

### REQ-005: 어드민 API 인증 실패 시 명확한 에러 표시 (BROWSER)
- **Description**: 환경변수 누락 등으로 API 인증이 실패할 때 UI가 "버전 목록을 불러올 수 없습니다" 대신 "관리자 키가 올바르지 않습니다" 형태로 구체적 메시지 표시
- **Verification**: (BROWSER) 잘못된 adminKey로 버전 관리 탭 접근 시 인증 실패 메시지 표시

---

## Traceability Matrix

| REQ ID  | Description | Verification | Location |
|---------|-------------|-------------|----------|
| REQ-001 | 머지 충돌 해소 | (MANUAL) | 8개 파일 |
| REQ-002 | 빌드 성공 | (TEST) | `npx next build` |
| REQ-003 | 환경변수 설정 | (MANUAL) | 배포 플랫폼 설정 |
| REQ-004 | 배포 확인 | (BROWSER) | `/admin/diagnosis` |
| REQ-005 | 인증 에러 메시지 | (BROWSER) | `VersionManagementTab.tsx` |

---

## Implementation Steps

### Step 1: 머지 충돌 해소 (Satisfies REQ-001)
**전략**: 모든 충돌에서 `HEAD` (friday-test 브랜치) 버전을 채택. `origin/main`의 변경사항(이메일 필드 복원, 구 UI)은 버려야 할 이전 코드임.

충돌 파일별 해소 방향:
- `DiagnosticTestView.tsx` → HEAD: `timeLimitMinutes` prop, `SubmitConfirmationScreen`, `@iconify/react` 유지
- `diagnosis/page.tsx` → HEAD: `email-input` 단계, `test-loading` 단계, 한국어 에러 메시지 유지
- `tokens/route.ts` → HEAD: 이메일 불필요, `timeLimitMinutes`, 버전 ID 로직 유지
- `validate-token/route.ts` → HEAD: `timeLimitMinutes` + `testVersionId` 반환, 이메일 반환 제거
- `submit/route.ts` → HEAD: 이메일 옵셔널, `time_limit_minutes` 저장
- `GenerateTokenTab.tsx` → HEAD: 시험 시간 필드, 버전 선택기, 이메일 필드 없음
- `TestSubmittedScreen.tsx` → HEAD: `@iconify/react` 아이콘, `resultId` prop (but no link)
- `admin/diagnosis/page.tsx` → HEAD: 버전 관리 탭 포함 레이아웃

### Step 2: 빌드 확인 (Satisfies REQ-002)
```bash
npx next build
```

### Step 3: 환경변수 점검 안내 (Satisfies REQ-003)
배포 플랫폼(Vercel 기준):
- Project Settings → Environment Variables
- 5개 변수 모두 `Production` 환경에 설정되어 있는지 확인

### Step 4: PR 머지 및 배포 (Satisfies REQ-004)
```bash
git push origin friday-test
# PR #6 → Merge into main
```

### Step 5: VersionManagementTab 에러 메시지 개선 (Satisfies REQ-005)
파일: `src/app/admin/diagnosis/components/VersionManagementTab.tsx`
- API 응답이 401이면 "관리자 인증 실패 — 관리자 키를 확인해주세요" 표시
- API 응답이 500이면 "서버 오류" 표시
- 그 외 네트워크 오류면 "연결 오류" 표시

---

## 충돌 해소 시 주의사항

| 파일 | HEAD 유지 이유 |
|------|--------------|
| `diagnosis/page.tsx` | 이메일 입력 단계(REQ-004), 테스트 로딩 단계 포함. origin/main은 구버전 |
| `tokens/route.ts` | 이메일 없이 코드 생성(어드민 설계 변경). origin/main은 이메일 필수 구버전 |
| `validate-token/route.ts` | timeLimitMinutes 반환 필요. origin/main에는 없음 |
| `GenerateTokenTab.tsx` | 시험 시간 설정 필드 포함. origin/main에는 없음 |

---

## 위험 요소

| 위험 | 영향 | 대응 |
|------|------|------|
| 환경변수 누락 | 어드민 API 전체 차단 | 배포 전 플랫폼 설정 확인 필수 |
| DB 마이그레이션 미실행 | `time_limit_minutes` 컬럼 없어서 INSERT 실패 | `006_time_limit_and_coupon.sql` 실행 확인 |
| 머지 후 빌드 실패 | 배포 불가 | Step 2에서 로컬 빌드 먼저 확인 |
