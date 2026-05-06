# 진단테스트: 6자리 코드 방식 통합

## Context
현재 두 가지 접속 방식(6자리 코드 / 토큰 링크)이 혼재. 토큰 링크 방식을 제거하고, 6자리 코드 방식만 유지하되 결과가 Supabase에 저장되도록 통합. Admin에서 코드별 유효기한을 설정할 수 있도록 함.

## 변경 사항

### 1. Admin - 코드 관리 UI 변경
**파일**: `src/app/admin/diagnosis/page.tsx`, `src/app/admin/diagnosis/components/GenerateTokenTab.tsx`
- "토큰 생성" 탭 → "코드 관리" 탭으로 변경
- 입력: 학생명, 이메일, 6자리 코드(자동생성 or 직접입력), 만료일시
- 생성 시 Supabase `diagnostic_access_codes` 테이블에 저장
- 생성된 코드와 만료시간 표시

### 2. Supabase 테이블 변경
- `diagnostic_access_tokens` → `diagnostic_access_codes`로 대체 (또는 재활용)
- 스키마: id, code(6자리), student_email, student_name, expires_at, is_active, created_at

### 3. 학생 접속 플로우 변경
**파일**: `src/app/diagnosis/page.tsx`
- 6자리 코드 입력 → API로 코드 검증 (만료 체크 포함)
- 유효하면 학생 정보 자동 로드 (admin이 입력한 이름/이메일)
- 학생 정보 확인 → 테스트 시작
- 토큰 링크(`?token=`) 관련 코드 제거
- 이름/이메일 직접 입력 화면 제거

### 4. API 변경
**파일**: `src/app/api/diagnosis/validate-token/route.ts` → 코드 검증용으로 수정
- 6자리 코드로 조회, 만료일시 체크, 학생 정보 반환

### 5. 제출 시 결과 저장
**파일**: `src/app/diagnosis/components/DiagnosticTestView.tsx`
- 코드 기반 접속이든 항상 Supabase에 결과 저장

## Verification
1. Admin에서 6자리 코드 + 만료일시 생성
2. `/diagnosis`에서 코드 입력 → 학생 정보 확인 → 테스트
3. 만료된 코드로 접속 시 거부 확인
4. 테스트 완료 후 admin 결과 탭에서 조회 확인
