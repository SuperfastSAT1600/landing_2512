# Portal 랜딩 페이지를 상담 기록으로 변경 + 탑 내비게이션

## Overview

로그인 후 기존 홈(3카드 메뉴)이 아닌 상담 기록 화면이 바로 보이게 한다.
ConsultationOverlay 상단 바에 학생 기본 정보 / 진단 테스트 두 메뉴 버튼을 추가한다.
PortalHome(3카드 메뉴)은 더 이상 사용하지 않는다.

## Requirements

### REQ-001: 로그인 직후 상담 기록 화면 랜딩
- **Priority**: Must
- **Description**: PortalContent의 초기 view 상태를 'consultation'으로 변경. PortalHome은 JSX에서 제거.
- **Acceptance Criteria**: 로그인 완료 시 ConsultationOverlay가 즉시 보인다.
- **Verification**: (BROWSER) 로그인 후 상담 기록 화면 확인

### REQ-002: ConsultationOverlay 탑 바 내비게이션
- **Priority**: Must
- **Description**: 기존 "← 상담 관리 리포트" 백버튼 대신 로고 + [학생 기본 정보] [진단 테스트] 탭 + 설정 버튼으로 교체. 진단 테스트 버튼은 결과가 없으면 비활성.
- **Acceptance Criteria**: 두 버튼이 탑 바에 보이고, 클릭 시 각 오버레이로 이동.
- **Verification**: (BROWSER) 두 버튼 클릭 확인

### REQ-003: StudentInfo / Diagnostic 백버튼 텍스트 변경
- **Priority**: Must
- **Description**: "← 상담 관리 리포트" → "← 상담 기록" (onBack은 'consultation'으로 이동)
- **Acceptance Criteria**: 백버튼 클릭 시 상담 기록 화면으로 복귀.
- **Verification**: (BROWSER) 뒤로가기 동작 확인

## Technical Design

변경 파일:
- `src/app/portal/[token]/components/PortalContent.tsx` — initial view, PortalHome 제거, onBack 대상 변경
- `src/app/portal/[token]/components/ConsultationOverlay.tsx` — props 변경, 탑 바 재설계
- `src/app/portal/[token]/components/StudentInfoOverlay.tsx` — 백버튼 텍스트
- `src/app/portal/[token]/components/DiagnosticOverlay.tsx` — 백버튼 텍스트

ConsultationOverlay 새 Props:
```ts
interface Props {
  memos: PublishedMemo[];
  studentName: string;
  hasDiagnostic: boolean;
  onNavigate: (view: 'student' | 'diagnostic') => void;
  onSettings: () => void;
}
```

## Traceability Matrix

| REQ ID  | Description | Verification | Status |
|---------|-------------|--------------|--------|
| REQ-001 | 상담기록 랜딩 | (BROWSER) | Pending |
| REQ-002 | 탑 바 내비게이션 | (BROWSER) | Pending |
| REQ-003 | 백버튼 텍스트 | (BROWSER) | Pending |
