# CRM v2 — Harness Build

## Overview

SuperfastSAT CRM의 4개 워크스트림을 병렬로 구현한다.
대상: 소규모 SAT 튜터링 비즈니스 (코치 여러 명, 학생 수백 명 규모).

---

## Workstream A — 시간 인식형 CRM (Time-Aware CRM)

**목적**: 마지막 연락 이후 경과 시간을 시각화해 팔로업 누락을 방지한다.

### REQ-A01: last_contacted_at 컬럼 추가
- **Priority**: Must
- **Description**: students 테이블에 `last_contacted_at TIMESTAMPTZ` 컬럼 추가. 상담 메모 저장(POST /api/crm/students/[id]/memo) 시 자동 업데이트.
- **Acceptance Criteria**: 메모 저장 후 students.last_contacted_at이 현재 시각으로 갱신된다.
- **Verification**: (TEST) memo API 호출 후 last_contacted_at 갱신 확인

### REQ-A02: StudentCard 시간 표시
- **Priority**: Must
- **Description**: 각 카드에 "3일 전", "오늘" 등 경과 시간 태그 표시. last_contacted_at이 null이면 "미연락" 표시.
- **Acceptance Criteria**: 카드마다 경과 시간이 표시된다.
- **Verification**: (BROWSER) 칸반 열었을 때 각 카드에 시간 태그 확인

### REQ-A03: 카드 경계 색상 코딩
- **Priority**: Must
- **Description**: last_contacted_at 기준 — 5일 미만: 정상(테두리 없음), 5~9일: 노랑, 10일 이상: 빨강.
- **Acceptance Criteria**: 5일 이상 경과 카드는 노랑, 10일 이상은 빨강 테두리.
- **Verification**: (BROWSER) 테두리 색상 시각 확인

### REQ-A04: 오늘 팔로업 배너
- **Priority**: Should
- **Description**: SalesKanban 상단에 "오늘 팔로업 필요: N명" 배너. last_contacted_at이 5일 이상이거나 null인 active 학생 카운트.
- **Acceptance Criteria**: 해당 학생 수가 0이면 배너 숨김.
- **Verification**: (BROWSER) 배너 표시/숨김 확인

### 영향 파일 (A)
- `supabase/migrations/026_add_last_contacted_at.sql` (신규)
- `src/app/api/crm/students/[id]/memo/route.ts` (last_contacted_at 업데이트 추가)
- `src/types/crm.ts` (Student 타입에 last_contacted_at 추가)
- `src/app/admin/crm/components/StudentCard.tsx` (시간 표시 + 색상)
- `src/app/admin/crm/components/SalesKanban.tsx` (팔로업 배너)

---

## Workstream B — 재활성화 전략 시스템 (Reactivation Strategy System)

**목적**: 이탈 고객을 이탈 사유와 상담 이력 기반으로 세그먼트하고, 전략적 재연락 시도와 그 성과를 CRM에 기록한다.

### REQ-B01: 리드풀 탭 + 세그먼트 필터
- **Priority**: Must
- **Description**: CRM 페이지에 "리드풀" 탭 추가. lead_status='inactive' 학생 목록. 필터: 이탈 사유(churn_tag), 이탈 유형(churn_type: potential/closed), 학년, 유입 소스, 이탈 후 경과 기간. 상담 내용 키워드 검색(ai_purified 필드 대상).
- **Acceptance Criteria**: 각 필터 적용 시 해당 조건의 학생만 표시된다.
- **Verification**: (BROWSER) 필터 조합 적용 후 결과 확인

### REQ-B02: 재활성화 시도 기록
- **Priority**: Must
- **Description**: students 테이블에 `reactivation_log JSONB[]` 컬럼 추가. 각 항목: `{ id, attempted_at, strategy, outcome, notes }`. outcome: 'pending' | 'no_response' | 'reactivated' | 'rejected'. 리드풀에서 학생별 "연락 기록 추가" 버튼 → 모달에서 전략 메모 + 아웃컴 입력.
- **Acceptance Criteria**: 연락 기록 저장 후 해당 학생의 reactivation_log에 항목이 추가된다.
- **Verification**: (TEST) POST /api/crm/students/[id]/reactivation 호출 후 DB 확인

### REQ-B03: 벌크 재활성화 시작
- **Priority**: Must
- **Description**: 리드풀에서 여러 학생 체크박스 선택 → "재활성화 시작" 버튼 → 전략 메모 입력 모달 → 선택된 학생 모두 lead_status='reactivating'으로 변경, reactivation_log에 pending 항목 추가.
- **Acceptance Criteria**: 선택된 학생들이 일괄 reactivating 상태로 변경되고 칸반의 "재활성화 시도 중" 섹션에 나타난다.
- **Verification**: (BROWSER) 벌크 선택 후 상태 변경 확인

### REQ-B04: 재활성화 성과 대시보드
- **Priority**: Should
- **Description**: 리드풀 탭 상단에 집계 카드: 총 이탈 수 / 재활성화 시도 중 / 성공률(reactivated / total attempted). 이탈 사유별 재활성화 성공률 간단 테이블.
- **Acceptance Criteria**: 숫자가 실시간 반영된다.
- **Verification**: (BROWSER) 재활성화 시도 후 집계 수치 갱신 확인

### REQ-B05: 재활성화 결과 업데이트
- **Priority**: Must
- **Description**: 칸반의 "재활성화 시도 중" 섹션에서 학생 클릭 → 상세 패널에서 reactivation_log 조회 및 최신 항목의 outcome 업데이트 가능.
- **Acceptance Criteria**: outcome 변경 후 리드풀 성과 집계에 반영된다.
- **Verification**: (BROWSER) outcome 변경 후 성공률 수치 변화 확인

### 영향 파일 (B)
- `supabase/migrations/027_add_reactivation_log.sql` (신규)
- `src/app/api/crm/students/[id]/reactivation/route.ts` (신규 — POST/PATCH)
- `src/app/api/crm/students/route.ts` (pool 필터 확장: churn_tag, churn_type, grade, source)
- `src/types/crm.ts` (ReactivationEntry 타입, Student에 reactivation_log 추가)
- `src/app/admin/crm/page.tsx` (탭 추가)
- `src/app/admin/crm/components/LeadPool.tsx` (신규)
- `src/app/admin/crm/components/ReactivationModal.tsx` (신규)
- `src/app/admin/crm/components/ReactivationStats.tsx` (신규)

---

## Workstream C — 학부모 마이페이지 (Parent Mypage)

**목적**: 학부모가 자녀의 정화된 상담 내용과 진단 결과를 확인해 "내 아이가 케어받고 있다"는 신뢰를 준다.

### REQ-C01: API 응답 unwrap 버그 수정
- **Priority**: Must
- **Description**: `/mypage/[studentId]/page.tsx` 39, 57번째 줄과 `ParentDashboard.tsx` 34번째 줄에서 `await res.json()` 후 `{ data }` unwrap 누락. `const { data } = await res.json()`으로 수정.
- **Acceptance Criteria**: 학부모 마이페이지 접속 시 이름, 타임라인이 올바르게 렌더링된다.
- **Verification**: (BROWSER) /mypage/[실제studentId] 접속 후 대시보드 렌더링 확인

### REQ-C02: 진단 리포트 자동 연결
- **Priority**: Must
- **Description**: `/api/mypage/[studentId]/route.ts`에서 ParentStudentView 빌드 시 `diagnostic_test_results WHERE student_id = studentId` 조회. 결과 있으면 `diagnostic_result_id` 포함. ParentStudentView 타입에 `diagnostic_result_id?: string` 추가.
- **Acceptance Criteria**: 진단 결과가 있는 학생의 마이페이지에 "진단 결과 보기" 카드가 노출된다.
- **Verification**: (BROWSER) 진단 결과 있는 학생의 마이페이지에서 카드 확인

### REQ-C03: 진단 리포트 카드 UI
- **Priority**: Must
- **Description**: `ParentDashboard.tsx`에 진단 결과 카드 추가. `diagnostic_result_id`가 있을 때만 렌더링. "진단 결과 보기" 버튼 → `/reports/[diagnostic_result_id]`로 이동. 카드 톤: 따뜻하고 간결하게 ("아이의 SAT 진단 결과가 준비되었습니다").
- **Acceptance Criteria**: 카드 클릭 시 기존 리포트 페이지로 이동한다.
- **Verification**: (BROWSER) 카드 클릭 후 /reports/[id] 로딩 확인

### REQ-C04: needs_setup 응답 처리 수정
- **Priority**: Must
- **Description**: init() 에서 passcode 없이 호출 시 API가 `{ data: { needs_setup: true } }` 반환하는데, 현재 페이지는 이를 unwrap 없이 처리해 `has_passcode` 체크가 우연히 동작함. 명시적으로 `data.needs_setup` 체크하도록 수정.
- **Acceptance Criteria**: passcode 미설정 학생 접속 시 setup 화면, 설정 완료 학생 접속 시 verify 화면.
- **Verification**: (BROWSER) 두 케이스 모두 올바른 화면 확인

### 영향 파일 (C)
- `src/app/mypage/[studentId]/page.tsx` (unwrap 버그 수정 3곳, needs_setup 처리)
- `src/app/mypage/[studentId]/components/ParentDashboard.tsx` (진단 카드 추가, unwrap 수정)
- `src/app/api/mypage/[studentId]/route.ts` (diagnostic_result_id 조회 추가)
- `src/types/crm.ts` (ParentStudentView에 diagnostic_result_id 추가)

---

## Workstream D — CRM 카드 UX

**목적**: 칸반 보드의 사용성을 기존 유명 CRM 수준으로 끌어올린다. 검색, 필터, 카드 정보 밀도, 스크롤 버그 수정.

### REQ-D01: 가로 스크롤 버그 수정 확인
- **Priority**: Must
- **Description**: 이전 세션에서 `KanbanRow`의 스크롤 컨테이너를 `flex-1 min-w-0 overflow-x-auto` + 내부 `w-max` 구조로 수정함. 실제 작동 여부 검증 후 미작동 시 재수정.
- **Acceptance Criteria**: 카드가 많은 스테이지에서 가로 스크롤이 작동한다.
- **Verification**: (BROWSER) 카드 10개 이상인 스테이지에서 스크롤 확인

### REQ-D02: 전역 검색
- **Priority**: Must
- **Description**: CRM 페이지 상단에 검색창. 학생 이름, 학부모 전화번호로 검색. 클라이언트 사이드 필터링 (전체 목록 로드 후 필터).
- **Acceptance Criteria**: 검색어 입력 시 해당 학생 카드만 강조 또는 나머지 dim 처리. ESC로 초기화.
- **Verification**: (BROWSER) 이름 검색 후 결과 확인

### REQ-D03: 칸반 필터
- **Priority**: Must
- **Description**: 검색창 옆 필터 버튼 → 드롭다운. 필터 항목: 학년, 유입 소스(traffic_source), 희망 과목(desired_subjects), 리드 유형(B2B/B2C). 필터 적용 시 해당 조건 카드만 표시, 빈 스테이지는 row 유지(0명 표시).
- **Acceptance Criteria**: 필터 적용/해제 시 카드 목록이 즉시 갱신된다.
- **Verification**: (BROWSER) 학년 필터 적용 후 다른 학년 카드 사라짐 확인

### REQ-D04: StudentCard 정보 밀도 개선
- **Priority**: Should
- **Description**: 카드에 추가 표시: 유입 소스 아이콘/텍스트(traffic_source 축약), 목표 시험 날짜 D-day(target_test_date 있을 때만), 연락 방법 아이콘(contact_type: 카카오/전화). 기존 정보(이름, 학년, 점수)는 유지.
- **Acceptance Criteria**: 카드 높이가 크게 늘어나지 않으면서 핵심 정보 3개가 추가된다.
- **Verification**: (BROWSER) 카드 시각 확인

### REQ-D05: 스테이지별 학생 수 summary
- **Priority**: Should
- **Description**: SalesKanban 상단 또는 각 row label 옆에 전체 active 학생 수 표시. 각 스테이지 label에 이미 있는 `{students.length}명` 유지.
- **Acceptance Criteria**: 전체 합계가 헤더에 표시된다.
- **Verification**: (BROWSER) 숫자 정확성 확인

### 영향 파일 (D)
- `src/app/admin/crm/page.tsx` (검색창, 필터 UI)
- `src/app/admin/crm/components/SalesKanban.tsx` (필터 prop 적용, 배너, 스크롤 검증)
- `src/app/admin/crm/components/StudentCard.tsx` (정보 밀도 개선)
- `src/app/admin/crm/components/KanbanFilter.tsx` (신규 — 필터 드롭다운)

---

## 파일 소유권 (병렬 빌드 충돌 방지)

| 파일 | 담당 워크스트림 |
|---|---|
| `supabase/migrations/026_*.sql` | A |
| `supabase/migrations/027_*.sql` | B |
| `src/types/crm.ts` | **주의: A, B, C 모두 수정** → 순차 병합 필요 |
| `src/app/admin/crm/page.tsx` | B (탭 추가) + D (검색/필터) → **병합 주의** |
| `src/app/admin/crm/components/StudentCard.tsx` | A (색상) + D (정보) → **병합 주의** |
| `src/app/admin/crm/components/SalesKanban.tsx` | A (배너) + D (필터) → **병합 주의** |
| `src/app/mypage/**` | C 독점 |
| `src/app/api/mypage/**` | C 독점 |
| `src/app/api/crm/students/[id]/reactivation/**` | B 독점 |
| `src/app/admin/crm/components/LeadPool.tsx` | B 독점 |
| `src/app/admin/crm/components/KanbanFilter.tsx` | D 독점 |

## 병렬 실행 전략

- **C는 완전 독립** → 즉시 병렬 실행
- **A와 D는 같은 파일(StudentCard, SalesKanban) 수정** → 같은 에이전트가 담당
- **B는 page.tsx 탭 수정** → A+D 완료 후 merge, 또는 탭 부분만 분리

## Implementation Order

1. C — 독립적, 버그 수정이라 빠름
2. A+D — 같은 파일 담당하므로 하나의 에이전트
3. B — 나머지 파일 + page.tsx 탭 통합

## Out of Scope

- 코치 매칭 칸반 (MatchingKanban) 연결
- 코치 오퍼 뷰 페이지
- 카카오/문자 실제 발송 연동
- 퍼널 분석 리포트 페이지 (별도 사이클)
- 이메일 자동화 시퀀스
