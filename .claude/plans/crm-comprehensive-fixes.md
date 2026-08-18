# CRM Comprehensive Bug + UX Fix

## Overview
코드 리뷰(❌6 ⚠️8 ℹ️2)와 UX 감사(높음7 중간8 낮음2)에서 발견된 전체 이슈를 일괄 수정.
이미 완료: churned 드롭다운 제거, 기본정보 편집, 퍼널 가이드 추가.

## Fix Groups

### GROUP-A: API 라우트 수정
- A1: reactivation POST — lead_status를 'reactivating'으로 설정 누락
- A2: reactivation PATCH outcome='reactivated' → lead_status='active'+funnel_stage='1' 이어야 함
- A3: PATCH [id] — updated_at을 body에서 제거
- A4: bulk-reactivate — 부분 실패 시 207 + 실패 목록 반환

### GROUP-B: StudentDetailPanel 수정 (이미 리라이트된 파일)
- B1: 이탈 처리 버튼 → ChurnModal 사용하도록 변경 (확인 절차)
- B2: "이탈 확정" 버튼 → window.confirm 추가
- B3: 편집 모드 중 배경 클릭 시 저장 확인
- B4: 메모 저장 실패 피드백
- B5: AI 케어 게시 실패 피드백
- B6: '재활성화 시도 시작' → POST /reactivation 호출하도록 수정
- B7: 퍼널 단계 변경 중 드롭다운 disabled 처리

### GROUP-C: SalesKanban + page.tsx 수정
- C1: ChurnModal.onConfirm에서 onStudentUpdate 제거 (이중 API 방지)
- C2: drag-drop 실패 시 토스트 피드백
- C3: followUpCount를 filteredStudents가 아닌 전체 students 기준으로 계산
- C4: 팔로업 배너 클릭 → 해당 학생 필터링
- C5: selectedStudent 실패 시 rollback

### GROUP-D: LeadPool 수정
- D1: page.tsx에서 전체 students 전달 → LeadPool 내부에서 분리
- D2: 벌크 재활성화 완료 후 onSuccess에서 갱신 처리
- D3: 벌크 완료 건수 토스트 피드백

### GROUP-E: StudentCard 수정
- E1: days === null (신규)은 gray 테두리, days >= 10만 빨간 테두리
- E2: 한쪽 점수만 있어도 표시

### GROUP-F: 기타 컴포넌트
- F1: KanbanFilter — 활성 필터 chip 표시
- F2: page.tsx — 초기 로딩 오류 상태 표시

## Implementation Order
A → B → C → D → E → F (API 먼저, UI는 의존성 순)

## Out of Scope
- 새 학생 생성 후 카드 하이라이트 (낮음)
- ReactivationModal 새 연락 진입점 개선 (별도 이슈)
