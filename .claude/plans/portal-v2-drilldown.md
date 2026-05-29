# Portal V2 — 3-Card Drilldown 구조

## Overview

학부모 포털 인증 후 화면을 카드 3개 메인 + 오버레이 드릴다운 구조로 개편한다.
현재: 단일 스크롤 페이지 (학생 정보 → 진단 → 상담 기록)
목표: 메인 3개 카드(미리보기 포함) → 각 카드 탭 시 전체 화면 오버레이 전환

## Requirements

### REQ-001: 메인 카드 3개 렌더링
- **Priority**: Must
- **Description**: 인증 후 메인 화면에 학생 기본 정보 / 진단 테스트 / 상담 기록 카드를 표시. 각 카드에 핵심 미리보기 정보 포함.
- **Acceptance Criteria**:
  - 학생 정보 카드: 학년 + 목표 점수 표시
  - 진단 테스트 카드: 문항 수(또는 정답률) + 제출일 표시. 진단 결과 없으면 "미완료" 표시
  - 상담 기록 카드: 총 상담 횟수 + 가장 최근 날짜 표시. 기록 없으면 "기록 없음" 표시
- **Verification**: (BROWSER) 포털 로그인 후 메인 화면에서 3개 카드 확인

### REQ-002: 학생 정보 오버레이
- **Priority**: Must
- **Description**: 학생 기본 정보 카드 탭 → 전체 화면 오버레이로 상세 정보 표시
- **Acceptance Criteria**:
  - `fixed inset-0 z-50` 오버레이, 다크 배경
  - 상단 "← 상담 리포트" 뒤로 버튼
  - 학년 / 수강과목 / 현재점수 / 목표점수 / 목표시험일 표시
- **Verification**: (BROWSER) 학생 정보 카드 탭 → 오버레이 열림 → 뒤로 버튼 → 메인 복귀

### REQ-003: 진단 테스트 오버레이 (풀 리포트 임베드)
- **Priority**: Must
- **Description**: 진단 테스트 카드 탭 → 전체 화면 오버레이에서 기존 리포트 컴포넌트 그대로 렌더링
- **Acceptance Criteria**:
  - 오버레이 상단에 "← 상담 리포트" 뒤로 버튼
  - 기존 ChapterNav(전체성적/비교성적/풀이패턴/단어상태) 재활용
  - 포털 API에서 resultId 받아와 리포트 데이터 fetch
  - 진단 미완료 시 카드에서 탭 비활성화
- **Verification**: (BROWSER) 진단 카드 탭 → 리포트 오버레이 → ChapterNav 탭 전환 확인

### REQ-004: 상담 기록 오버레이
- **Priority**: Must
- **Description**: 상담 기록 카드 탭 → 전체 화면 오버레이에 날짜별 아코디언 목록
- **Acceptance Criteria**:
  - 날짜 헤더 탭 시 해당 메모 펼침/접힘
  - 최신 상담이 맨 위 (현재 정렬 유지)
  - 기록 없으면 빈 상태 안내 메시지
- **Verification**: (BROWSER) 상담 기록 카드 탭 → 오버레이 → 날짜 탭 → 아코디언 동작 확인

### REQ-005: 포털 리포트 데이터 API
- **Priority**: Must
- **Description**: `/api/portal/[token]/report` GET — 세션 쿠키 검증 후 풀 리포트 데이터 반환
- **Acceptance Criteria**:
  - 세션 없으면 401
  - `fetchReportData(resultId)` 호출 결과 그대로 반환
  - 진단 미연결 시 404
- **Verification**: (BROWSER) curl 또는 브라우저에서 API 직접 확인

### REQ-006: 오버레이 전환 애니메이션
- **Priority**: Should
- **Description**: 카드 탭 → 오버레이가 오른쪽에서 슬라이드인. 뒤로 버튼 → 왼쪽으로 슬라이드아웃.
- **Acceptance Criteria**: CSS transition `translateX` 200ms ease
- **Verification**: (BROWSER) 전환 시 슬라이드 애니메이션 확인

## Technical Design

### Architecture

```
PortalContent.tsx (orchestrator)
├── PortalHome.tsx          — 메인 3개 카드 화면
├── StudentInfoOverlay.tsx  — 학생 정보 전체 화면
├── DiagnosticOverlay.tsx   — 진단 리포트 전체 화면
│   ├── (재사용) ChapterNav — 기존 컴포넌트
│   ├── (재사용) ReportExecutiveSummary
│   ├── (재사용) ReportBenchmarkChart
│   ├── (재사용) ReportRadarChart
│   ├── (재사용) ReportBehavioralMatrix
│   └── (재사용) ReportVocabularyGap
└── ConsultationOverlay.tsx — 상담 기록 전체 화면
```

### 상태 관리 (PortalContent)
```ts
type View = 'home' | 'student' | 'diagnostic' | 'consultation';
const [view, setView] = useState<View>('home');
```

### 신규 API
`GET /api/portal/[token]/report`
- 포털 세션 쿠키 검증
- students 테이블에서 diagnostic_result_id 조회
- fetchReportData(resultId) 반환

### Dependencies
- 기존: `fetchReportData` from `@/lib/report-data`
- 기존: Report 컴포넌트들 (`ReportExecutiveSummary` 등)
- 기존: `generateAllInsights`, `mergeInsights`

## Traceability Matrix

| REQ ID  | Description               | Verification | Status  |
|---------|---------------------------|--------------|---------|
| REQ-001 | 메인 카드 3개 미리보기    | (BROWSER)    | Pending |
| REQ-002 | 학생 정보 오버레이        | (BROWSER)    | Pending |
| REQ-003 | 진단 테스트 오버레이      | (BROWSER)    | Pending |
| REQ-004 | 상담 기록 오버레이        | (BROWSER)    | Pending |
| REQ-005 | 포털 리포트 API           | (BROWSER)    | Pending |
| REQ-006 | 슬라이드 애니메이션       | (BROWSER)    | Pending |

## Implementation Order

1. REQ-005 — API 먼저 (나머지 컴포넌트가 의존)
2. REQ-001 — PortalHome 카드 UI
3. REQ-002 — StudentInfoOverlay
4. REQ-003 — DiagnosticOverlay (가장 복잡)
5. REQ-004 — ConsultationOverlay
6. REQ-006 — 애니메이션 (마지막에 덧씌우기)

## Out of Scope

- 상담 기록 내 개별 날짜 URL 공유
- 리포트 프린트 기능 (기존 report 페이지에서 유지)
- 비밀번호 변경 메뉴 위치 변경
