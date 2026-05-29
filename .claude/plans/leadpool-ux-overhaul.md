# Lead Pool UX Overhaul Spec

## Goal
리드풀(이탈 학생 관리) 탭에서 비즈니스 로직 단절을 해소한다.

## REQs

### REQ-1 (BROWSER) — 카드 클릭 → StudentDetailPanel
- `StudentPoolCard` 카드 본체 클릭 시 `onStudentClick(student)` 호출
- `LeadPoolProps`에 `onStudentClick: (student: Student) => void` 추가
- `page.tsx`에서 `handleStudentClick`을 LeadPool에 전달 → 기존 `selectedStudent` 상태 재사용
- "연락 기록" 버튼은 제거 (카드 클릭으로 통합, 패널에서 메모 가능)

### REQ-2 (TEST) — 벌크 상담 기록 API
- `POST /api/crm/students/bulk-memo`
- Body: `{ student_ids: string[], raw_memo: string }`
- 각 학생의 `consultation_timeline`에 새 항목 append, `last_contacted_at` 갱신
- 응답: `{ data: { updated: number, failed_ids: string[] } }` (부분 실패 시 207)
- Auth: `isAuthenticated` 필수

### REQ-3 (BROWSER) — 벌크 연락 기록 UI
- 선택된 학생이 있을 때 하단 바에 "연락 기록" 버튼 추가 (기존 "재활성화 시작" 옆)
- 클릭 시 `BulkContactModal` 열림 (textarea + 제출)
- 제출 → `POST /api/crm/students/bulk-memo` → `onRefetch()` + 성공 배너

### REQ-4 (BROWSER) — 리드풀 탭: inactive / reactivating 분리
- 리드풀 내부에 `inactive` / `reactivating` 서브탭 추가
- `inactive` 탭: 기존 필터+카드 목록
- `reactivating` 탭: 재활성화 시도 중인 학생 목록 (카드 클릭 → 패널)
- `totalReactivating` 집계는 상단 Summary Card에 이미 있음 → 탭에도 반영

### REQ-5 (TEST) — churnedDaysAgo 수정
- `churnedDaysAgo` 함수: `consultation_timeline` 최신 항목 날짜 → `student.updated_at` 기준으로 변경
- `updated_at`은 lead_status가 변경될 때 갱신됨 (PATCH API에서 자동)

## Out of scope
- 단일 "연락 기록" 버튼 → 패널 통합으로 해결되므로 별도 작업 없음
- M-2 낙관적 업데이트 → onRefetch로 충분

## Files
- NEW: `src/app/api/crm/students/bulk-memo/route.ts`
- NEW: `src/app/admin/crm/components/BulkContactModal.tsx`
- MOD: `src/app/admin/crm/components/LeadPool.tsx`
- MOD: `src/app/admin/crm/page.tsx`
