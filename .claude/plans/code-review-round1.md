# Code Review Round 1 — Critical + Major Warning 수정

## Overview

3개 어드민 영역(CRM / SRM / 파트너 센터) 코드 리뷰 결과 발견된 Critical 9건 + Warning 주요 건을 수정한다.
목표: 보안 강화, 데이터 정합성, 런타임 안정성. 기능 변경 없음.

## Requirements

### REQ-001: SRM / 파트너 어드민 API 인증 추가
- **Priority**: Must
- **Description**: 인증 없이 누구나 접근 가능했던 5개 어드민 API에 `isAuthenticated` 체크 추가
- **Files**: `api/admin/srm/student/[profileId]/route.ts`, `api/admin/srm/student/crm/[crmStudentId]/route.ts`, `api/admin/srm/daily-learning/route.ts`, `api/admin/srm/partner-portals/route.ts`, `api/admin/srm/partner-portals/[token]/reset-passcode/route.ts`
- **Verification**: (MANUAL) curl 없이 직접 URL 접근 시 401 반환 확인

### REQ-002: CRM stats/payments API 입력값 검증
- **Priority**: Must
- **Description**: `.or()` 필터에 직접 삽입되는 `from`/`to` 날짜 파라미터와 `student_name`에 정규식 검증 추가
- **Files**: `api/crm/stats/route.ts`, `api/crm/stats/detail/route.ts`, `api/crm/payments/route.ts`
- **Verification**: (MANUAL) 잘못된 형식 파라미터 전달 시 400 반환 확인

### REQ-003: 환불 API — singleton 사용 + 부분 실패 보상
- **Priority**: Must
- **Description**: refund/route.ts의 중복 Supabase 클라이언트를 singleton으로 교체. Step 2(학생 상태 업데이트) 실패 시 Step 1(결제 기록) 롤백 추가
- **Files**: `api/crm/students/[id]/refund/route.ts`
- **Verification**: (MANUAL) 환불 API 정상 동작 확인

### REQ-004: 파트너 포털 auth 엣지 케이스 수정
- **Priority**: Must
- **Description**: (1) verify 시 passcode_hash가 null이면 명시적 409 반환 (2) set 시 passcode_locked_until도 null로 초기화
- **Files**: `api/partner/[token]/auth/route.ts`
- **Verification**: (MANUAL) 비밀번호 미설정 상태에서 verify 호출 시 409 확인

### REQ-005: 학생 실명 소스코드에서 제거
- **Priority**: Must
- **Description**: daily-learning/page.tsx의 하드코딩된 TARGET_NAMES와 DEFAULT_DATE 제거. 날짜는 오늘 날짜 기본값, 이름은 UI에서 입력하는 방식으로 변경
- **Files**: `admin/srm/daily-learning/page.tsx`
- **Verification**: (MANUAL) 페이지 접속 시 이름 입력 UI 표시, 날짜 기본값이 오늘 날짜

### REQ-006: PaymentModal 응답 body 이중 소비 수정
- **Priority**: Must
- **Description**: `res.json()`을 한 번만 호출해 body를 변수에 저장 후 재사용
- **Files**: `admin/crm/components/PaymentModal.tsx`
- **Verification**: (TEST) 결제 처리 실패/성공 시 런타임 오류 없음

### REQ-007: VIP 탭 이탈/환불 후 상태 동기화
- **Priority**: Must
- **Description**: churn/refund 처리 시 allStudents와 함께 vipStudents도 갱신
- **Files**: `admin/crm/components/EnrolledLeads.tsx`
- **Verification**: (MANUAL) VIP 탭에서 이탈/환불 처리 후 해당 학생 사라짐 확인

### REQ-008: StatsDetailModal 낙관적 업데이트 실패 시 롤백
- **Priority**: Should
- **Description**: created_by 수정 실패 시 이전 값으로 즉시 롤백
- **Files**: `admin/crm/components/StatsDetailModal.tsx`
- **Verification**: (MANUAL) 네트워크 오류 시 이전 값으로 복귀 확인

### REQ-009: 날짜 범위 종료 1초 누락 수정
- **Priority**: Should
- **Description**: `kstDayRange`의 end를 `T23:59:59.999+09:00`으로 수정
- **Files**: `src/lib/learning-data.ts`
- **Verification**: (MANUAL) 해당 시간대 학습 기록 포함 확인

### REQ-010: payment studentRow null 시 404 반환
- **Priority**: Should
- **Description**: 학생 조회 실패 시 빈 이름으로 저장하지 않고 404 반환
- **Files**: `api/crm/students/[id]/payment/route.ts`
- **Verification**: (TEST) 없는 student id로 결제 요청 시 404 반환

## Technical Design

### 인증 패턴
모든 어드민 API에 동일하게 적용:
```typescript
import { isAuthenticated } from '@/lib/server-auth';
// 핸들러 첫 줄:
if (!isAuthenticated(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

### 날짜 검증 패턴
```typescript
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
if (!DATE_RE.test(from) || !DATE_RE.test(to))
  return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
```

## Implementation Order
1. REQ-001 — API 인증 (독립적, 가장 중요)
2. REQ-002 — 입력 검증 (독립적)
3. REQ-003 — 환불 API (독립적)
4. REQ-004 — 파트너 auth 엣지 (독립적)
5. REQ-005 — 하드코딩 제거 (독립적)
6. REQ-006~010 — 프론트엔드 수정 (독립적)

## Out of Scope
- localStorage admin_key → httpOnly 쿠키 전환 (Round 2)
- N+1 쿼리 최적화 (Round 2)
- SRM 상수 중복 제거 (Round 3)
- ILIKE → 정확한 매칭 (데이터 검증 후 Round 2)
