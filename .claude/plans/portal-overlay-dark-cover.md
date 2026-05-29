# Portal Overlay Dark Cover 통일

## Overview

학생 기본 정보(StudentInfoOverlay)와 상담 기록(ConsultationOverlay) 상단에
DiagnosticOverlay의 ReportCover와 동일한 다크 커버 패턴을 적용한다.
세 오버레이가 동일한 검은색 배경 + radial-gradient 패턴 + 핵심 정보 카드 구조를 공유하게 된다.

## Requirements

### REQ-001: StudentInfoOverlay 다크 커버 추가
- **Priority**: Must
- **Description**: `#09090b` 배경 + `radial-gradient(circle at 20% 50%, #6085FF ...) / opacity-5` 패턴을 상단에 추가. 목표 점수 카드 + 직전 점수 카드를 PortalHome과 동일한 형태로 표시.
- **Acceptance Criteria**: 페이지 열면 검은 배경 위에 목표 점수(파란 카드)와 직전 점수(회색 카드)가 보임. 아래 라이트 섹션에 학년/희망 과목/목표 시험일/수업 언어 InfoRow 유지.
- **Verification**: (BROWSER) StudentInfoOverlay 열어서 다크 커버 확인

### REQ-002: ConsultationOverlay 다크 커버 추가
- **Priority**: Must
- **Description**: 동일한 다크 배경 패턴 적용. 큰 숫자로 "총 N회" 표시. 학생 이름 + 상담 횟수를 hero 영역에 배치.
- **Acceptance Criteria**: 페이지 열면 검은 배경 위에 "총 N회" 숫자(파란 카드)가 보임. 아래 기존 MemoItem 아코디언 목록 유지.
- **Verification**: (BROWSER) ConsultationOverlay 열어서 다크 커버 확인

### REQ-003: 상단 바 패턴 통일
- **Priority**: Must
- **Description**: StudentInfoOverlay와 ConsultationOverlay의 fixed top bar를 DiagnosticOverlay의 sticky top nav와 동일한 스타일(height 12, bg-white, borderBottom #E2E8F0)로 맞춤. 이미 동일하므로 확인만.
- **Acceptance Criteria**: 세 오버레이 모두 상단 바 높이·색상·back 버튼 텍스트 스타일이 동일.
- **Verification**: (BROWSER) 세 오버레이 상단 바 비교

## Technical Design

### Architecture

변경 파일:
- `src/app/portal/[token]/components/StudentInfoOverlay.tsx`
- `src/app/portal/[token]/components/ConsultationOverlay.tsx`

다크 커버 공통 상수 (두 파일에 인라인으로 복사):
```
BG = '#09090b'
ACCENT = '#6085FF'
gradient = 'radial-gradient(circle at 20% 50%, #6085FF 0%, transparent 50%), radial-gradient(circle at 80% 20%, #071be9 0%, transparent 40%)'
```

StudentInfoOverlay 레이아웃:
```
[fixed top bar — ← 상담 관리 리포트]
[dark cover — pt-12]
  accent line + "학생 기본 정보"
  {student.name} 학생 (H1)
  {grade} (subtitle)
  [목표 점수 카드] [직전 점수 카드]  ← PortalHome 카드 구조 동일
[light section — #F4F5F9]
  InfoRow 목록 (학년/희망 과목/직전 점수/목표 점수/목표 시험일/수업 언어)
```

ConsultationOverlay 레이아웃:
```
[fixed top bar — ← 상담 관리 리포트]
[dark cover — pt-12]
  accent line + "상담 기록"
  {studentName} 학생 (H1)
  [총 N회 카드 — 파란 스타일]
[light section — #F4F5F9]
  MemoItem 아코디언 목록
```

### Dependencies
없음. 기존 인라인 스타일 상수만 복사.

## Traceability Matrix

| REQ ID  | Description | Verification | Status |
|---------|-------------|--------------|--------|
| REQ-001 | StudentInfoOverlay 다크 커버 | (BROWSER) | Pending |
| REQ-002 | ConsultationOverlay 다크 커버 | (BROWSER) | Pending |
| REQ-003 | 상단 바 통일 확인 | (BROWSER) | Pending |
