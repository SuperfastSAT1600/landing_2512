# Spec: SAT Coach Assignment & Sales CRM Dashboard

## Feature Overview

매니저가 학생 리드를 관리하고, 코치를 배정하며, 학부모와 소통하는 통합 CRM 시스템.

**주요 사용자**: 매니저(Admin), 학부모(Parent Mypage), 코치(Coach Offer View)
**데이터 저장**: Supabase (Realtime 동기화)
**진입점**: `/admin/crm` (매니저), `/mypage/[studentId]` (학부모), `/offer/[assignmentId]` (코치)

---

## Requirements

### Phase 1: DB Migration

#### REQ-001: students 테이블 생성
- **Description**: `students` 테이블에 PRD 정의 필드 전체 포함. `school_type`, `desired_subjects`, `funnel_stage`, `previous_score_status`, `churn_type`은 DB enum으로 정의
- **Verification**: (TEST)
- **Priority**: Must

#### REQ-002: student_coach_assignments 테이블 생성
- **Description**: `student_coach_assignments` 테이블 생성. `status` enum: `pending / accepted / rejected / considering`. `is_confirmed` boolean으로 최종 배정 코치 식별
- **Verification**: (TEST)
- **Priority**: Must

#### REQ-003: diagnostic_test_results에 student_id FK 추가
- **Description**: 기존 `diagnostic_test_results` 테이블에 `student_id UUID NULL → students.id` 컬럼 추가 (기존 데이터 깨지지 않도록 nullable)
- **Verification**: (TEST)
- **Priority**: Must

---

### Phase 2: Admin CRM — 학생 카드 CRUD

#### REQ-004: 학생 카드 생성 (매니저)
- **Description**: Admin CRM에서 매니저가 신규 학생 카드 생성. 필수 8개 필드 (이름, 학년, 재학유형, 학부모연락처, 직전점수, 목표점수, 목표시험일자, 희망과목) 입력 폼 제공
- **Verification**: (BROWSER)
- **Priority**: Must

#### REQ-005: 학생 카드 상세 뷰
- **Description**: 카드 클릭 시 사이드패널(슬라이드인) 또는 모달로 전체 필드 표시. 진단테스트 결과 연결 여부, 퍼널 단계, 배정 코치 상태 포함
- **Verification**: (BROWSER)
- **Priority**: Must

#### REQ-006: 학생 카드 편집
- **Description**: 모든 필드 인라인 편집 가능. 저장 시 Supabase 업데이트
- **Verification**: (TEST)
- **Priority**: Must

---

### Phase 3: 세일즈 칸반 보드 A (퍼널)

#### REQ-007: 9단계 칸반 보드 렌더링
- **Description**: 세일즈 퍼널 9단계(3a/3b, 5a/5b 포함 총 11컬럼)를 가로 스크롤 칸반으로 렌더링. 각 컬럼에 해당 단계 카드 목록 표시
- **Verification**: (BROWSER)
- **Priority**: Must

#### REQ-008: 드래그 앤 드롭으로 단계 이동
- **Description**: 카드를 드래그하여 다른 컬럼으로 이동 시 `funnel_stage` 즉시 업데이트. Supabase Realtime으로 다른 세션에도 반영
- **Verification**: (BROWSER)
- **Priority**: Must

#### REQ-009: 이탈 처리
- **Description**: 모든 단계 카드에서 "이탈" 버튼 → 이탈 태그(드롭다운: 회신없음/노쇼/미응시/미결제/기타) + 이탈 분류(잠재/완전종료) 선택 → `churn_tag`, `churn_type` 저장. 이탈 카드는 별도 "이탈" 컬럼으로 이동
- **Verification**: (BROWSER)
- **Priority**: Must

#### REQ-010: Supabase Realtime 동기화
- **Description**: 칸반 보드가 Supabase Realtime을 구독하여 다른 브라우저/세션의 변경 사항을 즉시 반영 (새로고침 없이)
- **Verification**: (MANUAL)
- **Priority**: Must

---

### Phase 4: 상담 메모 & AI 케어 메시지

#### REQ-011: 매니저 상담 메모 입력
- **Description**: 학생 카드 상세 뷰에서 매니저가 상담 메모 자유 입력. `consultation_timeline` JSONB에 원본 저장. 시간순 타임라인 표시
- **Verification**: (BROWSER)
- **Priority**: Must

#### REQ-012: AI 케어 메시지 변환 (Claude API)
- **Description**: "AI 케어 메시지로 변환" 버튼 클릭 시 Claude API 호출. 3가지 출력 생성: ①순화본(학부모용), ②삭제 목록(매니저 확인용), ③교육이력(코치용). 가격/비용불만/내부판단 내용 자동 삭제
- **Verification**: (BROWSER)
- **Priority**: Must

#### REQ-013: 매니저 검토 후 승인
- **Description**: AI 변환 결과를 매니저가 확인·수정 후 승인. 승인 시 학부모 타임라인에 가공본 노출, 코치 오퍼 뷰에 교육이력 노출
- **Verification**: (BROWSER)
- **Priority**: Must

---

### Phase 5: 코치 매칭 칸반 보드 B

#### REQ-014: 5단계 매칭 보드 렌더링
- **Description**: 결제 완료(funnel_stage=9) 카드만 매칭 보드에 진입. 5단계 (스케줄입력대기/완료/코치제안발송/코치응답대기/매칭확정) 칸반 렌더링
- **Verification**: (BROWSER)
- **Priority**: Must

#### REQ-015: 코치 선택 & 오퍼 발송
- **Description**: 매칭 보드 "코치 제안 발송" 단계에서 매니저가 코치 선택(복수) 후 오퍼 발송. 각 코치별 `student_coach_assignments` 레코드 생성 (status=pending). 응답 deadline 설정 (기본 48시간)
- **Verification**: (BROWSER)
- **Priority**: Must

#### REQ-016: 먼저 수락한 코치 자동 확정
- **Description**: 코치가 수락(accepted) 시 `is_confirmed=true` 설정, 동시에 다른 오퍼들 status를 자동으로 closed 처리. DB 트랜잭션으로 race condition 방지
- **Verification**: (TEST)
- **Priority**: Must

---

### Phase 6: 코치 오퍼 뷰 (공개 링크)

#### REQ-017: 오퍼 뷰 공개 페이지
- **Description**: `/offer/[assignmentId]` 페이지. 인증 없이 접근 가능 (링크 자체가 토큰). 만료되거나 이미 확정된 오퍼는 "매칭 완료" 안내 표시
- **Verification**: (BROWSER)
- **Priority**: Must

#### REQ-018: 학생 정보 노출 (PRD 범위 준수)
- **Description**: 코치에게 노출: 이름/학년/재학유형/희망과목, 직전 SAT점수/목표점수/목표시험일, 진단테스트 요약(총점/영역별/취약영역/어휘약점), 교육이력, 검토중인 코치 수, 응답 deadline. 미노출: 학부모 연락처, 퍼널정보, 결제정보
- **Verification**: (BROWSER)
- **Priority**: Must

#### REQ-019: 코치 타임존 선택 & 스케줄 캘린더
- **Description**: 오퍼 뷰 진입 시 코치 타임존 선택 UI. 학부모가 입력한 OT 일시 + 정규 스케줄을 선택한 타임존으로 변환하여 캘린더 표시. DST 반영
- **Verification**: (BROWSER)
- **Priority**: Must

#### REQ-020: 수락/거절/고민 응답
- **Description**: 3가지 응답 버튼. 수락 → is_confirmed 처리(REQ-016). 거절 → 해당 오퍼만 rejected, 나머지 유지. 고민 → considering 상태, 매니저 대시보드에 표시. 응답 즉시 `responded_at` 기록
- **Verification**: (BROWSER)
- **Priority**: Must

---

### Phase 7: 학부모 마이페이지

#### REQ-021: 패스코드 설정 & 인증
- **Description**: `/mypage/[studentId]` 최초 접속 시 6자리 패스코드 설정 화면. 재접속 시 입력→검증(bcrypt). 분실 시 매니저가 Admin에서 리셋 가능
- **Verification**: (BROWSER)
- **Priority**: Must

#### REQ-022: 학부모 상태 표시 (4단계)
- **Description**: 학부모 노출 상태 4가지(신규/스케줄/매칭중/완료)를 `funnel_stage` + 매칭보드 단계로 매핑하여 표시
- **Verification**: (BROWSER)
- **Priority**: Must

#### REQ-023: 스케줄 입력 (타임존 선택 포함)
- **Description**: 매칭보드 1단계에서 학부모에게 스케줄 입력 UI 활성화. 타임존 선택 → OT 희망 일시 + 정규 스케줄(요일/시간 그리드) 입력 → UTC로 변환 저장
- **Verification**: (BROWSER)
- **Priority**: Must

#### REQ-024: 상담 타임라인 표시
- **Description**: 매니저가 승인한 AI 가공본만 학부모 타임라인에 시간순 표시. 원본/삭제항목은 비노출
- **Verification**: (BROWSER)
- **Priority**: Must

---

## Traceability Matrix

| REQ ID | Description | Verification | 위치 |
|--------|-------------|-------------|------|
| REQ-001 | students 테이블 생성 | (TEST) | `supabase/migrations/...create_students.sql` |
| REQ-002 | student_coach_assignments 생성 | (TEST) | `supabase/migrations/...create_assignments.sql` |
| REQ-003 | diagnostic_test_results student_id 추가 | (TEST) | `supabase/migrations/...add_student_id.sql` |
| REQ-004 | 학생 카드 생성 폼 | (BROWSER) | `src/app/admin/crm/components/StudentCreateModal.tsx` |
| REQ-005 | 학생 카드 상세 뷰 | (BROWSER) | `src/app/admin/crm/components/StudentDetailPanel.tsx` |
| REQ-006 | 학생 카드 편집 | (TEST) | `src/app/api/crm/students/route.ts` |
| REQ-007 | 세일즈 칸반 렌더링 | (BROWSER) | `src/app/admin/crm/page.tsx` |
| REQ-008 | 드래그 앤 드롭 | (BROWSER) | `src/app/admin/crm/components/SalesKanban.tsx` |
| REQ-009 | 이탈 처리 | (BROWSER) | `src/app/admin/crm/components/ChurnModal.tsx` |
| REQ-010 | Realtime 동기화 | (MANUAL) | `src/hooks/useCrmRealtime.ts` |
| REQ-011 | 상담 메모 입력 | (BROWSER) | `src/app/admin/crm/components/ConsultationTimeline.tsx` |
| REQ-012 | AI 케어 메시지 변환 | (BROWSER) | `src/app/api/crm/ai-care/route.ts` |
| REQ-013 | AI 결과 검토 & 승인 | (BROWSER) | `src/app/admin/crm/components/AiCareReview.tsx` |
| REQ-014 | 매칭 칸반 렌더링 | (BROWSER) | `src/app/admin/crm/components/MatchingKanban.tsx` |
| REQ-015 | 코치 선택 & 오퍼 발송 | (BROWSER) | `src/app/admin/crm/components/CoachOfferModal.tsx` |
| REQ-016 | 먼저 수락 자동 확정 | (TEST) | `src/app/api/offer/[id]/route.ts` |
| REQ-017 | 오퍼 뷰 공개 페이지 | (BROWSER) | `src/app/offer/[assignmentId]/page.tsx` |
| REQ-018 | 오퍼 뷰 학생 정보 노출 | (BROWSER) | `src/app/offer/[assignmentId]/page.tsx` |
| REQ-019 | 코치 타임존 & 스케줄 캘린더 | (BROWSER) | `src/app/offer/[assignmentId]/components/ScheduleCalendar.tsx` |
| REQ-020 | 수락/거절/고민 응답 | (BROWSER) | `src/app/offer/[assignmentId]/components/ResponseButtons.tsx` |
| REQ-021 | 학부모 패스코드 인증 | (BROWSER) | `src/app/mypage/[studentId]/page.tsx` |
| REQ-022 | 학부모 상태 표시 | (BROWSER) | `src/app/mypage/[studentId]/components/StatusBadge.tsx` |
| REQ-023 | 학부모 스케줄 입력 | (BROWSER) | `src/app/mypage/[studentId]/components/ScheduleInput.tsx` |
| REQ-024 | 상담 타임라인 표시 | (BROWSER) | `src/app/mypage/[studentId]/components/Timeline.tsx` |

---

## Implementation Steps

### Step 1: DB Migration
- 파일: `supabase/migrations/20260521_001_create_students.sql`
- 파일: `supabase/migrations/20260521_002_create_student_coach_assignments.sql`
- 파일: `supabase/migrations/20260521_003_add_student_id_to_diagnostic_results.sql`
- 의존: 없음
- Satisfies: REQ-001, REQ-002, REQ-003
- 복잡도: Low

### Step 2: CRM API Routes
- `src/app/api/crm/students/route.ts` — GET(목록/필터)/POST(생성)/PATCH(수정)
- `src/app/api/crm/students/[id]/route.ts` — GET(상세)/DELETE
- `src/app/api/crm/students/[id]/memo/route.ts` — POST(메모 추가)
- `src/app/api/crm/ai-care/route.ts` — POST(Claude API 변환)
- `src/app/api/crm/assignments/route.ts` — POST(오퍼 발송)
- `src/app/api/offer/[assignmentId]/route.ts` — GET(오퍼 조회)/POST(응답)
- `src/app/api/mypage/[studentId]/route.ts` — GET/POST(패스코드 설정)
- 의존: Step 1
- Satisfies: REQ-006, REQ-012, REQ-015, REQ-016
- 복잡도: High

### Step 3: Admin CRM 페이지 — 세일즈 칸반
- `src/app/admin/crm/page.tsx` — 칸반 레이아웃
- `src/app/admin/crm/components/SalesKanban.tsx` — 11컬럼 칸반
- `src/app/admin/crm/components/StudentCard.tsx` — 카드 컴포넌트
- `src/app/admin/crm/components/StudentCreateModal.tsx`
- `src/app/admin/crm/components/ChurnModal.tsx`
- `src/hooks/useCrmRealtime.ts` — Supabase Realtime 구독
- 의존: Step 2
- Satisfies: REQ-004, REQ-007, REQ-008, REQ-009, REQ-010
- 복잡도: High

### Step 4: 학생 카드 상세 & 메모 패널
- `src/app/admin/crm/components/StudentDetailPanel.tsx`
- `src/app/admin/crm/components/ConsultationTimeline.tsx`
- `src/app/admin/crm/components/AiCareReview.tsx`
- 의존: Step 2, Step 3
- Satisfies: REQ-005, REQ-006, REQ-011, REQ-012, REQ-013
- 복잡도: Medium

### Step 5: 코치 매칭 칸반 보드 B
- `src/app/admin/crm/components/MatchingKanban.tsx`
- `src/app/admin/crm/components/CoachOfferModal.tsx`
- Admin 레이아웃 탭 추가 (세일즈 / 매칭)
- 의존: Step 2, Step 3
- Satisfies: REQ-014, REQ-015
- 복잡도: Medium

### Step 6: 코치 오퍼 뷰
- `src/app/offer/[assignmentId]/page.tsx`
- `src/app/offer/[assignmentId]/components/ScheduleCalendar.tsx`
- `src/app/offer/[assignmentId]/components/ResponseButtons.tsx`
- 의존: Step 2
- Satisfies: REQ-016, REQ-017, REQ-018, REQ-019, REQ-020
- 복잡도: Medium

### Step 7: 학부모 마이페이지
- `src/app/mypage/[studentId]/page.tsx`
- `src/app/mypage/[studentId]/components/PasscodeGate.tsx`
- `src/app/mypage/[studentId]/components/StatusBadge.tsx`
- `src/app/mypage/[studentId]/components/ScheduleInput.tsx`
- `src/app/mypage/[studentId]/components/Timeline.tsx`
- 의존: Step 2
- Satisfies: REQ-021, REQ-022, REQ-023, REQ-024
- 복잡도: Medium

### Step 8: Admin 레이아웃 CRM 링크 추가
- `src/app/admin/layout.tsx` — NAV_ITEMS에 CRM 항목 추가
- 의존: Step 3
- Satisfies: —
- 복잡도: Low

---

## Testing Strategy

**Unit/Integration Tests**:
- REQ-001~003 → migration SQL 검증 + Supabase insert/select
- REQ-006 → `src/app/api/crm/students/__tests__/route.test.ts`
- REQ-016 → `src/app/api/offer/__tests__/accept.test.ts` (race condition 시나리오 포함)

**Browser/E2E**:
- REQ-007~009 → 칸반 드래그, 이탈 처리 UI
- REQ-017~020 → 코치 오퍼 뷰 전체 플로우
- REQ-021~024 → 학부모 마이페이지 패스코드 → 스케줄 → 타임라인

---

## Risks & Considerations

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 코치 오퍼 동시 수락 race condition | 중복 확정 | DB 트랜잭션 + unique constraint (student_id, is_confirmed=true) |
| 패스코드 평문 저장 | 보안 취약 | bcrypt 12 rounds, `passcode_hash`에만 저장 |
| 타임존 DST 엣지케이스 | 시간 오류 | `date-fns-tz` 사용, UTC 저장 원칙 |
| AI 변환 지연 (Claude API) | UX 저하 | 로딩 스피너 + 스트리밍 응답 |
| Realtime 연결 끊김 | 데이터 불일치 | Supabase Realtime reconnection 자동 처리 |
| 드래그앤드롭 라이브러리 | 번들 크기 | `@dnd-kit/core` (가벼운 옵션) 사용 |

---

## 구현 순서 요약

```
Step 1 (DB)  →  Step 2 (API)  →  Step 3 (칸반A)
                              →  Step 4 (카드 상세)
                              →  Step 5 (칸반B)
                              →  Step 6 (코치 오퍼 뷰)
                              →  Step 7 (학부모 마이페이지)
                              →  Step 8 (Admin 메뉴)
```

Step 2 완료 후 Step 3~7은 병렬 진행 가능.
